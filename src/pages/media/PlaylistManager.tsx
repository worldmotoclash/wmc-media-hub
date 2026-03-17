import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { useCreatorGuard } from '@/hooks/useCreatorGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Loader2, PlayCircle, Video, Music } from 'lucide-react';
import { toast } from 'sonner';
import { fetchPlaylistData, SalesforcePlaylist, isAudioPlaylist } from '@/services/videoContentService';
import { MediaNavigation } from '@/components/media/MediaNavigation';

const PlaylistManager: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<SalesforcePlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access the playlist manager');
      navigate('/login');
    }
  }, [user, navigate]);

  const creatorBlocked = useCreatorGuard();

  

  // Fetch playlists on component mount
  useEffect(() => {
    const loadPlaylists = async () => {
      setIsLoading(true);
      try {
        const playlistData = await fetchPlaylistData();
        setPlaylists(playlistData);
      } catch (error) {
        console.error('Error loading playlists:', error);
        toast.error('Failed to load playlists');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadPlaylists();
    }
  }, [user]);

  const handlePlaylistClick = (playlistId: string) => {
    navigate(`/admin/media/content?playlistId=${playlistId}`);
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <MediaNavigation />
      <div className="container mx-auto px-6 py-12">
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-4 text-foreground">Playlist Manager</h1>
            <p className="text-muted-foreground">
              Organize and manage your video playlists
            </p>
          </motion.div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading playlists...</span>
          </div>
        ) : playlists.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Card className="border-2 border-dashed border-muted-foreground/20">
              <CardHeader className="text-center py-12">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <CardTitle className="text-2xl mb-2">No Playlists Found</CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-12">
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  You don't have any playlists yet. Create your first playlist to organize your videos.
                </p>
                <Button onClick={() => navigate('/')} className="bg-science-blue hover:bg-science-blue/80">
                  Return to Media Hub
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Playlist Grid */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">Your Playlists</h2>
              <Badge variant="outline" className="text-muted-foreground">
                {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playlists.map((playlist, index) => (
                <motion.div
                  key={playlist.Id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <Card 
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    onClick={() => handlePlaylistClick(playlist.Id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            isAudioPlaylist(playlist) 
                              ? 'bg-orange-500/10' 
                              : 'bg-primary/10'
                          }`}>
                            {isAudioPlaylist(playlist) ? (
                              <Music className="w-6 h-6 text-orange-500" />
                            ) : (
                              <PlayCircle className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {playlist.Name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {isAudioPlaylist(playlist) ? (
                                <Music className="w-3 h-3 text-muted-foreground" />
                              ) : (
                                <Video className="w-3 h-3 text-muted-foreground" />
                              )}
                              <span className="text-sm text-muted-foreground">
                                {playlist.ri__Video_Count__c || 0} {isAudioPlaylist(playlist) ? 'tracks' : 'videos'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {playlist.ri__Status__c && (
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(playlist.ri__Status__c)}
                          >
                            {playlist.ri__Status__c}
                          </Badge>
                        )}
                      </div>
                      
                      {playlist.ri__Description__c && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {playlist.ri__Description__c}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          Created {new Date(playlist.CreatedDate).toLocaleDateString()}
                        </span>
                        <span>
                          Updated {new Date(playlist.LastModifiedDate).toLocaleDateString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PlaylistManager;