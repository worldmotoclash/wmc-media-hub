import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Search, Filter, Grid, List, Loader2, PlayCircle, Clock, Eye, Save, RotateCcw, FolderOpen, Video } from 'lucide-react';
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
  const activeTab = searchParams.get('tab') || 'videos';
  
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
  const [justSaved, setJustSaved] = useState(false); // Prevent refetch immediately after save

  // DnD Kit sensors
  
  // Playlist management state
  const [playlists, setPlaylists] = useState<SalesforcePlaylist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

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
      // Don't reload if we have unsaved changes or just saved
      if (hasUnsavedChanges || justSaved) {
        console.log('Skipping video reload due to unsaved changes or recent save');
        return;
      }

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
        // Only update originalVideos if we don't have unsaved changes
        if (!hasUnsavedChanges) {
          setOriginalVideos(videoData);
        }
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
  }, [user, searchQuery, playlistId, hasUnsavedChanges, justSaved]);

  // Fetch playlists for the playlist tab
  useEffect(() => {
    const loadPlaylists = async () => {
      if (activeTab !== 'playlists' || !user) return;
      
      setIsLoadingPlaylists(true);
      try {
        const playlistData = await fetchPlaylistData();
        setPlaylists(playlistData);
      } catch (error) {
        console.error('Error loading playlists:', error);
        toast.error('Failed to load playlists');
      } finally {
        setIsLoadingPlaylists(false);
      }
    };

    loadPlaylists();
  }, [activeTab, user]);

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

    console.log('=== DRAG START ===');
    console.log('Moving:', active.id, 'to position of:', over?.id);

    if (!over || active.id === over.id) return;

    setFilteredVideos(currentVideos => {
      console.log('Current videos before reorder:', currentVideos.map(v => ({ id: v.id, title: v.title })));
      
      const activeIndex = currentVideos.findIndex(video => video.id === active.id);
      const overIndex = currentVideos.findIndex(video => video.id === over.id);

      if (activeIndex === -1 || overIndex === -1) {
        console.log('Could not find indices');
        return currentVideos;
      }

      // Create completely new array with proper reordering
      const result = [...currentVideos];
      const [movedItem] = result.splice(activeIndex, 1);
      result.splice(overIndex, 0, movedItem);
      
      // Update positions
      const finalResult = result.map((video, index) => ({
        ...video,
        playlistPosition: index + 1
      }));

      console.log('Final reordered videos:', finalResult.map(v => ({ id: v.id, title: v.title, position: v.playlistPosition })));
      
      return finalResult;
    });

    setHasUnsavedChanges(true);
    toast.success('Video reordered!');
  };

  // Save reordered playlist - only update videos that actually changed position
  const handleSaveOrder = async () => {
    if (!playlistId || !hasUnsavedChanges) return;
    
    try {
      // Only send updates for videos that actually changed position
      const changedVideos = filteredVideos.filter((video, index) => {
        const originalVideo = originalVideos.find(orig => orig.id === video.id);
        const currentPosition = video.playlistPosition || (index + 1);
        const originalPosition = originalVideo?.playlistPosition || 0;
        return currentPosition !== originalPosition;
      });

      if (changedVideos.length === 0) {
        console.log('No videos actually changed position');
        setHasUnsavedChanges(false);
        return;
      }

      const videoOrders = changedVideos.map(video => ({
        id: video.id,
        position: video.playlistPosition || 0,
        junctionId: video.junctionId
      })).filter(vo => vo.junctionId); // Only include videos with valid junction IDs

      console.log(`🎯 Saving playlist order for ${changedVideos.length} changed videos (out of ${filteredVideos.length} total):`);
      console.log('Changed video orders:', videoOrders);

      const success = await updatePlaylistOrder(playlistId, videoOrders);
      
      if (success) {
        setHasUnsavedChanges(false);
        setJustSaved(true); // Prevent immediate refetch
        // Update original videos to reflect the new saved state
        setOriginalVideos([...filteredVideos]);
        toast.success('Playlist order saved successfully!');
        
        // Reset justSaved flag after a delay to allow manual refreshes
        setTimeout(() => setJustSaved(false), 3000);
      } else {
        toast.error('Failed to save playlist order');
      }
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

  const getStatusColor = (status: VideoContent['status'] | string) => {
    switch (status.toLowerCase()) {
      case 'synced':
      case 'active':
      case 'published':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'videos') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', value);
    }
    setSearchParams(newParams);
  };

  const handlePlaylistClick = (playlistId: string) => {
    const newParams = new URLSearchParams();
    newParams.set('playlistId', playlistId);
    setSearchParams(newParams);
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
            onClick={() => navigate(playlistId ? '/admin/media/library' : '/')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {playlistId ? 'Back to Library' : 'Back to Media Hub'}
          </Button>

          {/* Breadcrumb Navigation */}
          {playlistId && (
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink onClick={() => navigate('/admin/media/library')} className="cursor-pointer">
                    Media Library
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
            
            {!playlistId && (
              <div className="flex items-center gap-4 mb-6">
                <p className="text-muted-foreground">
                  Browse videos, manage library & playlists
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleTabChange('playlists')}
                  className="ml-auto"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  View All Playlists
                </Button>
              </div>
            )}
            
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

        {/* Tab Interface for Videos and Playlists (only when not viewing a specific playlist) */}
        {!playlistId ? (
          <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-8">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="playlists" className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                Playlists
              </TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="mt-8">
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

              {/* Videos Content */}
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading videos...</span>
                </div>
              ) : filteredVideos.length === 0 ? (
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
                        onClick={() => setSelectedVideo(video)}
                        className="cursor-pointer"
                      >
                        {viewMode === 'grid' ? (
                          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                            <div className="relative">
                              <div 
                                className="w-full h-48 bg-cover bg-center relative"
                                style={{
                                  backgroundImage: video.thumbnail ? `url(${video.thumbnail})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }}
                              >
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                                  <PlayCircle className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                                <div className="absolute top-2 right-2">
                                  <Badge 
                                    variant="outline" 
                                    className={`${getStatusColor(video.status)} bg-white/90`}
                                  >
                                    {video.status}
                                  </Badge>
                                </div>
                                {video.duration && (
                                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                    {video.duration}
                                  </div>
                                )}
                              </div>
                            </div>
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                {video.title}
                              </h3>
                              {video.description && (
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                  {video.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {video.uploadedAt}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {video.views.toLocaleString()} views
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                            <div className="flex">
                              <div 
                                className="w-32 h-20 bg-cover bg-center relative flex-shrink-0"
                                style={{
                                  backgroundImage: video.thumbnail ? `url(${video.thumbnail})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }}
                              >
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                                  <PlayCircle className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                                {video.duration && (
                                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded text-[10px]">
                                    {video.duration}
                                  </div>
                                )}
                              </div>
                              <CardContent className="flex-1 p-4">
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
                                {video.description && (
                                  <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                                    {video.description}
                                  </p>
                                )}
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {video.uploadedAt}
                                  </div>
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
            </TabsContent>

            <TabsContent value="playlists" className="mt-8">
              {/* Playlist Management Interface */}
              {isLoadingPlaylists ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading playlists...</span>
                </div>
              ) : playlists.length === 0 ? (
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
                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <PlayCircle className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                    {playlist.Name}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Video className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">
                                      {playlist.ri__Video_Count__c || 0} videos
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
            </TabsContent>
          </Tabs>
        ) : (
          /* Playlist-specific view with drag and drop */
          <div>
            {/* Search and Filter Controls for playlist view */}
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

            {/* Playlist Videos with Drag and Drop */}
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading videos...</span>
              </div>
            ) : filteredVideos.length === 0 ? (
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
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
                          <SortableVideoItem
                            key={video.id}
                            video={video}
                            index={index}
                            onVideoClick={setSelectedVideo}
                            getStatusColor={getStatusColor}
                            viewMode={viewMode}
                          />
                        ))}
                     </div>
                   </SortableContext>
                </DndContext>
              </motion.div>
            )}
          </div>
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