import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, Database, Cloud, Cpu, HardDrive, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { getMediaSourceStats, refreshS3BucketScan, type MediaSourceStats, type SourceStats } from '@/services/mediaSourceStatsService';
import { toast } from 'sonner';

const MediaSourceDashboard: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<MediaSourceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const mediaStats = await getMediaSourceStats();
      setStats(mediaStats);
    } catch (error) {
      console.error('Error loading media stats:', error);
      toast.error('Failed to load media statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
    toast.success('Statistics refreshed');
  };

  const handleS3Scan = async (bucketConfigId: string, bucketName: string) => {
    try {
      await refreshS3BucketScan(bucketConfigId);
      toast.success(`Scanning ${bucketName} bucket initiated`);
      setTimeout(() => loadStats(), 2000); // Refresh stats after scan
    } catch (error) {
      toast.error(`Failed to scan ${bucketName} bucket`);
    }
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: SourceStats['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: SourceStats['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const formatLastUpdated = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading media statistics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-6">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <CardTitle className="text-lg font-semibold">Media Sources Overview</CardTitle>
                {!isOpen && stats && (
                  <Badge variant="secondary" className="ml-2">
                    {stats.totalCount} total
                  </Badge>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefresh();
                }}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Salesforce */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="font-medium text-sm">{stats.salesforce.source}</span>
              {getStatusIcon(stats.salesforce.status)}
            </div>
            <div className="text-2xl font-bold">{stats.salesforce.count}</div>
            <Badge variant="outline" className={getStatusColor(stats.salesforce.status)}>
              {stats.salesforce.status}
            </Badge>
            {stats.salesforce.error && (
              <p className="text-xs text-muted-foreground">{stats.salesforce.error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Updated: {formatLastUpdated(stats.salesforce.lastUpdated)}
            </p>
          </div>

          {/* Database Assets */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <HardDrive className="h-4 w-4 text-purple-500" />
              <span className="font-medium text-sm">{stats.databaseAssets.source}</span>
              {getStatusIcon(stats.databaseAssets.status)}
            </div>
            <div className="text-2xl font-bold">{stats.databaseAssets.count}</div>
            <Badge variant="outline" className={getStatusColor(stats.databaseAssets.status)}>
              {stats.databaseAssets.status}
            </Badge>
            <p className="text-xs text-muted-foreground">
              Updated: {formatLastUpdated(stats.databaseAssets.lastUpdated)}
            </p>
          </div>

          {/* Generated Videos */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Cpu className="h-4 w-4 text-green-500" />
              <span className="font-medium text-sm">{stats.generatedVideos.source}</span>
              {getStatusIcon(stats.generatedVideos.status)}
            </div>
            <div className="text-2xl font-bold">{stats.generatedVideos.count}</div>
            <Badge variant="outline" className={getStatusColor(stats.generatedVideos.status)}>
              {stats.generatedVideos.status}
            </Badge>
            <p className="text-xs text-muted-foreground">
              Updated: {formatLastUpdated(stats.generatedVideos.lastUpdated)}
            </p>
          </div>

          {/* Total Count */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-sm">Total Videos</span>
            </div>
            <div className="text-2xl font-bold text-primary">{stats.totalCount}</div>
            <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
              aggregate
            </Badge>
            <p className="text-xs text-muted-foreground">
              Across all sources
            </p>
          </div>
        </div>

        {/* S3 Buckets */}
        {stats.s3Buckets.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center">
                <Cloud className="h-4 w-4 mr-2 text-orange-500" />
                S3/Wasabi Buckets
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.s3Buckets.map((bucket, index) => (
                  <div key={index} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{bucket.source}</span>
                        {getStatusIcon(bucket.status)}
                      </div>
                      <div className="text-lg font-bold">{bucket.count}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={getStatusColor(bucket.status)}>
                        {bucket.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleS3Scan('bucket-id', bucket.source.replace('S3: ', ''))}
                      >
                        Scan
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last scan: {formatLastUpdated(bucket.lastUpdated)}
                    </p>
                    {bucket.error && (
                      <p className="text-xs text-red-600">{bucket.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default MediaSourceDashboard;