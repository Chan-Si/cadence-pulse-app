import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Users, Clock } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  name: string;
  code: string;
  instructor: string;
  schedule: string;
  credits: number;
}

interface CourseSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CourseSelectionModal = ({ isOpen, onClose }: CourseSelectionModalProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const coursesData = coursesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Course[];
        setCourses(coursesData);
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };

    if (isOpen) {
      fetchCourses();
    }
  }, [isOpen]);

  const handleCourseToggle = (courseId: string) => {
    setSelectedCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSave = async () => {
    if (selectedCourses.length === 0) {
      toast({
        title: "No courses selected",
        description: "Please select at least one course",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (user) {
        await updateDoc(doc(db, 'users', user.id), {
          enrolledCourses: selectedCourses,
          courseSelectionCompleted: true
        });

        toast({
          title: "Courses saved!",
          description: `Successfully enrolled in ${selectedCourses.length} courses`,
        });
        onClose();
      }
    } catch (error) {
      console.error('Error saving courses:', error);
      toast({
        title: "Error",
        description: "Failed to save course selection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>Select Your Enrolled Courses</span>
          </DialogTitle>
          <DialogDescription>
            Choose the courses you're currently enrolled in. This will help us personalize your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={selectedCourses.includes(course.id)}
                    onCheckedChange={() => handleCourseToggle(course.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{course.name}</h3>
                      <span className="text-sm text-muted-foreground font-mono">{course.code}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{course.instructor}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{course.schedule}</span>
                      </div>
                      <span>{course.credits} credits</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || selectedCourses.length === 0}
          >
            {loading ? "Saving..." : "Save Selection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CourseSelectionModal;