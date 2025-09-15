import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Play, Square, LogOut, Users, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import QRCode from 'qrcode';

const TeacherDashboard = () => {
  const [isClassActive, setIsClassActive] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStartAttendance = async () => {
    try {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const qrData = {
        sessionId: newSessionId,
        timestamp: new Date().toISOString(),
        teacherId: user?.id,
        teacherName: user?.name
      };
      
      const qrDataString = JSON.stringify(qrData);
      const qrUrl = await QRCode.toDataURL(qrDataString, {
        width: 400,
        margin: 2,
        color: {
          dark: '#6366F1',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeUrl(qrUrl);
      setSessionId(newSessionId);
      setIsClassActive(true);
      
      toast({
        title: "Attendance Started",
        description: "QR code generated for student attendance",
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to start attendance session",
        variant: "destructive",
      });
    }
  };

  const handleCancelClass = async () => {
    try {
      // Create notification for class cancellation
      await addDoc(collection(db, 'notifications'), {
        type: 'class_cancelled',
        message: `Class cancelled by ${user?.name}`,
        sessionId: sessionId,
        timestamp: new Date(),
        teacherId: user?.id,
        teacherName: user?.name
      });

      setIsClassActive(false);
      setQrCodeUrl('');
      setSessionId('');
      
      toast({
        title: "Class Cancelled",
        description: "Notification sent to students",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error cancelling class:', error);
      toast({
        title: "Error",
        description: "Failed to cancel class",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast({
      title: "Logged out",
      description: "See you next time!",
    });
  };

  return (
    <div className="min-h-screen gradient-subtle">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b shadow-soft sticky top-0 z-10">
        <div className="mobile-container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Cadence</h1>
                <p className="text-sm text-muted-foreground">Teacher Portal</p>
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
            Welcome back, {user?.name}! 👋
          </h2>
          <p className="text-muted-foreground">
            Ready to take attendance for your class?
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 animate-slide-up">
          <Card className="text-center">
            <CardContent className="p-4">
              <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">12</p>
              <p className="text-xs text-muted-foreground">Classes</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Users className="h-6 w-6 mx-auto mb-2 text-accent" />
              <p className="text-2xl font-bold">156</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary-glow" />
              <p className="text-2xl font-bold">94%</p>
              <p className="text-xs text-muted-foreground">Avg Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Action Card */}
        <Card className="shadow-medium animate-scale-in">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <QrCode className="h-6 w-6 text-primary" />
              <span>Attendance Session</span>
            </CardTitle>
            <CardDescription>
              {isClassActive 
                ? "Your class is live! Students can scan the QR code below." 
                : "Start a new attendance session for your class."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code Area */}
            <div className="aspect-square max-w-64 mx-auto bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
              {isClassActive && qrCodeUrl ? (
                <div className="text-center animate-glow">
                  <div className="w-48 h-48 bg-white rounded-lg shadow-medium flex items-center justify-center mb-4 overflow-hidden">
                    <img 
                      src={qrCodeUrl} 
                      alt="Attendance QR Code" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-sm font-medium">Session Active</p>
                  <p className="text-xs text-muted-foreground">Students can scan now</p>
                </div>
              ) : (
                <div className="text-center">
                  <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">QR code will appear here</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {!isClassActive ? (
                <Button
                  variant="hero"
                  size="xl"
                  className="w-full"
                  onClick={handleStartAttendance}
                >
                  <Play className="h-5 w-5" />
                  Start Attendance
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  size="xl"
                  className="w-full"
                  onClick={handleCancelClass}
                >
                  <Square className="h-5 w-5" />
                  Cancel Class
                </Button>
              )}
            </div>

            {isClassActive && (
              <div className="text-center text-sm text-muted-foreground animate-fade-in">
                <p>Session started at {new Date().toLocaleTimeString()}</p>
                <p>Students have 15 minutes to check in</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="animate-slide-up">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center space-x-3 p-2 rounded-lg bg-muted/50">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Computer Science 101</p>
                    <p className="text-xs text-muted-foreground">85% attendance • 2 hours ago</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TeacherDashboard;