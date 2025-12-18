import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, RefreshCw, Plus, Eye, Tag, ExternalLink, Video, Image, Play, ArrowUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useNavigate } from "react-router-dom";
import {
  fetchAllMediaAssets,
  fetchMediaTags,
  fetchS3BucketConfigs,
  scanS3Bucket,
  MediaAsset,
  MediaTag,
  S3BucketConfig,
  SearchFilters,
  SortOption
} from "@/services/unifiedMediaService";
import { LibrarianWorkflowDialog } from "./LibrarianWorkflowDialog";
import VideoPreviewModal from "./VideoPreviewModal";
import MediaSourceDashboard from "./MediaSourceDashboard";
import { S3BucketConfigManager } from "./S3BucketConfigManager";
import { MediaNavigation } from "./MediaNavigation";

export const UnifiedMediaLibrary: React.FC = () => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [tags, setTags] = useState<MediaTag[]>([]);
  const [bucketConfigs, setBucketConfigs] = useState<S3BucketConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [workflowAsset, setWorkflowAsset] = useState<MediaAsset | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'created_at', direction: 'desc' });
  const [isScanning, setIsScanning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('library');
  const { user } = useUser();
  useSupabaseAuth(); // Ensure Supabase auth when user is logged in
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      toast.error('Please log in to access the media library');
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    // Only load initial data for the active tab
    if (activeTab === 'library') {
      loadLibraryData();
    } else if (activeTab === 's3-config') {
      loadS3ConfigData();
    }
  }, [activeTab]);

  useEffect(() => {
    // Only search/load assets when on library tab
    if (activeTab !== 'library') return;
    
    const delayedSearch = setTimeout(() => {
      if (searchQuery || Object.keys(filters).length > 0) {
        searchAssets();
      } else {
        loadAssets();
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, filters, sortOption, activeTab]);

  const loadLibraryData = async () => {
    try {
      setIsLoading(true);
      const [assetsData, tagsData] = await Promise.all([
        fetchAllMediaAssets(undefined, undefined, 50, 0, sortOption),
        fetchMediaTags()
      ]);

      setAssets(assetsData.assets);
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading library data:', error);
      toast.error('Failed to load media library data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadS3ConfigData = async () => {
    try {
      setIsLoading(true);
      const bucketsData = await fetchS3BucketConfigs();
      setBucketConfigs(bucketsData);
    } catch (error) {
      console.error('Error loading S3 config data:', error);
      toast.error('Failed to load S3 configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssets = async () => {
    try {
      const { assets: assetsData } = await fetchAllMediaAssets(undefined, undefined, 50, 0, sortOption);
      setAssets(assetsData);
    } catch (error) {
      console.error('Error loading assets:', error);
      toast.error('Failed to load media assets');
    }
  };

  const searchAssets = async () => {
    try {
      setIsLoading(true);
      const { assets: assetsData } = await fetchAllMediaAssets(searchQuery, filters, 50, 0, sortOption);
      setAssets(assetsData);
    } catch (error) {
      console.error('Error searching assets:', error);
      toast.error('Failed to search media assets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanBucket = async (bucketConfigId: string) => {
    try {
      setIsScanning(bucketConfigId);
      const result = await scanS3Bucket(bucketConfigId, true);
      
      toast.success(`Scan complete: ${result.results.new_assets} new, ${result.results.updated_assets} updated`);
      
      // Reload assets after scan
      await loadAssets();
    } catch (error) {
      console.error('Error scanning bucket:', error);
      toast.error('Failed to scan S3 bucket');
    } finally {
      setIsScanning(null);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'salesforce': return '🏢';
      case 's3_bucket': return '☁️';
      case 'youtube': return '📺';
      case 'generated': return '🤖';
      case 'local_upload': return '📁';
      default: return '📄';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (duration?: number | string) => {
    // Handle formatted duration string from metadata
    if (typeof duration === 'string') {
      return duration;
    }
    
    // Handle numeric duration in seconds
    if (typeof duration === 'number' && !isNaN(duration)) {
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    return 'Unknown';
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading unified media library...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MediaNavigation />
      <div className="container mx-auto px-6 py-8 space-y-6">
        {/* Media Source Dashboard */}
        <MediaSourceDashboard />
      
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Unified Media Library</h1>
          <p className="text-muted-foreground mt-2">
            Manage content from Salesforce, S3 buckets, and other sources
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} className="space-y-6" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="library">Media Library</TabsTrigger>
          <TabsTrigger value="s3-config">S3 Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Search & Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <Input
                    placeholder="Search media..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                {/* Sort Dropdown */}
                <Select
                  value={`${sortOption.field}-${sortOption.direction}`}
                  onValueChange={(value) => {
                    const [field, direction] = value.split('-') as [SortOption['field'], SortOption['direction']];
                    setSortOption({ field, direction });
                  }}
                >
                  <SelectTrigger className="w-[200px] bg-background">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="created_at-desc">Date (Newest first)</SelectItem>
                    <SelectItem value="created_at-asc">Date (Oldest first)</SelectItem>
                    <SelectItem value="title-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="title-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="file_size-desc">Size (Largest first)</SelectItem>
                    <SelectItem value="file_size-asc">Size (Smallest first)</SelectItem>
                    <SelectItem value="asset_type-asc">Type (Image first)</SelectItem>
                    <SelectItem value="asset_type-desc">Type (Video first)</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Asset Type Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium mb-2 block">Asset Type</label>
              <div className="space-y-1">
                {[
                  { value: 'video', label: 'Video', icon: <Video className="w-4 h-4 mr-1.5" /> },
                  { value: 'image', label: 'Image', icon: <Image className="w-4 h-4 mr-1.5" /> }
                ].map(type => (
                  <div key={type.value} className="min-h-8 flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type.value}`}
                      checked={filters.assetTypes?.includes(type.value) || false}
                      onCheckedChange={(checked) => {
                        const currentTypes = filters.assetTypes || [];
                        if (checked) {
                          handleFilterChange('assetTypes', [...currentTypes, type.value]);
                        } else {
                          handleFilterChange('assetTypes', currentTypes.filter(t => t !== type.value));
                        }
                      }}
                    />
                    <label htmlFor={`type-${type.value}`} className="text-sm flex items-center">
                      {type.icon} {type.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium mb-2 block">Sources</label>
              <div className="space-y-1">
                {['salesforce', 's3_bucket', 'youtube', 'generated', 'local_upload'].map(source => (
                  <div key={source} className="min-h-8 flex items-center space-x-2">
                    <Checkbox
                      id={source}
                      checked={filters.sources?.includes(source) || false}
                      onCheckedChange={(checked) => {
                        const currentSources = filters.sources || [];
                        if (checked) {
                          handleFilterChange('sources', [...currentSources, source]);
                        } else {
                          handleFilterChange('sources', currentSources.filter(s => s !== source));
                        }
                      }}
                    />
                    <label htmlFor={source} className="text-sm capitalize">
                      {getSourceIcon(source)} {source === 'generated' ? 'AI Generated' : source.replace('_', ' ')}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <div className="space-y-1">
                {['pending', 'approved', 'rejected'].map(status => (
                  <div key={status} className="min-h-8 flex items-center space-x-2">
                    <Checkbox
                      id={status}
                      checked={filters.status?.includes(status) || false}
                      onCheckedChange={(checked) => {
                        const currentStatus = filters.status || [];
                        if (checked) {
                          handleFilterChange('status', [...currentStatus, status]);
                        } else {
                          handleFilterChange('status', currentStatus.filter(s => s !== status));
                        }
                      }}
                    />
                    <label htmlFor={status} className="text-sm capitalize">
                      {status}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {tags.map(tag => (
                  <div key={tag.id} className="min-h-8 flex items-center space-x-2">
                    <Checkbox
                      id={tag.id}
                      checked={filters.tags?.includes(tag.id) || false}
                      onCheckedChange={(checked) => {
                        const currentTags = filters.tags || [];
                        if (checked) {
                          handleFilterChange('tags', [...currentTags, tag.id]);
                        } else {
                          handleFilterChange('tags', currentTags.filter(t => t !== tag.id));
                        }
                      }}
                    />
                    <label htmlFor={tag.id} className="text-sm">
                      <Badge 
                        className="text-sm font-normal" 
                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                      >
                        {tag.name}
                      </Badge>
                    </label>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {assets.map((asset, index) => (
          <motion.div
            key={asset.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
              <div className="relative">
                {asset.thumbnailUrl ? (
                  <div className="relative">
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.svg';
                      }}
                    />
                    {/* Video play overlay */}
                    {asset.assetType === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <Play className="w-6 h-6 text-foreground ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-48 bg-muted rounded-t-lg flex items-center justify-center">
                    {asset.assetType === 'video' ? (
                      <Video className="w-12 h-12 text-muted-foreground" />
                    ) : asset.assetType === 'image' ? (
                      <Image className="w-12 h-12 text-muted-foreground" />
                    ) : (
                      <span className="text-4xl">{getSourceIcon(asset.source)}</span>
                    )}
                  </div>
                )}
                
                {/* Asset type badge */}
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {asset.assetType === 'video' ? (
                      <Video className="w-3 h-3 mr-1" />
                    ) : asset.assetType === 'image' ? (
                      <Image className="w-3 h-3 mr-1" />
                    ) : null}
                    {asset.assetType || asset.source.replace('_', ' ')}
                  </Badge>
                </div>
                
                <div className="absolute top-2 right-2">
                  <Badge className={getStatusColor(asset.status)}>
                    {asset.status}
                  </Badge>
                </div>

                {asset.duration && (
                  <div className="absolute bottom-2 right-2">
                    <Badge variant="outline" className="bg-black/50 text-white border-white/20">
                      {formatDuration(asset.duration || (asset.metadata?.formatted_duration))}
                    </Badge>
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                  {asset.title}
                </h3>
                
                {asset.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {asset.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-1 mb-3">
                  {asset.tags.slice(0, 3).map(tag => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: tag.color + '40', color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                  {asset.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{asset.tags.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1 mb-3">
                  {asset.fileSize && (
                    <div>Size: {formatFileSize(asset.fileSize)}</div>
                  )}
                  {asset.resolution && (
                    <div>Resolution: {asset.resolution}</div>
                  )}
                  <div>Created: {!isNaN(Date.parse(asset.createdAt)) ? new Date(asset.createdAt).toLocaleDateString() : 'Unknown'}</div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedAsset(asset)}
                    className="flex-1"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                  
                  {asset.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setWorkflowAsset(asset);
                        setShowWorkflowDialog(true);
                      }}
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      Review
                    </Button>
                  )}
                  
                  {asset.fileUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(asset.fileUrl, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {assets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No media assets found matching your criteria.</p>
        </div>
      )}
        </TabsContent>

        <TabsContent value="s3-config" className="space-y-6">
          <S3BucketConfigManager onConfigChange={() => loadS3ConfigData()} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {selectedAsset && (
        <VideoPreviewModal
          video={{
            id: selectedAsset.id,
            title: selectedAsset.title,
            description: selectedAsset.description || '',
            videoSrc: selectedAsset.fileUrl || '',
            thumbnail: selectedAsset.thumbnailUrl || '',
            duration: selectedAsset.duration?.toString() || '0',
            views: selectedAsset.metadata?.views || 0,
            uploadedAt: selectedAsset.createdAt,
            status: (selectedAsset.status === 'approved' ? 'Synced' : 
                    selectedAsset.status === 'rejected' ? 'Error' : 
                    selectedAsset.status === 'pending' ? 'Processing' : 'Draft') as 'Draft' | 'Synced' | 'Error' | 'Processing',
            tags: selectedAsset.tags.map(t => t.name)
          }}
          isOpen={!!selectedAsset}
          onClose={() => setSelectedAsset(null)}
        />
      )}

      {showWorkflowDialog && workflowAsset && (
        <LibrarianWorkflowDialog
          asset={workflowAsset}
          isOpen={showWorkflowDialog}
          onClose={() => {
            setShowWorkflowDialog(false);
            setWorkflowAsset(null);
          }}
          onComplete={() => {
            loadAssets();
            setShowWorkflowDialog(false);
            setWorkflowAsset(null);
          }}
        />
      )}
    </div>
    </div>
  );
};