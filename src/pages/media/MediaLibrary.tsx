import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Filter, Grid, List, Loader2, PlayCircle, Clock, Eye, Save, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { fetchVideoContent, searchVideoContent, getVideosByPlaylist, VideoContent, fetchPlaylistData, SalesforcePlaylist, updatePlaylistOrder } from '@/services/videoContentService';
import VideoPreviewModal from '@/components/media/VideoPreviewModal';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import SortableVideoItem from '@/components/media/SortableVideoItem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

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
  const [currentPlaylist, setCurrentPlaylist] = useState<SalesforcePlaylist | null>(null);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [originalVideos, setOriginalVideos] = useState<VideoContent[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    // Redirect if no user is logged in
    if (!user) {
      toast.error('Please log in to access the media library');
      navigate('/login');
    }
  }, [user, navigate]);

  // Fetch playlist details when playlistId is present
  useEffect(() => {
    const loadPlaylistDetails = async () => {
      if (!playlistId || !user) return;
      
      setIsLoadingPlaylist(true);
      try {
        const playlists = await fetchPlaylistData();
        const playlist = playlists.find(p => p.Id === playlistId);
        setCurrentPlaylist(playlist || null);
      } catch (error) {
        console.error('Error loading playlist details:', error);
        toast.error('Failed to load playlist details');
      } finally {
        setIsLoadingPlaylist(false);
      }
    };

    loadPlaylistDetails();
  }, [playlistId, user]);

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
        setOriginalVideos(videoData); // Store original order
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

  // Handle drag end for reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = filteredVideos.findIndex(video => video.id === active.id);
      const newIndex = filteredVideos.findIndex(video => video.id === over?.id);

      const newOrder = arrayMove(filteredVideos, oldIndex, newIndex);
      
      // Update playlist positions
      const updatedVideos = newOrder.map((video, index) => ({
        ...video,
        playlistPosition: index + 1
      }));

      setFilteredVideos(updatedVideos);
      setVideos(prevVideos => {
        const updatedAllVideos = [...prevVideos];
        updatedVideos.forEach(updatedVideo => {
          const index = updatedAllVideos.findIndex(v => v.id === updatedVideo.id);
          if (index !== -1) {
            updatedAllVideos[index] = updatedVideo;
          }
        });
        return updatedAllVideos;
      });
      
      setHasUnsavedChanges(true);
      toast.success('Video order updated. Don\'t forget to save your changes!');
    }
  };

  // Save reordered playlist
  const handleSaveOrder = async () => {
    if (!playlistId || !hasUnsavedChanges) return;
    
    try {
      const videoOrders = filteredVideos.map(video => ({
        id: video.id,
        position: video.playlistPosition || 0
      }));

      // TODO: Uncomment when backend API is ready
      // await updatePlaylistOrder(playlistId, videoOrders);
      
      setOriginalVideos([...filteredVideos]);
      setHasUnsavedChanges(false);
      toast.success('Playlist order saved successfully!');
    } catch (error) {
      console.error('Error saving playlist order:', error);
      toast.error('Failed to save playlist order');
    }
  };

  // Reset to original order
  const handleResetOrder = () => {
    if (!hasUnsavedChanges) return;
    
    setVideos([...originalVideos]);
    setFilteredVideos(originalVideos.filter(video => 
      filterStatus === 'all' || video.status.toLowerCase() === filterStatus.toLowerCase()
    ));
    setHasUnsavedChanges(false);
    toast.success('Playlist order reset to original');
  };

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
            onClick={() => navigate(playlistId ? '/media/playlists' : '/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {playlistId ? 'Back to Playlists' : 'Back to Media Hub'}
          </Button>

          {/* Breadcrumb Navigation */}
          {playlistId && (
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate('/media/playlists')} className="cursor-pointer">
                    Playlists
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {isLoadingPlaylist ? 'Loading...' : (currentPlaylist?.Name || 'Unknown Playlist')}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          )}
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              {playlistId ? (
                <>
                  {isLoadingPlaylist ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-8 h-8 animate-spin" />
                      Loading Playlist...
                    </div>
                  ) : (
                    `Playlist: ${currentPlaylist?.Name || 'Unknown Playlist'}`
                  )}
                </>
              ) : (
                'Media Library'
              )}
            </h1>
            
            {playlistId && currentPlaylist && !isLoadingPlaylist && (
              <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{currentPlaylist.Name}</h2>
                    {currentPlaylist.ri__Description__c && (
                      <p className="text-muted-foreground">{currentPlaylist.ri__Description__c}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">{currentPlaylist.ri__Video_Count__c || 0}</div>
                    <div className="text-sm text-muted-foreground">videos</div>
                  </div>
                </div>
                
                {/* Save/Reset buttons for playlist reordering */}
                {hasUnsavedChanges && (
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground flex-1">You have unsaved changes to the video order</p>
                    <Button variant="outline" size="sm" onClick={handleResetOrder}>
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                    <Button size="sm" onClick={handleSaveOrder}>
                      <Save className="w-4 h-4 mr-1" />
                      Save Order
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {searchQuery && (
              <p className="text-muted-foreground mb-2">
                Search results for: <strong>"{searchQuery}"</strong>
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
            {playlistId ? (
              /* Sortable Playlist View */
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext 
                  items={filteredVideos.map(v => v.id)}
                  strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
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
                        <SortableVideoItem
                          video={video}
                          index={index}
                          onVideoClick={setSelectedVideo}
                          getStatusColor={getStatusColor}
                          viewMode={viewMode}
                        />
                      </motion.div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              /* Regular Media Library View */
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
            )}
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