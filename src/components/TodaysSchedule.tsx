import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface ScheduleItem {
  id: string;
  courseName: string;
  courseCode: string;
  time: string;
  room: string;
  instructor: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

const TodaysSchedule = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTodaysSchedule = async () => {
      if (!user) return;

      try {
        const today = new Date();
        const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
        
        const scheduleQuery = query(
          collection(db, 'schedule'),
          where('studentId', '==', user.id),
          where('dayOfWeek', '==', dayOfWeek),
          orderBy('time', 'asc')
        );

        const scheduleSnapshot = await getDocs(scheduleQuery);
        const scheduleData = scheduleSnapshot.docs.map(doc => {
          const data = doc.data();
          const currentTime = new Date();
          const [hours, minutes] = data.time.split(':').map(Number);
          const classTime = new Date();
          classTime.setHours(hours, minutes, 0, 0);
          
          let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
          const classEndTime = new Date(classTime.getTime() + 60 * 60 * 1000); // 1 hour duration
          
          if (currentTime >= classTime && currentTime <= classEndTime) {
            status = 'ongoing';
          } else if (currentTime > classEndTime) {
            status = 'completed';
          }

          return {
            id: doc.id,
            ...data,
            status
          };
        }) as ScheduleItem[];

        // Filter to show only remaining classes (upcoming and ongoing)
        const remainingClasses = scheduleData.filter(item => item.status !== 'completed');
        setSchedule(remainingClasses);
      } catch (error) {
        console.error('Error fetching schedule:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodaysSchedule();
  }, [user]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-slide-up">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CalendarDays className="h-5 w-5 text-primary" />
          <span>Today's Schedule</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {schedule.length > 0 ? (
          <div className="space-y-3">
            {schedule.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-medium">{item.courseName}</h4>
                    <Badge 
                      variant={item.status === 'ongoing' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {item.status === 'ongoing' ? 'Live' : 'Upcoming'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{item.time}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>{item.room}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.instructor}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No more classes today</p>
            <p className="text-xs text-muted-foreground">Enjoy your free time!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodaysSchedule;