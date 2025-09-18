import { supabase } from "@/integrations/supabase/client";

export interface SourceStats {
  source: string;
  count: number;
  status: 'healthy' | 'warning' | 'error';
  lastUpdated?: string;
  error?: string;
}

export interface MediaSourceStats {
  salesforce: SourceStats;
  s3Buckets: SourceStats[];
  databaseAssets: SourceStats;
  generatedVideos: SourceStats;
  totalCount: number;
}

export const getMediaSourceStats = async (): Promise<MediaSourceStats> => {
  const stats: MediaSourceStats = {
    salesforce: { source: 'Salesforce', count: 0, status: 'error' },
    s3Buckets: [],
    databaseAssets: { source: 'Database Assets', count: 0, status: 'healthy' },
    generatedVideos: { source: 'Generated Videos', count: 0, status: 'healthy' },
    totalCount: 0
  };

  try {
    // Get Salesforce count
    try {
      const response = await fetch('https://api.realintelligence.com/api/wmc-content.py');
      if (response.ok) {
        const data = await response.json();
        stats.salesforce = {
          source: 'Salesforce',
          count: Array.isArray(data) ? data.length : 0,
          status: 'healthy',
          lastUpdated: new Date().toISOString()
        };
      } else {
        throw new Error('API unavailable');
      }
    } catch (error) {
      stats.salesforce = {
        source: 'Salesforce',
        count: 0,
        status: 'error',
        error: 'API endpoint unavailable - using demo data'
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