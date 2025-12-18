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
}

export const getMediaSourceStats = async (): Promise<MediaSourceStats> => {
  const stats: MediaSourceStats = {
    salesforce: { source: 'Salesforce', count: 0, status: 'error' },
    s3Buckets: [],
    databaseAssets: { source: 'Database Assets', count: 0, status: 'healthy' },
    generatedVideos: { source: 'Generated Videos', count: 0, status: 'healthy' },
    totalCount: 0,
    syncHealth: { inSync: 0, missingSfdc: 0, missingFile: 0, total: 0 },
    contentOrigin: { youtube: 0, aiGenerated: 0, uploaded: 0 },
    salesforceApiStatus: { isConnected: false, lastChecked: new Date().toISOString() }
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
        
        // Count YouTube content from Salesforce
        let youtubeFromSfdc = 0;
        contentElements.forEach((el) => {
          const contentType = el.querySelector('contenttype')?.textContent;
          if (contentType === 'Youtube') {
            youtubeFromSfdc++;
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
        
        // Add YouTube count from Salesforce to contentOrigin
        stats.contentOrigin.youtube += youtubeFromSfdc;
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
        const { count, error } = await supabase
          .from('media_assets')
          .select('*', { count: 'exact', head: true })
          .eq('source', 's3_bucket')
          .ilike('source_id', `%${config.bucket_name}%`);

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
    const { count: dbAssetsCount } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .neq('source', 'generated');

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
    // In Sync: has salesforce_id AND has file_url
    const { count: inSyncCount } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .not('salesforce_id', 'is', null)
      .not('file_url', 'is', null);

    // Missing SFDC: has file_url but no salesforce_id
    const { count: missingSfdcCount } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .is('salesforce_id', null)
      .not('file_url', 'is', null);

    // Missing File: has salesforce_id but no file_url
    const { count: missingFileCount } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .not('salesforce_id', 'is', null)
      .is('file_url', null);

    stats.syncHealth = {
      inSync: inSyncCount || 0,
      missingSfdc: missingSfdcCount || 0,
      missingFile: missingFileCount || 0,
      total: (inSyncCount || 0) + (missingSfdcCount || 0) + (missingFileCount || 0)
    };

    // Calculate content origin stats
    // YouTube: source = 'youtube'
    const { count: youtubeCount } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'youtube');

    // AI Generated: source = 'generated'
    const { count: aiGeneratedCount } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'generated');

    // Uploaded: source = 'local_upload' OR source = 's3_bucket'
    const { count: uploadedCount } = await supabase
      .from('media_assets')
      .select('*', { count: 'exact', head: true })
      .in('source', ['local_upload', 's3_bucket']);

    stats.contentOrigin = {
      youtube: youtubeCount || 0,
      aiGenerated: aiGeneratedCount || 0,
      uploaded: uploadedCount || 0
    };

    // Calculate total
    stats.totalCount = stats.salesforce.count + 
                      stats.s3Buckets.reduce((sum, bucket) => sum + bucket.count, 0) +
                      stats.databaseAssets.count +
                      stats.generatedVideos.count;

  } catch (error) {
    console.error('Error fetching media source stats:', error);
  }

  return stats;
};

export const refreshS3BucketScan = async (bucketConfigId: string): Promise<void> => {
  try {
    const { error } = await supabase.functions.invoke('scan-s3-buckets', {
      body: { bucketConfigId, forceRescan: true }
    });
    
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error scanning S3 bucket:', error);
    throw error;
  }
};