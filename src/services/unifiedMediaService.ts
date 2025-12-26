import { supabase } from "@/integrations/supabase/client";
import { fetchVideoContent, searchVideoContent } from "./videoContentService";

export interface MediaAsset {
  id: string;
  title: string;
  description?: string;
  source: 'salesforce' | 's3_bucket' | 'youtube' | 'generated' | 'local_upload';
  sourceId?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  resolution?: string;
  fileFormat?: string;
  assetType?: 'video' | 'image' | string;
  status: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  tags: MediaTag[];
  activities: ContentActivity[];
  // Sync fields
  salesforceId?: string;
  syncStatus?: 'in_sync' | 'missing_sfdc' | 'missing_file' | 'unknown';
}

export interface MediaTag {
  id: string;
  name: string;
  description?: string;
  color: string;
}

export interface ContentActivity {
  id: string;
  action: string;
  details: Record<string, any>;
  performedBy?: string;
  createdAt: string;
}

export interface S3BucketConfig {
  id: string;
  name: string;
  bucketName: string;
  endpointUrl: string;
  isActive: boolean;
  lastScannedAt?: string;
  scanFrequencyHours: number;
}

export interface SearchFilters {
  sources?: string[];
  status?: string[];
  tags?: string[];
  assetTypes?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  fileFormats?: string[];
  // New filter types
  contentOrigin?: ('youtube' | 'ai_generated' | 'uploaded' | 'audio')[];
  syncStatus?: 'all' | 'in_sync' | 'missing_sfdc' | 'missing_file';
}

export interface SortOption {
  field: 'created_at' | 'title' | 'file_size' | 'asset_type' | 'source' | 'status';
  direction: 'asc' | 'desc';
}

// Sync status for an asset
export type SyncStatus = 'in_sync' | 'missing_sfdc' | 'missing_file' | 'unknown';

