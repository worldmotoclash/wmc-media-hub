import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, RefreshCw, Plus, Eye, Tag, ExternalLink, Video, Image, Play, ArrowUpDown, LayoutGrid, List, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Youtube, Sparkles, Upload, CheckCircle, AlertTriangle, Link2, Music, Info, SlidersHorizontal, ChevronDown, ChevronUp, Layers, Grid3x3, Mic, Pencil, Trash2, Clock, ArrowDownAZ, CloudUpload, ShieldCheck, Lock } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useUser } from "@/contexts/UserContext";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchAllMediaAssets,
  fetchMediaTags,
  fetchS3BucketConfigs,
  scanS3Bucket,
  fetchVariantCounts,
  fetchVariantsForMaster,
  deleteMediaAssets,
  getCdnUrl,
  MediaAsset,
  MediaTag,
  S3BucketConfig,
  SearchFilters,
  SortOption,
} from "@/services/unifiedMediaService";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MediaFilterDrawer } from "./MediaFilterDrawer";
import { getMediaSourceStats, MediaSourceStats } from "@/services/mediaSourceStatsService";
import { ASPECT_RATIOS } from "@/constants/salesforceFields";
import { supabase } from "@/integrations/supabase/client";
import { LibrarianWorkflowDialog } from "./LibrarianWorkflowDialog";
import VideoPreviewModal from "./VideoPreviewModal";
import ImagePreviewModal from "./ImagePreviewModal";
import AudioPreviewModal from "./AudioPreviewModal";
import MiniAudioPlayer from "./MiniAudioPlayer";
import MediaSourceDashboard from "./MediaSourceDashboard";
import { S3BucketConfigManager } from "./S3BucketConfigManager";
import { MediaNavigation } from "./MediaNavigation";
import { MediaAssetDetailsDrawer } from "./MediaAssetDetailsDrawer";
import { generateImageThumbnailFromUrl } from "@/utils/generateImageThumbnail";

interface MiniPlayerState {
  isOpen: boolean;
  audioUrl: string;
  title: string;
  source: string;
}

// Helper to check if asset type is any image variant
const isImageType = (assetType?: string) => {
  return ['image', 'master_image', 'image_variant', 'generation_master', 'grid_variant'].includes(assetType || '');
};

