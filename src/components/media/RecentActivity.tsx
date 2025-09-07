import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Sparkles, Clock } from 'lucide-react';

interface ActivityItem {
  id: string;
  title: string;
  type: 'upload' | 'generate';
  status: 'uploaded' | 'synced' | 'processing' | 'error' | 'completed';
  timestamp: string;
}

const RecentActivity: React.FC = () => {
  // Mock data - replace with real API call
  const recentActivities: ActivityItem[] = [
    {
      id: '1',
      title: 'Kawasaki Championship Highlights',
      type: 'upload',
      status: 'synced',
      timestamp: '2 hours ago'
    },
    {
      id: '2',
      title: 'AI-Generated Race Promo',
      type: 'generate',
      status: 'processing',
      timestamp: '3 hours ago'
    },
    {
      id: '3',
      title: 'Podium Celebration Montage',
      type: 'upload',
      status: 'uploaded',
      timestamp: '5 hours ago'
    },
    {
      id: '4',
      title: 'Track Preview - Sonoma',
      type: 'generate',
      status: 'completed',
      timestamp: '1 day ago'
    },
    {
      id: '5',
      title: 'Behind the Scenes Footage',
      type: 'upload',
      status: 'error',
      timestamp: '2 days ago'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
      case 'completed':
        return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      case 'uploaded':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-700 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
            Recent Activity
          </h2>
          
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-science-blue" />
                Latest Uploads & Generations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {activity.type === 'upload' ? (
                        <Upload className="w-5 h-5 text-science-blue" />
                      ) : (
                        <Sparkles className="w-5 h-5 text-cinnabar" />
                      )}
                      <div>
                        <h4 className="font-medium text-foreground">{activity.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {activity.type === 'upload' ? 'Uploaded' : 'AI Generated'} • {activity.timestamp}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(activity.status)}>
                      {getStatusText(activity.status)}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default RecentActivity;