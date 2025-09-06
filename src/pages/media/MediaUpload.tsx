import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const MediaUpload: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if no user is logged in
    if (!user) {
      toast.error('Please log in to access the media upload');
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Media Hub
          </Button>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-4 text-foreground">Upload New Video</h1>
            <p className="text-muted-foreground">Add new video content to the WMC library</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Card className="border-2 border-dashed border-muted-foreground/20">
            <CardHeader className="text-center py-12">
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <CardTitle className="text-2xl mb-2">Upload Interface Coming Soon</CardTitle>
            </CardHeader>
            <CardContent className="text-center pb-12">
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                The video upload interface is currently under development. This will include:
              </p>
              <ul className="text-left text-muted-foreground mb-8 max-w-md mx-auto space-y-2">
                <li>• Drag & drop file upload</li>
                <li>• Progress tracking</li>
                <li>• Metadata editing</li>
                <li>• Thumbnail generation</li>
                <li>• Quality settings</li>
                <li>• Batch upload support</li>
              </ul>
              <Button onClick={() => navigate('/')} className="bg-science-blue hover:bg-science-blue/80">
                Return to Media Hub
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default MediaUpload;