// Fetch all media assets with unified search
export async function fetchAllMediaAssets(
  searchQuery?: string,
  filters?: SearchFilters,
  limit = 50,
  offset = 0,
  sort?: SortOption
): Promise<{ assets: MediaAsset[]; total: number }> {
  try {
    // Determine sort field and direction
    const sortField = sort?.field || 'created_at';
    const sortAscending = sort?.direction === 'asc';

    // Build query for database assets
    let query = supabase
      .from('media_assets')
      .select(`
        *,
        media_asset_tags (
          media_tags (*)
        ),
        content_review_activities (*)
      `)
      .order(sortField, { ascending: sortAscending });

    // Apply contentOrigin filter (new architecture - takes precedence over sources)
    if (filters?.contentOrigin?.length) {
      const sourcesToInclude: string[] = [];
      
      if (filters.contentOrigin.includes('youtube')) {
        sourcesToInclude.push('youtube');
      }
      if (filters.contentOrigin.includes('ai_generated')) {
        sourcesToInclude.push('generated');
      }
      if (filters.contentOrigin.includes('uploaded')) {
        sourcesToInclude.push('local_upload', 's3_bucket');
      }
      
      if (sourcesToInclude.length > 0) {
        query = query.in('source', sourcesToInclude as any);
      }
    } else if (filters?.sources?.length) {
      // Legacy sources filter (fallback)
      query = query.in('source', filters.sources as any);
    }

    // Apply syncStatus filter
    if (filters?.syncStatus && filters.syncStatus !== 'all') {
      if (filters.syncStatus === 'in_sync') {
        query = query.not('salesforce_id', 'is', null).not('file_url', 'is', null);
      } else if (filters.syncStatus === 'missing_sfdc') {
        query = query.is('salesforce_id', null).not('file_url', 'is', null);
      } else if (filters.syncStatus === 'missing_file') {
        query = query.not('salesforce_id', 'is', null).is('file_url', null);
      }
    }

    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }

    if (filters?.assetTypes?.length) {
      query = query.in('asset_type', filters.assetTypes);
    }

    if (filters?.dateRange) {
      query = query
        .gte('created_at', filters.dateRange.start)
        .lte('created_at', filters.dateRange.end);
    }

    if (searchQuery) {
      query = query.ilike('title', `%${searchQuery}%`);
    }

    const { data: dbAssets, error, count } = await query
      .range(offset, offset + limit - 1)
      .returns<any[]>();

    if (error) {
      console.error('Error fetching database assets:', error);
      // Return empty array instead of throwing to allow page to still render
      return { assets: [], total: 0 };
    }

    // Transform database results
    const transformedAssets: MediaAsset[] = (dbAssets || []).map(transformDatabaseAsset);

    // Determine whether to fetch Salesforce content based on filters
    let salesforceAssets: MediaAsset[] = [];
    
    // Check if we should include Salesforce content based on contentOrigin or sources filters
    const shouldFetchSalesforce = (() => {
      if (filters?.contentOrigin?.length) {
        // If contentOrigin filter is active, only fetch if youtube is selected
        return filters.contentOrigin.includes('youtube');
      }
      // Legacy: fetch if no source filter or if salesforce/youtube/generated is included
      if (!filters?.sources?.length) return true;
      return filters.sources.includes('salesforce') || 
             filters.sources.includes('youtube') || 
             filters.sources.includes('generated');
    })();
    
    if (shouldFetchSalesforce) {
      try {
        const salesforceContent = await fetchVideoContent(undefined, searchQuery);
        const transformedSalesforceAssets = salesforceContent.map(transformSalesforceAsset);
        
        // Apply filters with AND logic between categories
        salesforceAssets = transformedSalesforceAssets;

        // Apply contentOrigin filter to Salesforce assets
        if (filters?.contentOrigin?.length) {
          salesforceAssets = salesforceAssets.filter(asset => {
            if (filters.contentOrigin!.includes('youtube') && asset.source === 'youtube') {
              return true;
            }
            if (filters.contentOrigin!.includes('ai_generated') && asset.status === 'Generated') {
              return true;
            }
            if (filters.contentOrigin!.includes('uploaded') && 
                asset.source === 'salesforce' && 
                asset.status !== 'Generated') {
              return true;
            }
            return false;
          });
        } else if (filters?.sources?.length) {
          // Legacy: Apply source filtering
          const selectedSources = filters.sources!;
          const realSources = selectedSources.filter(s => s !== 'generated');
          const requireGenerated = selectedSources.includes('generated');

          salesforceAssets = salesforceAssets.filter(asset => {
            const sourceMatch = realSources.length > 0 ? realSources.includes(asset.source) : true;
            const generatedMatch = requireGenerated ? asset.status === 'Generated' : true;
            return sourceMatch && generatedMatch;
          });
        }

        // Apply status filtering (AND with previous filters)
        if (filters?.status?.length) {
          salesforceAssets = salesforceAssets.filter(asset => 
            filters.status!.includes(asset.status)
          );
        }

        // Apply tag filtering (AND with previous filters)
        if (filters?.tags?.length) {
          salesforceAssets = salesforceAssets.filter(asset => 
            asset.tags.some(tag => filters.tags!.includes(tag.id) || filters.tags!.includes(tag.name))
          );
        }
      } catch (error) {
        console.warn('Failed to fetch Salesforce content:', error);
      }
    }

    // Combine and sort results
    const allAssets = [...transformedAssets, ...salesforceAssets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return {
      assets: allAssets,
      total: (count || 0) + salesforceAssets.length
    };

  } catch (error) {
    console.error('Error in fetchAllMediaAssets:', error);
    // Return empty result instead of throwing to prevent error toast
    return { assets: [], total: 0 };
  }
}

// Fetch recent media assets across all sources
export async function fetchRecentMediaAssets(limit = 10): Promise<MediaAsset[]> {
  const { assets } = await fetchAllMediaAssets(undefined, undefined, limit, 0);
  return assets;
}

// Get all available tags
export async function fetchMediaTags(): Promise<MediaTag[]> {
  const { data, error } = await supabase
    .from('media_tags')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching media tags:', error);
    throw error;
  }

  return data || [];
}

// Create a new tag
export async function createMediaTag(tag: Omit<MediaTag, 'id'>): Promise<MediaTag> {
  const { data, error } = await supabase
    .from('media_tags')
    .insert(tag)
    .select()
    .single();

  if (error) {
    console.error('Error creating media tag:', error);
    throw error;
  }

  return data;
}

