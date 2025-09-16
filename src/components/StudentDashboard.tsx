import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scan, Bell, LogOut, BookOpen, Calendar, CheckCircle, Clock, Camera, X, GraduationCap, TrendingUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, getDoc, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import QrScanner from 'qr-scanner';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import { CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import CourseSelectionModal from './CourseSelectionModal';
import TodaysSchedule from './TodaysSchedule';

const StudentDashboard = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [userCourses, setUserCourses] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any>({});
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
    const checkCourseSelection = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.id));
        const userData = userDoc.data();
        
        if (!userData?.courseSelectionCompleted) {
          setShowCourseModal(true);
        } else {
          // Fetch user's enrolled courses
          const coursesSnapshot = await getDocs(collection(db, 'courses'));
          const allCourses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
          const enrolledCourses = allCourses.filter((course: any) => userData.enrolledCourses?.includes(course.id));
          setUserCourses(enrolledCourses);
          
          // Fetch attendance statistics
          const attendanceQuery = query(
            collection(db, 'attendance'),
            where('studentId', '==', user.id)
          );
          const attendanceSnapshot = await getDocs(attendanceQuery);
          const attendanceData = attendanceSnapshot.docs.map(doc => doc.data());
          
          // Calculate stats by course
          const stats: any = {};
          enrolledCourses.forEach((course: any) => {
            const courseAttendance = attendanceData.filter((att: any) => att.courseName === course.name);
            stats[course.id] = {
              attended: courseAttendance.length,
              total: 20, // Assume 20 total classes per course
              percentage: Math.round((courseAttendance.length / 20) * 100)
            };
          });
          setAttendanceStats(stats);
        }
      } catch (error) {
        console.error('Error checking course selection:', error);
      }
    };

    // Listen for notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(newNotifications);
    });

    checkCourseSelection();
    return () => unsubscribe();
  }, [user]);

  const handleScanQR = async () => {
    try {
      setIsScanning(true);

      // Check if running on mobile device
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor Camera for native mobile
        const image = await CapacitorCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera
        });

        // Process the image with QR scanner
        try {
          const result = await QrScanner.scanImage(image.dataUrl!);
          const qrData = JSON.parse(result);
          
          // Create attendance record with dynamic data
          const selectedCourse = userCourses.find(course => course.id === qrData.courseId);
          await addDoc(collection(db, 'attendance'), {
            studentId: user?.id,
            studentName: user?.name,
            studentEmail: user?.email,
            sessionId: qrData.sessionId,
            courseId: qrData.courseId,
            courseName: selectedCourse?.name || qrData.courseName,
            teacherId: qrData.teacherId,
            teacherName: qrData.teacherName,
            timestamp: new Date(),
            scannedAt: new Date(),
            date: new Date().toISOString().split('T')[0]
          });
          
          toast({
            title: "Attendance Marked!",
            description: `Successfully checked in to ${selectedCourse?.name || 'class'}`,
          });
        } catch (scanError) {
          toast({
            title: "Invalid QR Code",
            description: "This QR code is not valid for attendance",
            variant: "destructive",
          });
        }
        setIsScanning(false);
      } else {
        // Use web camera for browser
        if (!videoRef.current) return;
        
        const scanner = new QrScanner(
          videoRef.current,
          async (result) => {
            try {
              const qrData = JSON.parse(result.data);
              const selectedCourse = userCourses.find(course => course.id === qrData.courseId);
              
              await addDoc(collection(db, 'attendance'), {
                studentId: user?.id,
                studentName: user?.name,
                studentEmail: user?.email,
                sessionId: qrData.sessionId,
                courseId: qrData.courseId,
                courseName: selectedCourse?.name || qrData.courseName,
                teacherId: qrData.teacherId,
                teacherName: qrData.teacherName,
                timestamp: new Date(),
                scannedAt: new Date(),
                date: new Date().toISOString().split('T')[0]
              });
              
              toast({
                title: "Attendance Marked!",
                description: `Successfully checked in to ${selectedCourse?.name || 'class'}`,
              });
              
              stopScanning();
            } catch (error) {
              console.error('Error processing QR code:', error);
              toast({
                title: "Invalid QR Code", 
                description: "This QR code is not valid for attendance",
                variant: "destructive",
              });
            }
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );
        
        scannerRef.current = scanner;
        await scanner.start();
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast({
      title: "Logged out",
      description: "See you next time!",
    });
  };

  const formatNotificationTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b shadow-soft sticky top-0 z-10">
        <div className="mobile-container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Cadence</h1>
                <p className="text-sm text-muted-foreground">Student Portal</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mobile-container py-6 space-y-6">
        {/* Welcome Section */}
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-glow">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-2">
            Hello, {user?.name}!
          </h2>
          <p className="text-muted-foreground">
            Ready for today's classes?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 animate-slide-up">
          <Card className="text-center bg-white/60 backdrop-blur-sm border-white/20 shadow-soft">
            <CardContent className="p-4">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{userCourses.length}</p>
              <p className="text-xs text-muted-foreground">Enrolled</p>
            </CardContent>
          </Card>
          <Card className="text-center bg-white/60 backdrop-blur-sm border-white/20 shadow-soft">
            <CardContent className="p-4">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">
                {userCourses.length > 0 
                  ? Math.round((Object.values(attendanceStats) as any[]).reduce((acc: number, stat: any) => acc + (stat?.percentage || 0), 0) / userCourses.length) || 0
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Attendance</p>
            </CardContent>
          </Card>
          <Card className="text-center bg-white/60 backdrop-blur-sm border-white/20 shadow-soft">
            <CardContent className="p-4">
              <Users className="h-6 w-6 mx-auto mb-2 text-primary-glow" />
              <p className="text-2xl font-bold">
                {(Object.values(attendanceStats) as any[]).reduce((acc: number, stat: any) => acc + (stat?.attended || 0), 0)}
              </p>
              <p className="text-xs text-muted-foreground">Classes Attended</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Action Card */}
        <Card className="shadow-medium animate-scale-in bg-white/70 backdrop-blur-md border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Scan className="h-6 w-6 text-primary" />
              <span>Attendance Check-in</span>
            </CardTitle>
            <CardDescription>
              Scan your teacher's QR code to mark your attendance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Scanner Area */}
            <div className="aspect-square max-w-80 mx-auto bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
              {isScanning ? (
                <div className="relative w-full h-full">
                  <video 
                    ref={videoRef}
                    className="w-full h-full object-cover rounded-lg"
                    playsInline
                    muted
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={stopScanning}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Camera className="h-20 w-20 text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Point camera at QR code</p>
                </div>
              )}
            </div>

            {/* Scan Button */}
            {!isScanning && (
              <Button
                variant="hero"
                size="xl"
                className="w-full"
                onClick={handleScanQR}
              >
                <Scan className="h-5 w-5" />
                Scan QR for Attendance
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card className="animate-slide-up bg-white/60 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-primary" />
              <span>Notifications</span>
            </CardTitle>
            <CardDescription>Stay updated with your classes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className="flex flex-col space-y-2 p-4 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30 hover:bg-white/60 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                        <p className="text-sm font-medium">
                          {notification.teacherName || 'Teacher'}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        Class Cancelled
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    
                    {notification.activitySuggestions && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                          📚 Suggested Activities:
                        </h4>
                        <p className="text-sm text-blue-800">
                          {notification.activitySuggestions}
                        </p>
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {formatNotificationTime(notification.timestamp)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Courses */}
        <Card className="animate-slide-up bg-white/60 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-lg">My Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userCourses.length > 0 ? (
                userCourses.map((course) => {
                  const stats = attendanceStats[course.id] || { percentage: 0, attended: 0, total: 0 };
                  return (
                    <div key={course.id} className="flex items-center justify-between p-3 rounded-lg bg-white/50 backdrop-blur-sm border border-white/30">
                      <div>
                        <p className="text-sm font-medium">{course.name}</p>
                        <p className="text-xs text-muted-foreground">{course.code} • {course.instructor}</p>
                        <p className="text-xs text-muted-foreground">{stats.attended}/{stats.total} classes attended</p>
                      </div>
                      <Badge 
                        variant={stats.percentage >= 75 ? "default" : stats.percentage >= 60 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {stats.percentage}%
                      </Badge>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No courses enrolled</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => setShowCourseModal(true)}
                  >
                    Select Courses
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <TodaysSchedule />
      </main>
      
      {/* Course Selection Modal */}
      <CourseSelectionModal 
        isOpen={showCourseModal} 
        onClose={() => setShowCourseModal(false)} 
      />
    </div>
  );
};

export default StudentDashboard;