import { supabase } from "@/integrations/supabase/client";

export interface SourceStats {
  source: string;
  count: number;
  status: 'healthy' | 'warning' | 'error';
  lastUpdated?: string;
  error?: string;
}

export interface SyncHealthStats {
  inSync: number;
  missingSfdc: number;
  missingFile: number;
  total: number;
}

export interface ContentOriginStats {
  youtube: number;
  aiGenerated: number;
  uploaded: number;
  audio: number;
  podcasts: number;
}

export interface WasabiMediaBreakdown {
  videos: number;
  images: number;
  total: number;
}

export interface AssetTypeStats {
  video: number;
  allImages: number;
  masters: number;
  variants: number;
  grids: number;
  standardImages: number;
}

export interface StatusStats {
  pending: number;
  approved: number;
  rejected: number;
  restricted: number;
}

export interface ApiConnectionStatus {
  isConnected: boolean;
  lastChecked: string;
  error?: string;
}

export interface MediaSourceStats {
  salesforce: SourceStats;
  s3Buckets: SourceStats[];
  databaseAssets: SourceStats;
  generatedVideos: SourceStats;
  totalCount: number;
  // New sync health stats
  syncHealth: SyncHealthStats;
  contentOrigin: ContentOriginStats;
  // API connection status
  salesforceApiStatus: ApiConnectionStatus;
  // Total library count (DB + Salesforce API)
  totalLibraryAssets: number;
  salesforceApiAssets: number;
  // Wasabi storage breakdown
  wasabiBreakdown: WasabiMediaBreakdown;
  // Filter-specific counts
  assetTypes: AssetTypeStats;
  statusCounts: StatusStats;
}