export const UnifiedMediaLibrary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [tags, setTags] = useState<MediaTag[]>([]);
  const [bucketConfigs, setBucketConfigs] = useState<S3BucketConfig[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [pendingSearch, setPendingSearch] = useState(initialSearch);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [workflowAsset, setWorkflowAsset] = useState<MediaAsset | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    excludeAssetTypes: ['image_variant', 'grid_variant'] // Hide variants by default
  });
  const [searchScope, setSearchScope] = useState<'all' | 'title' | 'title_desc' | 'filepath' | 'metadata'>('all');
  const [sortOption, setSortOption] = useState<SortOption>({ field: 'created_at', direction: 'desc' });
  const [isScanning, setIsScanning] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('library');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);
  const [brokenThumbnails, setBrokenThumbnails] = useState<Set<string>>(new Set());
  const [filterCounts, setFilterCounts] = useState<MediaSourceStats | null>(null);
  const [miniPlayer, setMiniPlayer] = useState<MiniPlayerState>({
    isOpen: false,
    audioUrl: '',
    title: '',
    source: '',
  });
  
  // Bulk selection state
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isBulkTagging, setIsBulkTagging] = useState(false);
  const [isBulkRenaming, setIsBulkRenaming] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [isBulkStatusUpdating, setIsBulkStatusUpdating] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkTagProgress, setBulkTagProgress] = useState({ current: 0, total: 0 });
  const [bulkRenameProgress, setBulkRenameProgress] = useState({ current: 0, total: 0 });
  
  // Details drawer state
  const [detailsAsset, setDetailsAsset] = useState<MediaAsset | null>(null);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  
  // Filter drawer state
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  
  // Album filter state
  const [albums, setAlbums] = useState<{ id: string; name: string; asset_count: number; source?: string; created_at?: string }[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('all');
  const [albumSortBy, setAlbumSortBy] = useState<'date' | 'name'>('name');
  
  // Variant expansion state
  const [hideVariants, setHideVariants] = useState(true);
  const [variantCounts, setVariantCounts] = useState<Map<string, number>>(new Map());
  const [expandedMasters, setExpandedMasters] = useState<Set<string>>(new Set());
  const [expandedVariants, setExpandedVariants] = useState<Map<string, MediaAsset[]>>(new Map());
  const [loadingVariants, setLoadingVariants] = useState<Set<string>>(new Set());
  
  // Client-side thumbnail cache for images missing thumbnailUrl
  const [thumbnailCache, setThumbnailCache] = useState<Map<string, string>>(new Map());
  const thumbnailQueueRef = useRef<Set<string>>(new Set());
  const activeThumbnailsRef = useRef(0);
  const MAX_CONCURRENT_THUMBNAILS = 3;

  const generateMissingThumbnail = useCallback((assetId: string, fileUrl: string) => {
    if (thumbnailQueueRef.current.has(assetId) || activeThumbnailsRef.current >= MAX_CONCURRENT_THUMBNAILS) return;
    thumbnailQueueRef.current.add(assetId);
    activeThumbnailsRef.current++;
    
    generateImageThumbnailFromUrl(fileUrl, 400, 0.7)
      .then(dataUrl => {
        setThumbnailCache(prev => new Map(prev).set(assetId, dataUrl));
      })
      .catch(() => {
        // CORS or load failure — fall back to fileUrl (will be handled by brokenThumbnails)
        setThumbnailCache(prev => new Map(prev).set(assetId, fileUrl));
      })
      .finally(() => {
        activeThumbnailsRef.current--;
      });
  }, []);

  // Queue thumbnail generation for visible image assets missing thumbnails
  useEffect(() => {
    assets.forEach(asset => {
      if (
        isImageType(asset.assetType) &&
        !asset.thumbnailUrl &&
        asset.fileUrl &&
        !thumbnailCache.has(asset.id) &&
        !thumbnailQueueRef.current.has(asset.id)
      ) {
        generateMissingThumbnail(asset.id, asset.fileUrl);
      }
    });
  }, [assets, thumbnailCache, generateMissingThumbnail]);

  const pageSize = 20;
  const { user, isEditor } = useUser();
  useSupabaseAuth(); // Ensure Supabase auth when user is logged in
  const navigate = useNavigate();

  // Keep searchQuery in sync with the URL (?search=...) - only react to external URL changes
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setSearchQuery(urlSearch);
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Removed searchQuery from deps to prevent circular updates during typing

  const toggleAssetSelection = (assetId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedAssetIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAssetIds.size === assets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(assets.map(a => a.id)));
    }
  };

  const clearSelection = () => {
    setSelectedAssetIds(new Set());
  };

  // Get selected assets that can be tagged (local assets with URLs)
  const getTaggableAssets = () => {
    return assets.filter(asset => 
      selectedAssetIds.has(asset.id) && 
      asset.source !== 'salesforce' &&
      asset.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) &&
      (asset.fileUrl || asset.thumbnailUrl)
    );
  };

  const handleBulkAutoTag = async () => {
    const taggableAssets = getTaggableAssets();
    if (taggableAssets.length === 0) {
      toast.error('No taggable assets selected', {
        description: 'Select local assets with valid URLs to auto-tag.'
      });
      return;
    }

    setIsBulkTagging(true);
    setBulkTagProgress({ current: 0, total: taggableAssets.length });
    
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < taggableAssets.length; i++) {
      const asset = taggableAssets[i];
      setBulkTagProgress({ current: i + 1, total: taggableAssets.length });

      try {
        const { data, error } = await supabase.functions.invoke('auto-tag-media-asset', {
          body: {
            assetId: asset.id,
            mediaUrl: asset.fileUrl || asset.thumbnailUrl,
            mediaType: asset.assetType === 'video' ? 'video' : 'image',
          }
        });

        if (error || !data?.success) {
          console.error(`Failed to tag ${asset.title}:`, error || data?.error);
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Error tagging ${asset.title}:`, err);
        failCount++;
      }
    }

    setIsBulkTagging(false);
    setBulkTagProgress({ current: 0, total: 0 });
    clearSelection();
    
    if (successCount > 0) {
      toast.success(`Successfully tagged ${successCount} asset${successCount > 1 ? 's' : ''}`, {
        description: failCount > 0 ? `${failCount} failed` : undefined
      });
      loadAssets();
    } else {
      toast.error('Failed to tag assets');
    }
  };
  const handleBulkRename = async () => {
    const taggableAssets = getTaggableAssets();
    if (taggableAssets.length === 0) {
      toast.error('No assets selected for renaming', {
        description: 'Select local assets with valid URLs to AI-rename.'
      });
      return;
    }

    setIsBulkRenaming(true);
    setBulkRenameProgress({ current: 0, total: taggableAssets.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < taggableAssets.length; i++) {
      const asset = taggableAssets[i];
      setBulkRenameProgress({ current: i + 1, total: taggableAssets.length });

      try {
        const { data, error } = await supabase.functions.invoke('auto-tag-media-asset', {
          body: {
            assetId: asset.id,
            mediaUrl: asset.fileUrl || asset.thumbnailUrl,
            mediaType: asset.assetType === 'video' ? 'video' : 'image',
            titleOnly: true,
          }
        });

        if (error || !data?.success) {
          console.error(`Failed to rename ${asset.title}:`, error || data?.error);
          failCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Error renaming ${asset.title}:`, err);
        failCount++;
      }
    }

    setIsBulkRenaming(false);
    setBulkRenameProgress({ current: 0, total: 0 });
    clearSelection();

    if (successCount > 0) {
      toast.success(`Renamed ${successCount} asset${successCount > 1 ? 's' : ''}`, {
        description: failCount > 0 ? `${failCount} failed` : undefined
      });
      loadAssets();
    } else {
      toast.error('Failed to rename assets');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedAssetIds);
    const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
    const deleteTargets = ids.map((id) => {
      const asset = assetMap.get(id);
      return asset
        ? {
            assetId: id,
            salesforceId: asset.salesforceId,
            fileUrl: asset.fileUrl,
          }
        : id;
    });

    setIsBulkDeleting(true);
    try {
      const { successCount, failCount } = await deleteMediaAssets(deleteTargets);
      if (successCount > 0) {
        toast.success(`Deleted ${successCount} asset${successCount > 1 ? 's' : ''}`, {
          description: failCount > 0 ? `${failCount} failed` : undefined
        });
        loadAssets();
      } else {
        toast.error('Failed to delete assets');
      }
    } catch {
      toast.error('Failed to delete assets');
    } finally {
      setIsBulkDeleting(false);
      setShowBulkDeleteConfirm(false);
      clearSelection();
    }
  };

  const handleBulkSyncSfdc = async () => {
    const unsyncedIds = Array.from(selectedAssetIds).filter(id => {
      const asset = assets.find(a => a.id === id);
      return asset && !asset.salesforceId;
    });
    if (unsyncedIds.length === 0) {
      toast.info('All selected assets already have SFDC records');
      return;
    }
    setIsBulkSyncing(true);
    try {
      toast.info(`Syncing ${unsyncedIds.length} assets to Salesforce...`);
      const { data, error } = await supabase.functions.invoke('sync-asset-to-salesforce', {
        body: { assetIds: unsyncedIds }
      });
      if (error) throw error;
      const successCount = data?.results?.filter((r: any) => r.success).length || 0;
      toast.success(`Synced ${successCount}/${unsyncedIds.length} assets to Salesforce`);
      loadAssets();
    } catch (error) {
      console.error('Bulk SFDC sync error:', error);
      toast.error('Failed to sync assets to Salesforce');
    } finally {
      setIsBulkSyncing(false);
    }
  };

  const handleBulkSetStatus = async (newStatus: 'Pending' | 'Approved' | 'Rejected' | 'Restricted') => {
    const ids = Array.from(selectedAssetIds);
    const syncableIds = ids.filter(id => {
      const asset = assets.find(a => a.id === id);
      return asset && asset.salesforceId;
    });
    const skipped = ids.length - syncableIds.length;

    if (syncableIds.length === 0) {
      toast.error('None of the selected assets are synced to Salesforce yet');
      return;
    }

    setIsBulkStatusUpdating(true);
    try {
      toast.info(`Setting ${syncableIds.length} asset${syncableIds.length > 1 ? 's' : ''} to ${newStatus}...`);
      const { data, error } = await supabase.functions.invoke('sync-asset-to-salesforce', {
        body: { assetIds: syncableIds, status: newStatus }
      });
      if (error) throw error;
      const successCount = data?.results?.filter((r: any) => r.success).length ?? syncableIds.length;
      toast.success(
        `Status updated to ${newStatus} for ${successCount}/${syncableIds.length} asset${syncableIds.length > 1 ? 's' : ''}`,
        { description: skipped > 0 ? `${skipped} skipped (not synced to SFDC)` : undefined }
      );
      loadAssets();
      loadFilterCounts();
    } catch (err) {
      console.error('Bulk status update error:', err);
      toast.error('Failed to update approval status');
    } finally {
      setIsBulkStatusUpdating(false);
    }
  };

  const handlePlayInBackground = (asset: MediaAsset) => {
    setMiniPlayer({
      isOpen: true,
      audioUrl: asset.fileUrl || '',
      title: asset.title,
      source: asset.source,
    });
  };

  const closeMiniPlayer = () => {
    setMiniPlayer(prev => ({ ...prev, isOpen: false }));
  };

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
      loadFilterCounts();
      loadAlbums();
    } else if (activeTab === 's3-config') {
      loadS3ConfigData();
    }
  }, [activeTab]);

  const loadFilterCounts = async (albumFilter?: string) => {
    try {
      const effectiveAlbumId = albumFilter !== undefined ? albumFilter : 
        (selectedAlbumId && selectedAlbumId !== 'all' ? selectedAlbumId : undefined);
      const stats = await getMediaSourceStats(effectiveAlbumId);
      setFilterCounts(stats);
    } catch (error) {
      console.error('Error loading filter counts:', error);
    }
  };

  const loadAlbums = async () => {
    try {
      const { data: allAlbums } = await supabase
        .from('media_albums')
        .select('id, name, asset_count, source, created_at')
        .order('created_at', { ascending: false });

      const { data: assetRows } = await supabase
        .from('media_assets')
        .select('album_id')
        .not('album_id', 'is', null);

      // Count assets per album
      const countMap = new Map<string, number>();
      (assetRows || []).forEach(row => {
        if (row.album_id) {
          countMap.set(row.album_id, (countMap.get(row.album_id) || 0) + 1);
        }
      });

      // Filter to non-empty albums with real counts
      const activeAlbums = (allAlbums || [])
        .map(a => ({ ...a, asset_count: countMap.get(a.id) || 0 }))
        .filter(a => a.asset_count > 0);

      setAlbums(activeAlbums);

      // Background: delete empty albums
      const emptyAlbums = (allAlbums || []).filter(a => !countMap.has(a.id));
      for (const album of emptyAlbums) {
        await supabase.from('media_albums').delete().eq('id', album.id);
      }
    } catch (error) {
      console.error('Error loading albums:', error);
    }
  };

  // Reset broken thumbnails when assets change
  useEffect(() => {
    setBrokenThumbnails(new Set());
  }, [searchQuery, filters, sortOption, currentPage]);

  const handleSearch = () => {
    setSearchQuery(pendingSearch);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (activeTab !== 'library') return;
    searchAssets();
    // Reload filter counts when album changes so sidebar numbers reflect the selected album
    const albumForStats = selectedAlbumId && selectedAlbumId !== 'all' ? selectedAlbumId : undefined;
    loadFilterCounts(albumForStats);
  }, [searchQuery, filters, sortOption, activeTab, currentPage, searchScope, selectedAlbumId]);

  // Fetch variant counts on mount
  useEffect(() => {
    fetchVariantCounts().then(setVariantCounts);
  }, []);

  // Toggle hide variants - update filter
  const toggleHideVariants = () => {
    const newHideVariants = !hideVariants;
    setHideVariants(newHideVariants);
    setFilters(prev => ({
      ...prev,
      excludeAssetTypes: newHideVariants ? ['image_variant', 'grid_variant'] : undefined
    }));
  };

  // Get variant count for an asset (checks both UUID and Salesforce ID)
  const getVariantCount = (asset: MediaAsset): number => {
    let count = variantCounts.get(asset.id) || 0;
    if (asset.salesforceId) {
      count = Math.max(count, variantCounts.get(asset.salesforceId) || 0);
    }
    return count;
  };

  // Toggle expand/collapse variants for a master asset
  const toggleExpandVariants = async (asset: MediaAsset) => {
    const masterId = asset.id;
    
    if (expandedMasters.has(masterId)) {
      // Collapse
      setExpandedMasters(prev => {
        const newSet = new Set(prev);
        newSet.delete(masterId);
        return newSet;
      });
    } else {
      // Expand - fetch variants if not cached
      if (!expandedVariants.has(masterId)) {
        setLoadingVariants(prev => new Set(prev).add(masterId));
        const variants = await fetchVariantsForMaster(masterId, asset.salesforceId);
        setExpandedVariants(prev => new Map(prev).set(masterId, variants));
        setLoadingVariants(prev => {
          const newSet = new Set(prev);
          newSet.delete(masterId);
          return newSet;
        });
      }
      setExpandedMasters(prev => new Set(prev).add(masterId));
    }
  };

  // Check if asset is a master type that can have variants
  const isMasterType = (assetType?: string) => {
    return ['master_image', 'generation_master', 'image'].includes(assetType || '');
  };

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
      const filtersWithScope: SearchFilters = {
        ...filters,
        searchScope,
        albumId: selectedAlbumId && selectedAlbumId !== 'all' ? selectedAlbumId : undefined,
      };
      const { assets: assetsData, total } = await fetchAllMediaAssets(searchQuery, filtersWithScope, pageSize, offset, sortOption);
      
      setAssets(assetsData);
      setTotalAssets(total);
      
      // Sync search query to URL
      if (searchQuery) {
        setSearchParams({ search: searchQuery }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    } catch (error) {
      console.error('Error searching assets:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to search media assets';
      toast.error(errorMessage);
      setAssets([]);
      setTotalAssets(0);
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

  // Handler for batch filter updates from the filter drawer
  const handleBatchFilterChange = (newFilters: SearchFilters) => {
    setCurrentPage(1);
    setFilters(newFilters);
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
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
      case 'ready': return 'bg-green-600 text-white border-green-700';
      case 'pending': return 'bg-yellow-600 text-white border-yellow-700';
      case 'rejected': return 'bg-red-600 text-white border-red-700';
      case 'restricted': return 'bg-orange-600 text-white border-orange-700';
      default: return 'bg-gray-600 text-white border-gray-700';
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
        {user?.mediaHubAccess === 'Admin' && <MediaSourceDashboard />}
      
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
          {user?.mediaHubAccess === 'Admin' && <TabsTrigger value="s3-config">S3 Configuration</TabsTrigger>}
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
                {/* Search Scope Dropdown */}
                <Select
                  value={searchScope}
                  onValueChange={(value: 'all' | 'title' | 'title_desc' | 'filepath' | 'metadata') => setSearchScope(value)}
                >
                  <SelectTrigger className="w-[160px] bg-background">
                    <SelectValue placeholder="All Fields" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border shadow-lg z-50">
                    <SelectItem value="all">All Fields</SelectItem>
                    <SelectItem value="title">Title Only</SelectItem>
                    <SelectItem value="title_desc">Title + Description</SelectItem>
                    <SelectItem value="filepath">File Path</SelectItem>
                    <SelectItem value="metadata">Metadata Only</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex-1 min-w-[200px] flex gap-2">
                  <Input
                    placeholder="Search media… (press Enter)"
                    value={pendingSearch}
                    onChange={(e) => setPendingSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    className="w-full"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    name="media-search-nofill"
                    data-1p-ignore
                    data-lpignore="true"
                  />
                  <Button onClick={handleSearch} size="icon" variant="outline" title="Search">
                    <Search className="w-4 h-4" />
                  </Button>
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
                    <SelectItem value="created_at-desc">Created (Newest first)</SelectItem>
                    <SelectItem value="created_at-asc">Created (Oldest first)</SelectItem>
                    <SelectItem value="title-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="title-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="file_size-desc">Size (Largest first)</SelectItem>
                    <SelectItem value="file_size-asc">Size (Smallest first)</SelectItem>
                    <SelectItem value="asset_type-asc">Type (Image first)</SelectItem>
                    <SelectItem value="asset_type-desc">Type (Video first)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Album Filter */}
                {albums.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Select value={selectedAlbumId} onValueChange={(v) => { setSelectedAlbumId(v); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[180px] bg-background">
                        <Layers className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Album" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border shadow-lg z-50">
                        <SelectItem value="all">All Albums</SelectItem>
                        {[...albums].sort((a, b) => {
                          if (albumSortBy === 'name') return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
                          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                        }).map(a => (
                          <SelectItem key={a.id} value={a.id}>
                            <span className="flex items-center gap-1.5">
                              {a.name} ({a.asset_count})
                              {a.source === 'auto' && <Badge variant="outline" className="text-[10px] px-1 py-0 leading-tight">Auto</Badge>}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      title={albumSortBy === 'date' ? 'Sorted by date — click for A-Z' : 'Sorted A-Z — click for date'}
                      onClick={() => setAlbumSortBy(prev => prev === 'date' ? 'name' : 'date')}
                    >
                      {albumSortBy === 'date' ? <Clock className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
                    </Button>
                  </div>
                )}

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

                <Button variant="outline" onClick={() => {
                  clearFilters();
                  setSearchScope('all');
                }}>
                  Clear Filters
                </Button>
              </div>

              {/* Results Summary - prominent counter */}
              <div className="flex items-center justify-between text-sm bg-muted/50 px-4 py-3 rounded-lg border mt-3">
                <span className="font-medium">
                  {isFiltering ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Searching...
                    </span>
                  ) : searchQuery ? (
                    <span>
                      Found <span className="text-primary font-bold text-base">{totalAssets}</span> result{totalAssets !== 1 ? 's' : ''} for "<span className="text-primary font-semibold">{searchQuery}</span>"
                      {searchScope !== 'all' && (
                        <Badge variant="secondary" className="ml-2">
                          {searchScope === 'title' ? 'Title Only' : 
                           searchScope === 'title_desc' ? 'Title + Description' : 
                           searchScope === 'filepath' ? 'File Path' : 'Metadata'}
                        </Badge>
                      )}
                    </span>
                  ) : (
                    <span><span className="font-bold text-base text-primary">{totalAssets}</span> total assets</span>
                  )}
                </span>
                {searchQuery && totalAssets === 0 && !isFiltering && (
                  <span className="text-destructive font-medium">
                    No matches found - check spelling
                  </span>
                )}
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
                  <label htmlFor="type-video" className="text-sm flex items-center justify-between flex-1">
                    <span className="flex items-center"><Video className="w-4 h-4 mr-1.5" /> Video</span>
                    <span className="text-muted-foreground text-xs">{filterCounts?.assetTypes?.video ?? '—'}</span>
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
                        handleFilterChange('assetTypes', [...currentTypes, 'image', 'master_image', 'image_variant', 'grid_variant', 'generation_master']);
                      } else {
                        handleFilterChange('assetTypes', currentTypes);
                      }
                    }}
                  />
                  <label htmlFor="type-image" className="text-sm flex items-center justify-between flex-1">
                    <span className="flex items-center"><Image className="w-4 h-4 mr-1.5" /> Image</span>
                    <span className="text-muted-foreground text-xs">{filterCounts?.assetTypes?.allImages ?? '—'}</span>
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
                  <label htmlFor="type-master" className="text-sm text-muted-foreground flex items-center justify-between flex-1">
                    <span>Masters</span>
                    <span className="text-xs">{filterCounts?.assetTypes?.masters ?? '—'}</span>
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
                  <label htmlFor="type-variant" className="text-sm text-muted-foreground flex items-center justify-between flex-1">
                    <span>Variants</span>
                    <span className="text-xs">{filterCounts?.assetTypes?.variants ?? '—'}</span>
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
                  <label htmlFor="type-grid" className="text-sm text-muted-foreground flex items-center justify-between flex-1">
                    <span className="flex items-center gap-1"><LayoutGrid className="w-3 h-3" /> 3x3 Grids</span>
                    <span className="text-xs">{filterCounts?.assetTypes?.grids ?? '—'}</span>
                  </label>
                </div>
                
                {/* Standard images (sub-option) - plain 'image' type */}
                <div className="min-h-8 flex items-center space-x-2 pl-6">
                  <Checkbox
                    id="type-standard-image"
                    checked={filters.assetTypes?.includes('image') || false}
                    onCheckedChange={(checked) => {
                      const currentTypes = (filters.assetTypes || []).filter(t => t !== 'image');
                      if (checked) {
                        handleFilterChange('assetTypes', [...currentTypes, 'image']);
                      } else {
                        handleFilterChange('assetTypes', currentTypes);
                      }
                    }}
                  />
                  <label htmlFor="type-standard-image" className="text-sm text-muted-foreground flex items-center justify-between flex-1">
                    <span>Standard</span>
                    <span className="text-xs">{filterCounts?.assetTypes?.standardImages ?? '—'}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Aspect Ratio Filter */}
            <div className="space-y-2 mt-3">
              <label className="text-sm font-medium block">Aspect Ratio</label>
              <Select
                value={filters.aspectRatio || 'all'}
                onValueChange={(v) => handleFilterChange('aspectRatio', v === 'all' ? undefined : v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All ratios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {ASPECT_RATIOS.map(r => (
                    <SelectItem key={r} value={r}>{r.replace('x', ':')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <label htmlFor="origin-youtube" className="text-sm flex items-center justify-between flex-1">
                    <span className="flex items-center gap-1.5"><Youtube className="w-4 h-4 text-red-500" /> YouTube</span>
                    <span className="text-muted-foreground text-xs">{filterCounts?.contentOrigin?.youtube ?? '—'}</span>
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
                  <label htmlFor="origin-ai-generated" className="text-sm flex items-center justify-between flex-1">
                    <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-purple-500" /> AI Generated</span>
                    <span className="text-muted-foreground text-xs">{filterCounts?.contentOrigin?.aiGenerated ?? '—'}</span>
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
                  <label htmlFor="origin-uploaded" className="text-sm flex items-center justify-between flex-1">
                    <span className="flex items-center gap-1.5"><Upload className="w-4 h-4 text-blue-500" /> Uploaded</span>
                    <span className="text-muted-foreground text-xs">{filterCounts?.contentOrigin?.uploaded ?? '—'}</span>
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
                  <label htmlFor="origin-audio" className="text-sm flex items-center justify-between flex-1">
                    <span className="flex items-center gap-1.5"><Music className="w-4 h-4 text-orange-500" /> Audio</span>
                    <span className="text-muted-foreground text-xs">{filterCounts?.contentOrigin?.audio ?? '—'}</span>
                  </label>
                </div>
                
                {/* Podcasts */}
                <div className="min-h-8 flex items-center space-x-2">
                  <Checkbox
                    id="origin-podcast"
                    checked={filters.contentOrigin?.includes('podcast') || false}
                    onCheckedChange={(checked) => {
                      const current = filters.contentOrigin || [];
                      if (checked) {
                        handleFilterChange('contentOrigin', [...current, 'podcast']);
                      } else {
                        handleFilterChange('contentOrigin', current.filter(o => o !== 'podcast'));
                      }
                    }}
                  />
                  <label htmlFor="origin-podcast" className="text-sm flex items-center justify-between flex-1">
                    <span className="flex items-center gap-1.5"><Mic className="w-4 h-4 text-pink-500" /> Podcasts</span>
                    <span className="text-muted-foreground text-xs">{filterCounts?.contentOrigin?.podcasts ?? '—'}</span>
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
                    <label htmlFor="sync-in-sync" className="text-sm flex items-center justify-between flex-1">
                      <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> In Sync</span>
                      <span className="text-muted-foreground text-xs">{filterCounts?.syncHealth?.inSync ?? '—'}</span>
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
                    <label htmlFor="sync-missing-sfdc" className="text-sm flex items-center justify-between flex-1">
                      <span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-yellow-500" /> Missing SFDC</span>
                      <span className="text-muted-foreground text-xs">{filterCounts?.syncHealth?.missingSfdc ?? '—'}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <div className="space-y-1">
                {['pending', 'approved', 'rejected', 'restricted'].map(status => (
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
                    <label htmlFor={status} className="text-sm capitalize flex items-center justify-between flex-1">
                      <span>{status}</span>
                      <span className="text-muted-foreground text-xs">
                        {filterCounts?.statusCounts?.[status as keyof typeof filterCounts.statusCounts] ?? '—'}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* SFDC Filters Button */}
            <div className="space-y-3">
              <label className="text-sm font-medium mb-2 block">Salesforce Filters</label>
              <Button
                variant="outline"
                onClick={() => setShowFilterDrawer(true)}
                className="w-full flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  SFDC Metadata
                </div>
                {((filters.categories?.length || 0) +
                  (filters.contentTypes?.length || 0) +
                  (filters.locations?.length || 0) +
                  (filters.moods?.length || 0)) > 0 && (
                  <Badge variant="secondary">
                    {(filters.categories?.length || 0) +
                      (filters.contentTypes?.length || 0) +
                      (filters.locations?.length || 0) +
                      (filters.moods?.length || 0)}
                  </Badge>
                )}
              </Button>
              
              {/* Hide/Show Variants Toggle */}
              <Button
                variant={hideVariants ? "secondary" : "outline"}
                onClick={toggleHideVariants}
                className="w-full flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  {hideVariants ? "Show Variants" : "Hide Variants"}
                </div>
                {!hideVariants && (
                  <Badge variant="secondary">Showing</Badge>
                )}
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      {selectedAssetIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-4 z-20 bg-primary text-primary-foreground rounded-lg p-4 shadow-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedAssetIds.size === assets.length}
              onCheckedChange={toggleSelectAll}
              className="border-primary-foreground data-[state=checked]:bg-primary-foreground data-[state=checked]:text-primary"
            />
            <span className="font-medium">
              {selectedAssetIds.size} asset{selectedAssetIds.size > 1 ? 's' : ''} selected
            </span>
            {isBulkTagging && (
              <span className="text-sm opacity-80">
                Tagging {bulkTagProgress.current}/{bulkTagProgress.total}...
              </span>
            )}
            {isBulkRenaming && (
              <span className="text-sm opacity-80">
                Renaming {bulkRenameProgress.current}/{bulkRenameProgress.total}...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkAutoTag}
              disabled={isBulkTagging || isBulkRenaming || getTaggableAssets().length === 0}
              className="flex items-center gap-2"
            >
              {isBulkTagging ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Tagging...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Auto-Tag ({getTaggableAssets().length})
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkRename}
              disabled={isBulkTagging || isBulkRenaming || getTaggableAssets().length === 0}
              className="flex items-center gap-2"
            >
              {isBulkRenaming ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Renaming...
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" />
                  AI Rename ({getTaggableAssets().length})
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkSyncSfdc}
              disabled={isBulkTagging || isBulkRenaming || isBulkDeleting || isBulkSyncing}
              className="flex items-center gap-2"
            >
              {isBulkSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  Sync to SFDC
                </>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isBulkTagging || isBulkRenaming || isBulkDeleting || isBulkStatusUpdating}
                  className="flex items-center gap-2"
                >
                  {isBulkStatusUpdating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Set Status
                      <ChevronDown className="w-3 h-3" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover z-50">
                <DropdownMenuItem onClick={() => handleBulkSetStatus('Pending')}>Pending</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkSetStatus('Approved')}>Approved</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkSetStatus('Rejected')}>Rejected</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkSetStatus('Restricted')}>
                  <Lock className="w-3.5 h-3.5 mr-2" />
                  Restricted
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isEditor() && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
                disabled={isBulkTagging || isBulkRenaming || isBulkDeleting}
                className="flex items-center gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                <Trash2 className="w-4 h-4" />
                Delete ({selectedAssetIds.size})
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={isBulkTagging || isBulkRenaming || isBulkDeleting}
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              Clear
            </Button>
          </div>
        </motion.div>
      )}

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
              <Card className={`group hover:shadow-lg transition-all duration-200 cursor-pointer ${selectedAssetIds.has(asset.id) ? 'ring-2 ring-primary' : ''}`}>
                <div className="relative cursor-pointer" onClick={() => { setDetailsAsset(asset); setShowDetailsDrawer(true); }}>
                  {/* Selection Checkbox */}
                  <div 
                    className={`absolute top-2 left-2 z-10 transition-opacity ${selectedAssetIds.size > 0 || 'opacity-0 group-hover:opacity-100'}`}
                    onClick={(e) => toggleAssetSelection(asset.id, e)}
                  >
                    <div className="w-6 h-6 rounded bg-background/90 backdrop-blur-sm border flex items-center justify-center">
                      <Checkbox
                        checked={selectedAssetIds.has(asset.id)}
                        onCheckedChange={() => {}}
                        className="pointer-events-none"
                      />
                    </div>
                  </div>
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
                  ) : (asset.thumbnailUrl && asset.thumbnailUrl.trim() !== '') || asset.fileUrl ? (
                    <div className="relative">
                    <img
                        src={brokenThumbnails.has(asset.id) 
                          ? '/placeholder.svg' 
                          : isImageType(asset.assetType)
                            ? (asset.thumbnailUrl || thumbnailCache.get(asset.id) || '/placeholder.svg')
                            : (asset.thumbnailUrl && asset.thumbnailUrl.trim() !== '' 
                                ? asset.thumbnailUrl 
                                : asset.fileUrl)}
                        alt={asset.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                        onError={(e) => {
                          if (!brokenThumbnails.has(asset.id)) {
                            setBrokenThumbnails(prev => new Set(prev).add(asset.id));
                          }
                        }}
                        style={{ display: brokenThumbnails.has(asset.id) && asset.assetType === 'video' ? 'none' : 'block' }}
                      />
                      {asset.assetType === 'video' && !brokenThumbnails.has(asset.id) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                          <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20">
                            <Play className="w-7 h-7 text-gray-900 ml-1" fill="currentColor" />
                          </div>
                        </div>
                      )}
                      {/* Video icon fallback when thumbnail is broken */}
                      {asset.assetType === 'video' && brokenThumbnails.has(asset.id) && (
                        <div className="w-full h-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-lg flex items-center justify-center relative">
                          <Video className="w-16 h-16 text-slate-500" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20">
                              <Play className="w-7 h-7 text-gray-900 ml-1" fill="currentColor" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-slate-800 to-slate-900 rounded-t-lg flex items-center justify-center relative">
                      {asset.assetType === 'video' ? (
                        <>
                          <Video className="w-16 h-16 text-slate-500" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20">
                              <Play className="w-7 h-7 text-gray-900 ml-1" fill="currentColor" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <span className="text-4xl">{getSourceIcon(asset.source)}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-10 flex gap-1 flex-wrap">
                    {/* Asset Type Badge - with distinct colors for different types */}
                    {asset.assetType === 'image_variant' ? (
                      <Badge className="text-xs bg-purple-600/90 text-white border-0">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Variant
                      </Badge>
                    ) : asset.assetType === 'grid_variant' ? (
                      <Badge className="text-xs bg-blue-600/90 text-white border-0">
                        <Grid3x3 className="w-3 h-3 mr-1" />
                        Grid
                      </Badge>
                    ) : asset.assetType === 'master_image' ? (
                      <Badge className="text-xs bg-green-600/90 text-white border-0">
                        <Image className="w-3 h-3 mr-1" />
                        Master
                      </Badge>
                    ) : asset.assetType === 'generation_master' ? (
                      <Badge className="text-xs bg-amber-600/90 text-white border-0">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI Gen
                      </Badge>
                    ) : asset.assetType === 'audio' && asset.metadata?.isPodcast ? (
                      <Badge className="text-xs bg-pink-600/90 text-white border-0">
                        <Mic className="w-3 h-3 mr-1" />
                        Podcast
                      </Badge>
                    ) : (
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
                    )}
                    {/* Content Origin Badge */}
                    {getContentOriginIcon(asset.source, asset.fileFormat) && (
                      <Badge variant="secondary" className="text-xs px-1.5">
                        {getContentOriginIcon(asset.source, asset.fileFormat)}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Variant Count Badge - show on masters with variants */}
                  {isMasterType(asset.assetType) && getVariantCount(asset) > 0 && (
                    <Badge 
                      variant="outline" 
                      className="absolute bottom-2 left-2 bg-purple-500/90 text-white border-0 cursor-pointer hover:bg-purple-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandVariants(asset);
                      }}
                    >
                      <Layers className="w-3 h-3 mr-1" />
                      {getVariantCount(asset)} variants
                    </Badge>
                  )}
                  
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
                    <div className="flex items-center gap-3 flex-wrap">
                      {asset.fileSize && (
                        <span>{formatFileSize(asset.fileSize)}</span>
                      )}
                      {asset.duration && asset.assetType === 'video' && (
                        <span>• {formatDuration(asset.duration)}</span>
                      )}
                      {asset.resolution && (
                        <span>• {asset.resolution}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Uploaded: {(() => {
                        const dateStr = asset.metadata?.last_modified || asset.createdAt;
                        return !isNaN(Date.parse(dateStr)) ? new Date(dateStr).toLocaleDateString() : 'Unknown';
                      })()}</span>
                      {asset.syncStatus && getSyncStatusBadge(asset.syncStatus)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDetailsAsset(asset);
                        setShowDetailsDrawer(true);
                      }}
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                    
                    {asset.status !== 'approved' && asset.status !== 'ready' && (
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
                    
                    {(() => {
                      const cdnUrl = getCdnUrl(asset);
                      return cdnUrl ? (
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          title="Open file in new tab"
                        >
                          <a
                            href={cdnUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      ) : null;
                    })()}
                  </div>
                  
                  {/* Expand/Collapse Variants Button */}
                  {isMasterType(asset.assetType) && getVariantCount(asset) > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-muted-foreground hover:text-foreground"
                      onClick={() => toggleExpandVariants(asset)}
                      disabled={loadingVariants.has(asset.id)}
                    >
                      {loadingVariants.has(asset.id) ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                          Loading...
                        </>
                      ) : expandedMasters.has(asset.id) ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Hide {getVariantCount(asset)} variants
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Show {getVariantCount(asset)} variants
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              {/* Expanded Variants Panel */}
              {expandedMasters.has(asset.id) && expandedVariants.get(asset.id) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 p-3 bg-muted/30 rounded-lg border"
                >
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Variants of "{asset.title.slice(0, 30)}{asset.title.length > 30 ? '...' : ''}"
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {expandedVariants.get(asset.id)?.map(variant => (
                      <Card 
                        key={variant.id} 
                        className="p-2 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedAsset(variant)}
                      >
                        <div className="relative">
                          <img 
                            src={variant.thumbnailUrl || thumbnailCache.get(variant.id) || '/placeholder.svg'} 
                            alt={variant.title}
                            className="w-full h-16 object-cover rounded"
                          />
                          <Badge 
                            className={`absolute top-1 left-1 text-[10px] px-1 py-0 ${
                              variant.assetType === 'image_variant' 
                                ? 'bg-purple-600/90 text-white border-0' 
                                : 'bg-blue-600/90 text-white border-0'
                            }`}
                          >
                            {variant.assetType === 'image_variant' ? 'Social' : 'Grid'}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs truncate">{variant.title}</div>
                        {variant.resolution && (
                          <div className="text-[10px] text-muted-foreground">{variant.resolution}</div>
                        )}
                        {/* View Master Link */}
                        {(variant.metadata?.masterAssetId || asset.salesforceId) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full mt-1 h-6 text-[10px] text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              const masterId = asset.salesforceId || variant.metadata?.masterAssetId;
                              if (masterId) {
                                window.open(`https://worldwidemediaconsortium.lightning.force.com/lightning/r/WMC_Master_Content__c/${masterId}/view`, '_blank');
                              }
                            }}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            View Master in SFDC
                          </Button>
                        )}
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        /* Results - List View */
        <Card className={`transition-opacity ${isFiltering ? 'opacity-50' : ''}`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedAssetIds.size === assets.length && assets.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                
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
                <TableHead className="w-20">Duration</TableHead>
                <TableHead 
                  className="w-32 cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => setSortOption(prev => ({ 
                    field: 'created_at', 
                    direction: prev.field === 'created_at' && prev.direction === 'desc' ? 'asc' : 'desc' 
                  }))}
                >
                  <div className="flex items-center gap-1">
                    Uploaded
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
                <TableRow 
                  key={asset.id} 
                  className={`cursor-pointer hover:bg-muted/50 ${selectedAssetIds.has(asset.id) ? 'bg-primary/5' : ''}`}
                >
                  <TableCell onClick={(e) => toggleAssetSelection(asset.id, e)}>
                    <Checkbox
                      checked={selectedAssetIds.has(asset.id)}
                      onCheckedChange={() => {}}
                      className="pointer-events-none"
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{asset.title}</p>
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
                    {asset.duration ? formatDuration(asset.duration) : '–'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(() => {
                      const dateStr = asset.metadata?.last_modified || asset.createdAt;
                      return !isNaN(Date.parse(dateStr)) ? new Date(dateStr).toLocaleDateString() : 'Unknown';
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDetailsAsset(asset);
                          setShowDetailsDrawer(true);
                        }}
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
                      {(() => {
                        const cdnUrl = getCdnUrl(asset);
                        return cdnUrl ? (
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            title="Open file in new tab"
                          >
                            <a
                              href={cdnUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        ) : null;
                      })()}
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
            {/* Go to First Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1 || isFiltering}
              title="Go to first page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            {/* Previous Page */}
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
            {/* Next Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isFiltering}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            {/* Go to Last Page */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || isFiltering}
              title="Go to last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
        </TabsContent>

        {user?.mediaHubAccess === 'Admin' && (
          <TabsContent value="s3-config" className="space-y-6">
            <S3BucketConfigManager onConfigChange={() => loadS3ConfigData()} />
          </TabsContent>
        )}
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
              tags: selectedAsset.tags.map(t => t.name),
              youtubeId: selectedAsset.metadata?.youtube_id as string | undefined,
              contentType: selectedAsset.source === 'youtube' ? 'Youtube' : undefined
            }}
            isOpen={!!selectedAsset}
            onClose={() => setSelectedAsset(null)}
            onVideoUpdated={() => {
              loadAssets();
              setSelectedAsset(null);
            }}
          />
        ) : selectedAsset.assetType === 'audio' ? (
          <AudioPreviewModal
            asset={selectedAsset}
            isOpen={!!selectedAsset}
            onClose={() => setSelectedAsset(null)}
            onPlayInBackground={handlePlayInBackground}
          />
        ) : (
          <ImagePreviewModal
            asset={selectedAsset}
            isOpen={!!selectedAsset}
            onClose={() => setSelectedAsset(null)}
            onAssetUpdated={() => {
              loadAssets();
              setSelectedAsset(null);
            }}
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

      {/* Mini Audio Player */}
      <MiniAudioPlayer
        audioUrl={miniPlayer.audioUrl}
        title={miniPlayer.title}
        source={miniPlayer.source}
        isOpen={miniPlayer.isOpen}
        onClose={closeMiniPlayer}
      />

      {/* Media Asset Details Drawer */}
      <MediaAssetDetailsDrawer
        asset={detailsAsset}
        open={showDetailsDrawer}
        onOpenChange={setShowDetailsDrawer}
        onPreview={(asset) => {
          setShowDetailsDrawer(false);
          setSelectedAsset(asset);
        }}
        onAssetUpdated={async () => {
          await loadAssets();
          loadFilterCounts();
          // Refresh the drawer's asset from the updated list
          if (detailsAsset) {
            const { assets: refreshed } = await fetchAllMediaAssets();
            const updated = refreshed.find(a => a.id === detailsAsset.id);
            if (updated) setDetailsAsset(updated);
          }
        }}
      />

      {/* SFDC Filter Drawer */}
      <MediaFilterDrawer
        open={showFilterDrawer}
        onOpenChange={setShowFilterDrawer}
        filters={filters}
        onFilterChange={handleBatchFilterChange}
        availableTags={tags}
      />

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedAssetIds.size} asset{selectedAssetIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected assets and their tag associations will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={isBulkDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isBulkDeleting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </div>
  );
};