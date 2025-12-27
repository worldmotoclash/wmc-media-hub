import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, RefreshCw, Plus, Eye, Tag, ExternalLink, Video, Image, Play, ArrowUpDown, LayoutGrid, List, ChevronLeft, ChevronRight, Youtube, Sparkles, Upload, CheckCircle, AlertTriangle, Link2, Music } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import ImagePreviewModal from "./ImagePreviewModal";
import AudioPreviewModal from "./AudioPreviewModal";
import MediaSourceDashboard from "./MediaSourceDashboard";
import { S3BucketConfigManager } from "./S3BucketConfigManager";
import { MediaNavigation } from "./MediaNavigation";

export const UnifiedMediaLibrary: React.FC = () => {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [tags, setTags] = useState<MediaTag[]>([]);
  const [bucketConfigs, setBucketConfigs] = useState<S3BucketConfig[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [workflowAsset, setWorkflowAsset] = useState<MediaAsset | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'created_at', direction: 'desc' });
  const [isScanning, setIsScanning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('library');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);
  const pageSize = 20;
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
      searchAssets();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, filters, sortOption, activeTab, currentPage]);

  const loadLibraryData = async () => {
    try {
      setIsInitialLoading(true);
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
      setIsInitialLoading(false);
    }
  };

  const loadS3ConfigData = async () => {
    try {
      setIsInitialLoading(true);
      const bucketsData = await fetchS3BucketConfigs();
      setBucketConfigs(bucketsData);
    } catch (error) {
      console.error('Error loading S3 config data:', error);
      toast.error('Failed to load S3 configurations');
    } finally {
      setIsInitialLoading(false);
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
      setIsFiltering(true);
      const offset = (currentPage - 1) * pageSize;
      const { assets: assetsData, total } = await fetchAllMediaAssets(searchQuery, filters, pageSize, offset, sortOption);
      setAssets(assetsData);
      setTotalAssets(total);
    } catch (error) {
      console.error('Error searching assets:', error);
      toast.error('Failed to search media assets');
    } finally {
      setIsFiltering(false);
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
    setCurrentPage(1); // Reset to first page when filters change
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setCurrentPage(1); // Reset to first page when clearing filters
    setFilters({});
    setSearchQuery('');
  };

  const totalPages = Math.ceil(totalAssets / pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
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

  const getSyncStatusBadge = (syncStatus?: string) => {
    switch (syncStatus) {
      case 'in_sync':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Synced
          </Badge>
        );
      case 'missing_sfdc':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            No SFDC
          </Badge>
        );
      case 'missing_file':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            No File
          </Badge>
        );
      default:
        return null;
    }
  };

  const getContentOriginIcon = (source: string, fileFormat?: string) => {
    // Check for audio content first
    const audioTypes = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'audio'];
    if (fileFormat && audioTypes.some(type => fileFormat.toLowerCase().includes(type))) {
      return <Music className="w-3 h-3 text-orange-500" />;
    }
    switch (source) {
      case 'youtube': return <Youtube className="w-3 h-3 text-red-500" />;
      case 'generated': return <Sparkles className="w-3 h-3 text-purple-500" />;
      case 's3_bucket':
      case 'local_upload': return <Upload className="w-3 h-3 text-blue-500" />;
      default: return null;
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

  if (isInitialLoading) {
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

                {/* View Mode Toggle */}
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Asset Type Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium mb-2 block">Asset Type</label>
              <div className="space-y-1">
                {/* Video */}
                <div className="min-h-8 flex items-center space-x-2">
                  <Checkbox
                    id="type-video"
                    checked={filters.assetTypes?.includes('video') || false}
                    onCheckedChange={(checked) => {
                      const currentTypes = filters.assetTypes || [];
                      if (checked) {
                        handleFilterChange('assetTypes', [...currentTypes, 'video']);
                      } else {
                        handleFilterChange('assetTypes', currentTypes.filter(t => t !== 'video'));
                      }
                    }}
                  />
                  <label htmlFor="type-video" className="text-sm flex items-center">
                    <Video className="w-4 h-4 mr-1.5" /> Video
                  </label>
                </div>
                
                {/* Image (parent) - selects master_image, image_variant, grid_variant, and generation_master */}
                <div className="min-h-8 flex items-center space-x-2">
                  <Checkbox
                    id="type-image"
                    checked={
                      (filters.assetTypes?.includes('master_image') && 
                       filters.assetTypes?.includes('image_variant') && 
                       filters.assetTypes?.includes('grid_variant') &&
                       filters.assetTypes?.includes('generation_master')) || 
                      filters.assetTypes?.includes('image') || 
                      false
                    }
                    onCheckedChange={(checked) => {
                      const currentTypes = (filters.assetTypes || []).filter(
                        t => !['image', 'master_image', 'image_variant', 'grid_variant', 'generation_master'].includes(t)
                      );
                      if (checked) {
                        handleFilterChange('assetTypes', [...currentTypes, 'master_image', 'image_variant', 'grid_variant', 'generation_master']);
                      } else {
                        handleFilterChange('assetTypes', currentTypes);
                      }
                    }}
                  />
                  <label htmlFor="type-image" className="text-sm flex items-center">
                    <Image className="w-4 h-4 mr-1.5" /> Image
                  </label>
                </div>
                
                {/* Masters (sub-option) */}
                <div className="min-h-8 flex items-center space-x-2 pl-6">
                  <Checkbox
                    id="type-master"
                    checked={filters.assetTypes?.includes('master_image') || false}
                    onCheckedChange={(checked) => {
                      const currentTypes = (filters.assetTypes || []).filter(t => t !== 'image');
                      if (checked) {
                        handleFilterChange('assetTypes', [...currentTypes.filter(t => t !== 'master_image'), 'master_image']);
                      } else {
                        handleFilterChange('assetTypes', currentTypes.filter(t => t !== 'master_image'));
                      }
                    }}
                  />
                  <label htmlFor="type-master" className="text-sm text-muted-foreground">
                    Masters
                  </label>
                </div>
                
                {/* Variants (sub-option) - includes both image_variant and grid_variant */}
                <div className="min-h-8 flex items-center space-x-2 pl-6">
                  <Checkbox
                    id="type-variant"
                    checked={
                      (filters.assetTypes?.includes('image_variant') || filters.assetTypes?.includes('grid_variant')) || 
                      false
                    }
                    onCheckedChange={(checked) => {
                      const currentTypes = (filters.assetTypes || []).filter(
                        t => !['image', 'image_variant', 'grid_variant'].includes(t)
                      );
                      if (checked) {
                        handleFilterChange('assetTypes', [...currentTypes, 'image_variant', 'grid_variant']);
                      } else {
                        handleFilterChange('assetTypes', currentTypes);
                      }
                    }}
                  />
                  <label htmlFor="type-variant" className="text-sm text-muted-foreground">
                    Variants
                  </label>
                </div>
                
                {/* 3x3 Grids (generation_master) */}
                <div className="min-h-8 flex items-center space-x-2 pl-6">
                  <Checkbox
                    id="type-grid"
                    checked={filters.assetTypes?.includes('generation_master') || false}
                    onCheckedChange={(checked) => {
                      const currentTypes = (filters.assetTypes || []).filter(t => t !== 'image');
                      if (checked) {
                        handleFilterChange('assetTypes', [...currentTypes.filter(t => t !== 'generation_master'), 'generation_master']);
                      } else {
                        handleFilterChange('assetTypes', currentTypes.filter(t => t !== 'generation_master'));
                      }
                    }}
                  />
                  <label htmlFor="type-grid" className="text-sm text-muted-foreground flex items-center gap-1">
                    <LayoutGrid className="w-3 h-3" /> 3x3 Grids
                  </label>
                </div>
              </div>
            </div>

            {/* Content Origin Filter (replaces Sources) */}
            <div className="space-y-3">
              <label className="text-sm font-medium mb-2 block">Content Origin</label>
              <div className="space-y-1">
                {/* YouTube */}
                <div className="min-h-8 flex items-center space-x-2">
                  <Checkbox
                    id="origin-youtube"
                    checked={filters.contentOrigin?.includes('youtube') || false}
                    onCheckedChange={(checked) => {
                      const current = filters.contentOrigin || [];
                      if (checked) {
                        handleFilterChange('contentOrigin', [...current, 'youtube']);
                      } else {
                        handleFilterChange('contentOrigin', current.filter(o => o !== 'youtube'));
                      }
                    }}
                  />
                  <label htmlFor="origin-youtube" className="text-sm flex items-center gap-1.5">
                    <Youtube className="w-4 h-4 text-red-500" /> YouTube
                  </label>
                </div>
                
                {/* AI Generated */}
                <div className="min-h-8 flex items-center space-x-2">
                  <Checkbox
                    id="origin-ai-generated"
                    checked={filters.contentOrigin?.includes('ai_generated') || false}
                    onCheckedChange={(checked) => {
                      const current = filters.contentOrigin || [];
                      if (checked) {
                        handleFilterChange('contentOrigin', [...current, 'ai_generated']);
                      } else {
                        handleFilterChange('contentOrigin', current.filter(o => o !== 'ai_generated'));
                      }
                    }}
                  />
                  <label htmlFor="origin-ai-generated" className="text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-500" /> AI Generated
                  </label>
                </div>
                
                {/* Uploaded */}
                <div className="min-h-8 flex items-center space-x-2">
                  <Checkbox
                    id="origin-uploaded"
                    checked={filters.contentOrigin?.includes('uploaded') || false}
                    onCheckedChange={(checked) => {
                      const current = filters.contentOrigin || [];
                      if (checked) {
                        handleFilterChange('contentOrigin', [...current, 'uploaded']);
                      } else {
                        handleFilterChange('contentOrigin', current.filter(o => o !== 'uploaded'));
                      }
                    }}
                  />
                  <label htmlFor="origin-uploaded" className="text-sm flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-blue-500" /> Uploaded
                  </label>
                </div>
                
                {/* Audio */}
                <div className="min-h-8 flex items-center space-x-2">
                  <Checkbox
                    id="origin-audio"
                    checked={filters.contentOrigin?.includes('audio') || false}
                    onCheckedChange={(checked) => {
                      const current = filters.contentOrigin || [];
                      if (checked) {
                        handleFilterChange('contentOrigin', [...current, 'audio']);
                      } else {
                        handleFilterChange('contentOrigin', current.filter(o => o !== 'audio'));
                      }
                    }}
                  />
                  <label htmlFor="origin-audio" className="text-sm flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-orange-500" /> Audio
                  </label>
                </div>
              </div>
              
              {/* Sync Status Filter */}
              <div className="pt-3 border-t mt-3">
                <label className="text-sm font-medium mb-2 block flex items-center gap-1.5">
                  <Link2 className="w-4 h-4" /> Sync Status
                </label>
                <div className="space-y-1">
                  <div className="min-h-8 flex items-center space-x-2">
                    <Checkbox
                      id="sync-in-sync"
                      checked={filters.syncStatus === 'in_sync'}
                      onCheckedChange={(checked) => {
                        handleFilterChange('syncStatus', checked ? 'in_sync' : undefined);
                      }}
                    />
                    <label htmlFor="sync-in-sync" className="text-sm flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-green-500" /> In Sync
                    </label>
                  </div>
                  <div className="min-h-8 flex items-center space-x-2">
                    <Checkbox
                      id="sync-missing-sfdc"
                      checked={filters.syncStatus === 'missing_sfdc'}
                      onCheckedChange={(checked) => {
                        handleFilterChange('syncStatus', checked ? 'missing_sfdc' : undefined);
                      }}
                    />
                    <label htmlFor="sync-missing-sfdc" className="text-sm flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" /> Missing SFDC
                    </label>
                  </div>
                </div>
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

      {/* Results - Grid View */}
      {viewMode === 'grid' ? (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 transition-opacity ${isFiltering ? 'opacity-50' : ''}`}>
          {assets.map((asset, index) => (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer">
                <div className="relative cursor-pointer" onClick={() => setSelectedAsset(asset)}>
                  {asset.assetType === 'audio' ? (
                    // Audio asset placeholder with waveform visualization
                    <div className="w-full h-48 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-t-lg flex flex-col items-center justify-center relative overflow-hidden">
                      {/* Animated waveform bars */}
                      <div className="flex items-center gap-1 mb-3">
                        {[...Array(12)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 bg-gradient-to-t from-orange-500 to-amber-400 rounded-full"
                            initial={{ height: 8 }}
                            animate={{ 
                              height: [8, 20 + Math.random() * 30, 8],
                            }}
                            transition={{
                              duration: 0.8 + Math.random() * 0.4,
                              repeat: Infinity,
                              delay: i * 0.1,
                              ease: "easeInOut"
                            }}
                          />
                        ))}
                      </div>
                      <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Music className="w-8 h-8 text-orange-500" />
                      </div>
                      {/* Audio format badge */}
                      {asset.fileFormat && (
                        <Badge variant="outline" className="absolute bottom-3 left-3 bg-background/80 text-xs uppercase">
                          {asset.fileFormat}
                        </Badge>
                      )}
                    </div>
                  ) : asset.thumbnailUrl ? (
                    <div className="relative">
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
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
                  
                  <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {asset.assetType === 'video' ? (
                        <Video className="w-3 h-3 mr-1" />
                      ) : asset.assetType === 'image' ? (
                        <Image className="w-3 h-3 mr-1" />
                      ) : asset.assetType === 'audio' ? (
                        <Music className="w-3 h-3 mr-1" />
                      ) : null}
                      {asset.assetType || asset.source.replace('_', ' ')}
                    </Badge>
                    {/* Content Origin Badge */}
                    {getContentOriginIcon(asset.source, asset.fileFormat) && (
                      <Badge variant="secondary" className="text-xs px-1.5">
                        {getContentOriginIcon(asset.source, asset.fileFormat)}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    <Badge className={getStatusColor(asset.status)}>
                      {asset.status}
                    </Badge>
                  </div>

                  {(asset.duration || asset.metadata?.formatted_duration) && (
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="outline" className={`border-white/20 ${asset.assetType === 'audio' ? 'bg-orange-500/80 text-white' : 'bg-black/50 text-white'}`}>
                        {asset.assetType === 'audio' && <Music className="w-3 h-3 mr-1" />}
                        {formatDuration(asset.duration || asset.metadata?.formatted_duration)}
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
                    <div className="flex items-center justify-between">
                      <span>Created: {!isNaN(Date.parse(asset.createdAt)) ? new Date(asset.createdAt).toLocaleDateString() : 'Unknown'}</span>
                      {asset.syncStatus && getSyncStatusBadge(asset.syncStatus)}
                    </div>
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
      ) : (
        /* Results - List View */
        <Card className={`transition-opacity ${isFiltering ? 'opacity-50' : ''}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Preview</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => setSortOption(prev => ({ 
                    field: 'title', 
                    direction: prev.field === 'title' && prev.direction === 'asc' ? 'desc' : 'asc' 
                  }))}
                >
                  <div className="flex items-center gap-1">
                    Title
                    {sortOption.field === 'title' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortOption.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-24 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => setSortOption(prev => ({ 
                    field: 'asset_type', 
                    direction: prev.field === 'asset_type' && prev.direction === 'asc' ? 'desc' : 'asc' 
                  }))}
                >
                  <div className="flex items-center gap-1">
                    Type
                    {sortOption.field === 'asset_type' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortOption.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-24 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => setSortOption(prev => ({ 
                    field: 'source', 
                    direction: prev.field === 'source' && prev.direction === 'asc' ? 'desc' : 'asc' 
                  }))}
                >
                  <div className="flex items-center gap-1">
                    Source
                    {sortOption.field === 'source' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortOption.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-24 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => setSortOption(prev => ({ 
                    field: 'status', 
                    direction: prev.field === 'status' && prev.direction === 'asc' ? 'desc' : 'asc' 
                  }))}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {sortOption.field === 'status' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortOption.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-24 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => setSortOption(prev => ({ 
                    field: 'file_size', 
                    direction: prev.field === 'file_size' && prev.direction === 'desc' ? 'asc' : 'desc' 
                  }))}
                >
                  <div className="flex items-center gap-1">
                    Size
                    {sortOption.field === 'file_size' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortOption.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="w-32 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => setSortOption(prev => ({ 
                    field: 'created_at', 
                    direction: prev.field === 'created_at' && prev.direction === 'desc' ? 'asc' : 'desc' 
                  }))}
                >
                  <div className="flex items-center gap-1">
                    Created
                    {sortOption.field === 'created_at' && (
                      <ArrowUpDown className={`w-3 h-3 ${sortOption.direction === 'desc' ? 'rotate-180' : ''}`} />
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="relative w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center">
                      {asset.thumbnailUrl ? (
                        <>
                          <img
                            src={asset.thumbnailUrl}
                            alt={asset.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder.svg';
                            }}
                          />
                          {asset.assetType === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Play className="w-4 h-4 text-white" fill="currentColor" />
                            </div>
                          )}
                        </>
                      ) : (
                        asset.assetType === 'video' ? (
                          <Video className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <Image className="w-5 h-5 text-muted-foreground" />
                        )
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm line-clamp-1">{asset.title}</p>
                      {asset.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{asset.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {asset.assetType === 'video' ? (
                        <Video className="w-3 h-3 mr-1" />
                      ) : (
                        <Image className="w-3 h-3 mr-1" />
                      )}
                      {asset.assetType || 'unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm capitalize">
                      {getSourceIcon(asset.source)} {asset.source.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(asset.status)}>
                      {asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatFileSize(asset.fileSize)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {!isNaN(Date.parse(asset.createdAt)) ? new Date(asset.createdAt).toLocaleDateString() : 'Unknown'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedAsset(asset)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {asset.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setWorkflowAsset(asset);
                            setShowWorkflowDialog(true);
                          }}
                        >
                          <Tag className="w-4 h-4" />
                        </Button>
                      )}
                      {asset.fileUrl && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(asset.fileUrl, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {assets.length === 0 && !isFiltering && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No media assets found matching your criteria.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalAssets)} of {totalAssets} assets
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isFiltering}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
                    onClick={() => handlePageChange(pageNum)}
                    disabled={isFiltering}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isFiltering}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
        </TabsContent>

        <TabsContent value="s3-config" className="space-y-6">
          <S3BucketConfigManager onConfigChange={() => loadS3ConfigData()} />
        </TabsContent>
      </Tabs>

      {/* Modals - Use appropriate modal based on asset type */}
      {selectedAsset && (
        selectedAsset.assetType === 'video' ? (
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
        ) : selectedAsset.assetType === 'audio' ? (
          <AudioPreviewModal
            asset={selectedAsset}
            isOpen={!!selectedAsset}
            onClose={() => setSelectedAsset(null)}
          />
        ) : (
          <ImagePreviewModal
            asset={selectedAsset}
            isOpen={!!selectedAsset}
            onClose={() => setSelectedAsset(null)}
          />
        )
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