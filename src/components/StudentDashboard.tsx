import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Scan, Bell, LogOut, BookOpen, Calendar, CheckCircle, Clock, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import QrScanner from 'qr-scanner';

const StudentDashboard = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
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

    return () => unsubscribe();
  }, []);

  const handleScanQR = async () => {
    try {
      setIsScanning(true);
      
      if (!videoRef.current) return;
      
      // Create QR scanner instance
      const scanner = new QrScanner(
        videoRef.current,
        async (result) => {
          try {
            // Parse QR code data
            const qrData = JSON.parse(result.data);
            
            // Create attendance record
            await addDoc(collection(db, 'attendance'), {
              studentId: user?.id,
              studentName: user?.name,
              studentEmail: user?.email,
              sessionId: qrData.sessionId,
              teacherId: qrData.teacherId,
              teacherName: qrData.teacherName,
              timestamp: new Date(),
              scannedAt: new Date()
            });
            
            toast({
              title: "Attendance Marked!",
              description: "Successfully checked in to class",
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
          <h2 className="text-3xl font-bold mb-2">
            Hello, {user?.name}! 📚
          </h2>
          <p className="text-muted-foreground">
            Ready for today's classes?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 animate-slide-up">
          <Card className="text-center">
            <CardContent className="p-4">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">8</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <CheckCircle className="h-6 w-6 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">92%</p>
              <p className="text-xs text-muted-foreground">Attendance</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary-glow" />
              <p className="text-2xl font-bold">5</p>
              <p className="text-xs text-muted-foreground">Courses</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Action Card */}
        <Card className="shadow-medium animate-scale-in">
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
        <Card className="animate-slide-up">
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
                    className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {notification.type === 'class_cancelled' && (
                        <div className="w-2 h-2 bg-destructive rounded-full animate-glow"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {notification.teacherName || 'Teacher'}
                        </p>
                        <Badge 
                          variant="destructive"
                          className="text-xs"
                        >
                          Cancelled
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNotificationTime(notification.timestamp)}
                      </p>
                    </div>
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

        {/* Recent Classes */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-lg">Recent Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Computer Science 101", time: "9:00 AM", status: "Present" },
                { name: "Mathematics 201", time: "11:00 AM", status: "Present" },
                { name: "Physics Lab", time: "2:00 PM", status: "Absent" }
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <Badge 
                    variant={item.status === "Present" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StudentDashboard;