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
  status: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  tags: MediaTag[];
  activities: ContentActivity[];
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
  dateRange?: {
    start: string;
    end: string;
  };
  fileFormats?: string[];
}

// Fetch all media assets with unified search
export async function fetchAllMediaAssets(
  searchQuery?: string,
  filters?: SearchFilters,
  limit = 50,
  offset = 0
): Promise<{ assets: MediaAsset[]; total: number }> {
  try {
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
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.sources?.length) {
      query = query.in('source', filters.sources as any);
    }

    if (filters?.status?.length) {
      query = query.in('status', filters.status);
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
      throw error;
    }

    // Transform database results
    const transformedAssets: MediaAsset[] = (dbAssets || []).map(transformDatabaseAsset);

    // Fetch Salesforce content if no source filter or salesforce/youtube/generated is included
    let salesforceAssets: MediaAsset[] = [];
    const includesSalesforce = !filters?.sources?.length || filters.sources.includes('salesforce');
    const includesYoutube = !filters?.sources?.length || filters.sources.includes('youtube');
    const includesGenerated = !filters?.sources?.length || filters.sources.includes('generated');
    
    if (includesSalesforce || includesYoutube || includesGenerated) {
      try {
        const salesforceContent = await fetchVideoContent(undefined, searchQuery);
        const transformedSalesforceAssets = salesforceContent.map(transformSalesforceAsset);
        
        // Apply source filtering to transformed assets
        if (filters?.sources?.length) {
          salesforceAssets = transformedSalesforceAssets.filter(asset => {
            // Include if the asset's source is in the selected sources
            if (filters.sources!.includes(asset.source)) {
              return true;
            }
            // Also include if 'generated' is selected and this asset has Generated status
            if (filters.sources!.includes('generated') && asset.status === 'Generated') {
              return true;
            }
            return false;
          });
        } else {
          salesforceAssets = transformedSalesforceAssets;
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
    throw error;
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
    status: dbAsset.status,
    metadata: dbAsset.metadata || {},
    createdAt: dbAsset.created_at,
    updatedAt: dbAsset.updated_at,
    tags: (dbAsset.media_asset_tags || []).map((rel: any) => rel.media_tags),
    activities: dbAsset.content_review_activities || []
  };
}

// Transform Salesforce content to unified format
function transformSalesforceAsset(salesforceContent: any): MediaAsset {
  // Determine source based on content type
  const getSource = (contentType?: string): MediaAsset['source'] => {
    if (contentType === 'Youtube') return 'youtube';
    return 'salesforce';
  };

  return {
    id: `sf_${salesforceContent.id}`,
    title: salesforceContent.title,
    description: salesforceContent.description,
    source: getSource(salesforceContent.contentType),
    sourceId: salesforceContent.id,
    fileUrl: salesforceContent.videoSrc,
    thumbnailUrl: salesforceContent.thumbnail,
    duration: salesforceContent.duration,
    fileSize: undefined,
    resolution: undefined,
    fileFormat: 'mp4',
    status: salesforceContent.status,
    metadata: {
      views: salesforceContent.views,
      youtube_id: salesforceContent.youtubeId,
      playlist_id: salesforceContent.playlistId
    },
    createdAt: salesforceContent.uploadedAt,
    updatedAt: salesforceContent.uploadedAt,
    tags: salesforceContent.tags?.map((tag: string) => ({
      id: `tag_${tag}`,
      name: tag,
      color: '#6366f1'
    })) || [],
    activities: []
  };
}