// Update media asset tags
export async function updateMediaAssetTags(assetId: string, tagIds: string[]): Promise<void> {
  // Skip if this is a Salesforce asset (IDs start with 'sf_')
  if (assetId.startsWith('sf_')) {
    console.warn('Cannot update tags for Salesforce assets:', assetId);
    return;
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(assetId)) {
    console.error('Invalid UUID format for asset ID:', assetId);
    throw new Error(`Invalid UUID format: ${assetId}`);
  }

  // Remove existing tags
  await supabase
    .from('media_asset_tags')
    .delete()
    .eq('media_asset_id', assetId);

  // Add new tags
  if (tagIds.length > 0) {
    const tagRelations = tagIds.map(tagId => ({
      media_asset_id: assetId,
      tag_id: tagId
    }));

    const { error } = await supabase
      .from('media_asset_tags')
      .insert(tagRelations);

    if (error) {
      console.error('Error updating asset tags:', error);
      throw error;
    }
  }

  // Log activity
  await supabase
    .from('content_review_activities')
    .insert({
      media_asset_id: assetId,
      action: 'tagged',
      details: { tag_ids: tagIds }
    });
}

// Update media asset status
export async function updateMediaAssetStatus(assetId: string, status: string): Promise<void> {
  // Skip if this is a Salesforce asset (IDs start with 'sf_')
  if (assetId.startsWith('sf_')) {
    console.warn('Cannot update status for Salesforce assets:', assetId);
    return;
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(assetId)) {
    console.error('Invalid UUID format for asset ID:', assetId);
    throw new Error(`Invalid UUID format: ${assetId}`);
  }

  const { error } = await supabase
    .from('media_assets')
    .update({ 
      status, 
      approved_at: status === 'approved' ? new Date().toISOString() : null 
    })
    .eq('id', assetId);

  if (error) {
    console.error('Error updating asset status:', error);
    throw error;
  }

  // Log activity
  await supabase
    .from('content_review_activities')
    .insert({
      media_asset_id: assetId,
      action: status === 'approved' ? 'approved' : 'reviewed',
      details: { new_status: status }
    });
}

// Fetch S3 bucket configurations
export async function fetchS3BucketConfigs(): Promise<S3BucketConfig[]> {
  const { data, error } = await supabase
    .from('s3_bucket_configs')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching S3 bucket configs:', error);
    throw error;
  }

  return (data || []).map(config => ({
    id: config.id,
    name: config.name,
    bucketName: config.bucket_name,
    endpointUrl: config.endpoint_url,
    isActive: config.is_active,
    lastScannedAt: config.last_scanned_at,
    scanFrequencyHours: config.scan_frequency_hours
  }));
}

// Trigger S3 bucket scan
export async function scanS3Bucket(bucketConfigId: string, forceRescan = false): Promise<any> {
  const { data, error } = await supabase.functions.invoke('scan-s3-buckets', {
    body: { bucketConfigId, forceRescan }
  });

  if (error) {
    console.error('Error scanning S3 bucket:', error);
    throw error;
  }

  return data;
}

// Create SFDC record from media asset
export async function linkAssetToSalesforce(assetId: string, sfdcData: any): Promise<void> {
  // Log activity
  await supabase
    .from('content_review_activities')
    .insert({
      media_asset_id: assetId,
      action: 'linked_to_sfdc',
      details: { sfdc_data: sfdcData }
    });

  // Update asset metadata
  const { error } = await supabase
    .from('media_assets')
    .update({
      metadata: { ...sfdcData, linked_to_sfdc: true },
      status: 'approved'
    })
    .eq('id', assetId);

  if (error) {
    console.error('Error linking asset to Salesforce:', error);
    throw error;
  }
}

// Transform database asset to unified format
function transformDatabaseAsset(dbAsset: any): MediaAsset {
  // Determine sync status based on salesforce_id presence
  const hasSalesforceId = !!dbAsset.salesforce_id;
  const hasFileUrl = !!dbAsset.file_url;
  
  let syncStatus: MediaAsset['syncStatus'] = 'unknown';
  if (hasSalesforceId && hasFileUrl) {
    syncStatus = 'in_sync';
  } else if (!hasSalesforceId && hasFileUrl) {
    syncStatus = 'missing_sfdc';
  } else if (hasSalesforceId && !hasFileUrl) {
    syncStatus = 'missing_file';
  }

  return {
    id: dbAsset.id,
    title: dbAsset.title,
    description: dbAsset.description,
    source: dbAsset.source,
    sourceId: dbAsset.source_id,
    fileUrl: dbAsset.file_url,
    thumbnailUrl: dbAsset.thumbnail_url,
    duration: dbAsset.duration,
    fileSize: dbAsset.file_size,
    resolution: dbAsset.resolution,
    fileFormat: dbAsset.file_format,
    assetType: dbAsset.asset_type,
    status: dbAsset.status,
    metadata: dbAsset.metadata || {},
    createdAt: dbAsset.created_at,
    updatedAt: dbAsset.updated_at,
    tags: (dbAsset.media_asset_tags || []).map((rel: any) => rel.media_tags),
    activities: dbAsset.content_review_activities || [],
    salesforceId: dbAsset.salesforce_id,
    syncStatus
  };
}

// Transform Salesforce content to unified format
function transformSalesforceAsset(salesforceContent: any): MediaAsset {
  // Determine source based on content type
  const getSource = (contentType?: string): MediaAsset['source'] => {
    if (contentType === 'Youtube') return 'youtube';
    return 'salesforce';
  };

  // Determine asset type from content type
  const getAssetType = (contentType?: string): 'video' | 'image' | undefined => {
    if (!contentType) return undefined;
    const ct = contentType.toLowerCase();
    
    // Video types
    if (['mp4', 'm4v', 'mov', 'webm', 'mkv', 'avi', 'wmv', 'flv', 'mpeg', 'mpg', '3gp', 'youtube'].includes(ct)) {
      return 'video';
    }
    
    // Image types
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'svg', 'heic', 'heif'].includes(ct)) {
      return 'image';
    }
    
    return undefined;
  };

  // Convert duration string (e.g., "3:45") to seconds
  const parseDurationToSeconds = (duration: any): number | undefined => {
    if (typeof duration === 'number') return duration;
    if (typeof duration !== 'string') return undefined;
    
    const parts = duration.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2 && !parts.some(isNaN)) {
      return parts[0] * 60 + parts[1];
    }
    return undefined;
  };

  // Generate a valid ISO date
  const getValidDate = (dateString: any): string => {
    if (!dateString) return new Date().toISOString();
    
    // If it's already an ISO string, validate and use it
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    
    // Default to now for invalid dates
    return new Date().toISOString();
  };

  // Salesforce assets are always "in_sync" since they come from SFDC
  return {
    id: `sf_${salesforceContent.id}`,
    title: salesforceContent.title,
    description: salesforceContent.description,
    source: getSource(salesforceContent.contentType),
    sourceId: salesforceContent.id,
    fileUrl: salesforceContent.videoSrc,
    thumbnailUrl: salesforceContent.thumbnail,
    duration: parseDurationToSeconds(salesforceContent.duration),
    fileSize: undefined,
    resolution: undefined,
    fileFormat: salesforceContent.contentType?.toLowerCase() || 'mp4',
    assetType: getAssetType(salesforceContent.contentType),
    status: salesforceContent.status,
    metadata: {
      views: salesforceContent.views,
      youtube_id: salesforceContent.youtubeId,
      playlist_id: salesforceContent.playlistId,
      formatted_duration: salesforceContent.duration
    },
    createdAt: getValidDate(salesforceContent.createdAt),
    updatedAt: getValidDate(salesforceContent.updatedAt),
    tags: salesforceContent.tags?.map((tag: string) => ({
      id: `tag_${tag}`,
      name: tag,
      color: '#6366f1'
    })) || [],
    activities: [],
    salesforceId: salesforceContent.id,
    syncStatus: 'in_sync' // SFDC content is always synced
  };
}