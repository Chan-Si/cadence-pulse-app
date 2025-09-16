import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, X, BookOpen, Users, Clock, AlertTriangle } from 'lucide-react';
import { collection, getDocs, addDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ClassSession {
  id: string;
  courseName: string;
  courseCode: string;
  time: string;
  date: string;
  room: string;
  status: 'scheduled' | 'cancelled' | 'completed';
}

const ClassManagement = () => {
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [activitySuggestions, setActivitySuggestions] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user) return;

      try {
        const today = new Date();
        const classesQuery = query(
          collection(db, 'classes'),
          where('teacherId', '==', user.id),
          where('date', '>=', today.toISOString().split('T')[0])
        );

        const classesSnapshot = await getDocs(classesQuery);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ClassSession[];

        setClasses(classesData.filter(cls => cls.status !== 'completed'));
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    fetchClasses();
  }, [user]);

  const handleCancelClass = async () => {
    if (!selectedClass || !activitySuggestions.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a class and provide activity suggestions",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const classToCancel = classes.find(cls => cls.id === selectedClass);
      if (!classToCancel) return;

      // Update class status
      await updateDoc(doc(db, 'classes', selectedClass), {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: user?.id
      });

      // Save curricular suggestions
      await addDoc(collection(db, 'curricular_suggestions'), {
        classId: selectedClass,
        courseName: classToCancel.courseName,
        courseCode: classToCancel.courseCode,
        suggestions: activitySuggestions,
        teacherId: user?.id,
        teacherName: user?.name,
        createdAt: new Date()
      });

      // Create notification for students
      await addDoc(collection(db, 'notifications'), {
        type: 'class_cancelled',
        message: `${classToCancel.courseName} class scheduled for ${classToCancel.time} on ${classToCancel.date} has been cancelled`,
        classId: selectedClass,
        courseName: classToCancel.courseName,
        activitySuggestions: activitySuggestions,
        teacherId: user?.id,
        teacherName: user?.name,
        timestamp: new Date(),
        read: false
      });

      toast({
        title: "Class cancelled successfully",
        description: "Students have been notified with activity suggestions",
      });

      // Reset form
      setSelectedClass('');
      setActivitySuggestions('');
      setShowForm(false);
      
      // Refresh classes list
      setClasses(prev => prev.map(cls => 
        cls.id === selectedClass ? { ...cls, status: 'cancelled' as const } : cls
      ).filter(cls => cls.status !== 'cancelled'));

    } catch (error) {
      console.error('Error cancelling class:', error);
      toast({
        title: "Error",
        description: "Failed to cancel class",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const upcomingClasses = classes.filter(cls => cls.status === 'scheduled');

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{upcomingClasses.length}</p>
            <p className="text-sm text-muted-foreground">Upcoming Classes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold">{classes.filter(cls => cls.status === 'cancelled').length}</p>
            <p className="text-sm text-muted-foreground">Cancelled Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary-glow" />
            <p className="text-2xl font-bold">{new Set(classes.map(cls => cls.courseName)).size}</p>
            <p className="text-sm text-muted-foreground">Active Courses</p>
          </CardContent>
        </Card>
      </div>

      {/* Cancel Class Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span>Cancel a Class</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showForm ? (
            <div className="text-center py-6">
              <Button 
                onClick={() => setShowForm(true)}
                variant="destructive"
                disabled={upcomingClasses.length === 0}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel a Class
              </Button>
              {upcomingClasses.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2">No upcoming classes to cancel</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="class-select">Select Class to Cancel</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class..." />
                  </SelectTrigger>
                  <SelectContent>
                    {upcomingClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{cls.courseName}</span>
                          <div className="flex items-center space-x-2 ml-4">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">{cls.time} - {cls.date}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activity-suggestions">Activity Suggestions for Students</Label>
                <Textarea
                  id="activity-suggestions"
                  placeholder="Provide alternative learning activities, reading assignments, or exercises for students to complete during the cancelled class period..."
                  value={activitySuggestions}
                  onChange={(e) => setActivitySuggestions(e.target.value)}
                  className="min-h-32"
                />
                <p className="text-xs text-muted-foreground">
                  These suggestions will be sent to all students enrolled in the selected class.
                </p>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={handleCancelClass}
                  variant="destructive"
                  disabled={loading || !selectedClass || !activitySuggestions.trim()}
                >
                  {loading ? "Cancelling..." : "Cancel Class & Notify Students"}
                </Button>
                <Button
                  onClick={() => {
                    setShowForm(false);
                    setSelectedClass('');
                    setActivitySuggestions('');
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Classes List */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Classes</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingClasses.length > 0 ? (
            <div className="space-y-3">
              {upcomingClasses.map((cls) => (
                <div 
                  key={cls.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium">{cls.courseName}</h4>
                      <Badge variant="outline">{cls.courseCode}</Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>{cls.date}</span>
                      <span>{cls.time}</span>
                      <span>{cls.room}</span>
                    </div>
                  </div>
                  <Badge variant="default">Scheduled</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming classes</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassManagement;