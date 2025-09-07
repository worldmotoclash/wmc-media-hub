import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Filter, Grid, List, Loader2, PlayCircle, Clock, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { fetchVideoContent, searchVideoContent, getVideosByPlaylist, VideoContent } from '@/services/videoContentService';
import VideoPreviewModal from '@/components/media/VideoPreviewModal';

const MediaLibrary: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const playlistId = searchParams.get('playlistId') || '';
  
  const [videos, setVideos] = useState<VideoContent[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<VideoContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<VideoContent | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    // Redirect if no user is logged in
    if (!user) {
      toast.error('Please log in to access the media library');
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch videos on component mount and when search query or playlist changes
  useEffect(() => {
    const loadVideos = async () => {
      setIsLoading(true);
      try {
        let videoData: VideoContent[];
        
        if (playlistId) {
          videoData = await getVideosByPlaylist(playlistId);
        } else if (searchQuery) {
          videoData = await searchVideoContent(searchQuery);
        } else {
          videoData = await fetchVideoContent();
        }
        
        setVideos(videoData);
        setFilteredVideos(videoData);
      } catch (error) {
        console.error('Error loading videos:', error);
        toast.error('Failed to load videos');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      loadVideos();
    }
  }, [user, searchQuery, playlistId]);

  // Filter videos by status
  useEffect(() => {
    let filtered = videos;
    
    if (filterStatus !== 'all') {
      filtered = videos.filter(video => video.status.toLowerCase() === filterStatus.toLowerCase());
    }
    
    setFilteredVideos(filtered);
  }, [videos, filterStatus]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      setSearchParams({ search: localSearch.trim() });
    } else {
      setSearchParams({});
    }
  };

  const getStatusColor = (status: VideoContent['status']) => {
    switch (status) {
      case 'Synced':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

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
            <h1 className="text-4xl font-bold mb-4 text-foreground">Media Library</h1>
            {searchQuery && (
              <p className="text-muted-foreground mb-2">
                Search results for: <strong>"{searchQuery}"</strong>
              </p>
            )}
            {playlistId && (
              <p className="text-muted-foreground mb-2">
                Showing videos from selected playlist
              </p>
            )}
          </motion.div>
        </div>

        {/* Search and Filter Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-8 space-y-4"
        >
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search videos..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" size="sm">
                Search
              </Button>
            </form>

            <div className="flex gap-2 items-center">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm"
              >
                <option value="all">All Videos</option>
                <option value="synced">Published</option>
                <option value="draft">Draft</option>
                <option value="processing">Processing</option>
                <option value="error">Error</option>
              </select>

              <div className="flex border border-input rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="rounded-r-none"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-l-none border-l"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} found</span>
            {filterStatus !== 'all' && (
              <Badge variant="outline">{filterStatus} filter active</Badge>
            )}
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading videos...</span>
          </div>
        ) : filteredVideos.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Card className="border-2 border-dashed border-muted-foreground/20">
              <CardHeader className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 text-muted-foreground">
                  <Search className="w-full h-full" />
                </div>
                <CardTitle className="text-2xl mb-2">
                  {searchQuery ? 'No videos found' : 'No videos available'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center pb-12">
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {searchQuery 
                    ? `No videos match your search for "${searchQuery}"`
                    : 'Upload some videos to get started with your media library.'
                  }
                </p>
                {searchQuery && (
                  <Button onClick={() => { setLocalSearch(''); setSearchParams({}); }}>
                    Clear Search
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Video Grid/List */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-4"
            }>
              {filteredVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.6 }}
                >
                  {viewMode === 'grid' ? (
                    <Card 
                      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <div className="relative">
                        <img 
                          src={video.thumbnail} 
                          alt={video.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <PlayCircle className="w-12 h-12 text-white" />
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {video.duration}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(video.status)}
                          >
                            {video.status}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </h3>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>{video.uploadedAt}</span>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {video.views.toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card 
                      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <div className="flex">
                        <div className="relative w-48 h-32">
                          <img 
                            src={video.thumbnail} 
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <PlayCircle className="w-8 h-8 text-white" />
                          </div>
                          <div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-2 h-2" />
                            {video.duration}
                          </div>
                        </div>
                        <CardContent className="flex-1 p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {video.title}
                            </h3>
                            <Badge 
                              variant="outline" 
                              className={getStatusColor(video.status)}
                            >
                              {video.status}
                            </Badge>
                          </div>
                          {video.description && (
                            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                              {video.description}
                            </p>
                          )}
                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>Uploaded {video.uploadedAt}</span>
                            <div className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {video.views.toLocaleString()} views
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Video Preview Modal */}
      <VideoPreviewModal 
        video={selectedVideo}
        isOpen={!!selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </div>
  );
};

export default MediaLibrary;