export const getMediaSourceStats = async (albumId?: string): Promise<MediaSourceStats> => {
  // Helper to add album filter to media_assets queries
  const withAlbumFilter = (query: any) => {
    if (albumId) return query.eq('album_id', albumId);
    return query;
  };

  const stats: MediaSourceStats = {
    salesforce: { source: 'Salesforce', count: 0, status: 'error' },
    s3Buckets: [],
    databaseAssets: { source: 'Database Assets', count: 0, status: 'healthy' },
    generatedVideos: { source: 'Generated Videos', count: 0, status: 'healthy' },
    totalCount: 0,
    syncHealth: { inSync: 0, missingSfdc: 0, missingFile: 0, total: 0 },
    contentOrigin: { youtube: 0, aiGenerated: 0, uploaded: 0, audio: 0, podcasts: 0 },
    salesforceApiStatus: { isConnected: false, lastChecked: new Date().toISOString() },
    totalLibraryAssets: 0,
    salesforceApiAssets: 0,
    wasabiBreakdown: { videos: 0, images: 0, total: 0 },
    assetTypes: { video: 0, allImages: 0, masters: 0, variants: 0, grids: 0, standardImages: 0 },
    statusCounts: { pending: 0, approved: 0, rejected: 0, restricted: 0 }
  };

  try {
    // Get Salesforce count and check API status
    try {
      const response = await fetch('https://api.realintelligence.com/api/wmc-content.py?orgId=00D5e000000HEcP&sandbox=False');
      if (response.ok) {
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const contentElements = xmlDoc.querySelectorAll('content');
        
        // Count YouTube and Audio content from Salesforce
        let youtubeFromSfdc = 0;
        let audioFromSfdc = 0;
        const audioTypes = ['mp3', 'wav', 'aac', 'flac', 'ogg', 'm4a', 'wma', 'audio'];
        contentElements.forEach((el) => {
          const contentType = el.querySelector('contenttype')?.textContent?.toLowerCase() || '';
          if (contentType === 'youtube') {
            youtubeFromSfdc++;
          }
          if (audioTypes.some(type => contentType.includes(type))) {
            audioFromSfdc++;
          }
        });
        
        stats.salesforce = {
          source: 'Salesforce',
          count: contentElements.length,
          status: 'healthy',
          lastUpdated: new Date().toISOString()
        };
        
        stats.salesforceApiStatus = {
          isConnected: true,
          lastChecked: new Date().toISOString()
        };
        
        // Add YouTube and Audio count from Salesforce to contentOrigin
        stats.contentOrigin.youtube += youtubeFromSfdc;
        stats.contentOrigin.audio += audioFromSfdc;
      } else {
        throw new Error('API unavailable');
      }
    } catch (error) {
      stats.salesforce = {
        source: 'Salesforce',
        count: 0,
        status: 'error',
        error: 'API endpoint unavailable'
      };
      stats.salesforceApiStatus = {
        isConnected: false,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }

    // Get S3 bucket stats
    const { data: bucketConfigs } = await supabase
      .from('s3_bucket_configs')
      .select('*')
      .eq('is_active', true);

    if (bucketConfigs) {
      for (const config of bucketConfigs) {
        // Count media assets from this bucket
        const baseQuery = supabase
          .from('media_assets')
          .select('*', { count: 'exact', head: true })
          .eq('source', 's3_bucket')
          .ilike('source_id', `%${config.bucket_name}%`);
        const { count, error } = await withAlbumFilter(baseQuery);

        stats.s3Buckets.push({
          source: `S3: ${config.name}`,
          count: count || 0,
          status: error ? 'error' : 'healthy',
          lastUpdated: config.last_scanned_at || undefined,
          error: error?.message
        });
      }
    }

    // Get database assets count (excluding generated videos)
    const { count: dbAssetsCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .neq('source', 'generated'));

    stats.databaseAssets = {
      source: 'Database Assets',
      count: dbAssetsCount || 0,
      status: 'healthy',
      lastUpdated: new Date().toISOString()
    };

    // Get generated videos count
    const { count: generatedCount } = await supabase
      .from('video_generations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    stats.generatedVideos = {
      source: 'Generated Videos',
      count: generatedCount || 0,
      status: 'healthy',
      lastUpdated: new Date().toISOString()
    };

    // Calculate sync health stats
    const { count: inSyncCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .not('salesforce_id', 'is', null)
      .not('file_url', 'is', null));

    const { count: missingSfdcCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .is('salesforce_id', null)
      .not('file_url', 'is', null));

    const { count: missingFileCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .not('salesforce_id', 'is', null)
      .is('file_url', null));

    stats.syncHealth = {
      inSync: inSyncCount || 0,
      missingSfdc: missingSfdcCount || 0,
      missingFile: missingFileCount || 0,
      total: (inSyncCount || 0) + (missingSfdcCount || 0) + (missingFileCount || 0)
    };

    // AI Generated: source = 'generated'
    const { count: aiGeneratedCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'generated'));

    // Uploaded: source = 'local_upload' OR source = 's3_bucket'
    const { count: uploadedCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .in('source', ['local_upload', 's3_bucket']));

    // Audio: check file_format for audio types
    const { count: audioCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .or('file_format.ilike.%mp3%,file_format.ilike.%wav%,file_format.ilike.%aac%,file_format.ilike.%m4a%,file_format.ilike.%audio%'));

    stats.contentOrigin.aiGenerated = aiGeneratedCount || 0;
    stats.contentOrigin.uploaded = uploadedCount || 0;
    stats.contentOrigin.audio += (audioCount || 0);

    // Podcasts
    const { count: podcastCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('asset_type', 'audio')
      .eq('metadata->>isPodcast', 'true'));

    stats.contentOrigin.podcasts = podcastCount || 0;

    // Get Wasabi (S3) breakdown by media type
    const { count: wasabiVideos } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('source', 's3_bucket')
      .eq('asset_type', 'video'));

    const { count: wasabiImages } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('source', 's3_bucket')
      .eq('asset_type', 'image'));

    stats.wasabiBreakdown = {
      videos: wasabiVideos || 0,
      images: wasabiImages || 0,
      total: (wasabiVideos || 0) + (wasabiImages || 0)
    };

    // Get S3 bucket totals more accurately
    const { count: totalS3Assets } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('source', 's3_bucket'));

    const { count: s3AllImages } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('source', 's3_bucket')
      .in('asset_type', ['image', 'master_image', 'image_variant', 'grid_variant', 'generation_master']));

    stats.wasabiBreakdown = {
      videos: wasabiVideos || 0,
      images: s3AllImages || wasabiImages || 0,
      total: totalS3Assets || ((wasabiVideos || 0) + (wasabiImages || 0))
    };

    // Get asset type counts
    const { count: videoCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('asset_type', 'video'));

    const { count: masterCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('asset_type', 'master_image'));

    const { count: imageVariantCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('asset_type', 'image_variant'));

    const { count: gridVariantCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('asset_type', 'grid_variant'));

    const { count: generationMasterCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('asset_type', 'generation_master'));

    const { count: standardImageCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('asset_type', 'image'));

    const variantsTotal = (imageVariantCount || 0) + (gridVariantCount || 0);
    const allImagesTotal = (masterCount || 0) + variantsTotal + (generationMasterCount || 0) + (standardImageCount || 0);

    stats.assetTypes = {
      video: videoCount || 0,
      allImages: allImagesTotal,
      masters: masterCount || 0,
      variants: variantsTotal,
      grids: generationMasterCount || 0,
      standardImages: standardImageCount || 0
    };

    // Get status counts
    const { count: pendingCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'));

    const { count: approvedCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved'));

    const { count: rejectedCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected'));

    const { count: restrictedCount } = await withAlbumFilter(supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'restricted'));

    stats.statusCounts = {
      pending: pendingCount || 0,
      approved: approvedCount || 0,
      rejected: rejectedCount || 0,
      restricted: restrictedCount || 0
    };

    // Calculate total
    stats.totalCount = stats.salesforce.count + 
                      stats.s3Buckets.reduce((sum, bucket) => sum + bucket.count, 0) +
                      stats.databaseAssets.count +
                      stats.generatedVideos.count;

    // Store Salesforce API asset count for display
    stats.salesforceApiAssets = stats.salesforce.count;
    
    // Total library assets = Database assets + Salesforce API assets (unique content from API)
    stats.totalLibraryAssets = stats.syncHealth.total + stats.salesforce.count;

  } catch (error) {
    console.error('Error fetching media source stats:', error);
  }

  return stats;
};

export const refreshS3BucketScan = async (bucketConfigId: string): Promise<void> => {
  try {
    // Use fetch with extended timeout (2 minutes) for large bucket scans
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
    
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    
    const response = await fetch(
      'https://vlwumuuolvxhiixqbnub.supabase.co/functions/v1/scan-s3-buckets',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsd3VtdXVvbHZ4aGlpeHFibnViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyNTg4NDgsImV4cCI6MjA3MjgzNDg0OH0.jjIqbaNQbYaHDmw1zJS-PC_wqviePfOtMtfv21K7x_Q'}`,
        },
        body: JSON.stringify({ bucketConfigId, forceRescan: true }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Scan failed with status ${response.status}`);
    }
  } catch (error) {
    console.error('Error scanning S3 bucket:', error);
    throw error;
  }
};