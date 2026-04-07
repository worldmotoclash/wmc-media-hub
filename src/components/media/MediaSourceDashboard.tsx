import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronRight, Youtube, Sparkles, Upload, Link2, Wifi, WifiOff, Music, CloudUpload, Video, Image, HardDrive } from 'lucide-react';
import { getMediaSourceStats, type MediaSourceStats } from '@/services/mediaSourceStatsService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

const MediaSourceDashboard: React.FC = () => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<MediaSourceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

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

  const handleSyncMissing = async () => {
    if (!stats || stats.syncHealth.missingSfdc === 0) return;
    
    setSyncing(true);
    try {
      // Fetch assets missing SFDC ID
      const { data: missingAssets, error } = await supabase
        .from('media_assets')
        .select('id')
        .is('salesforce_id', null)
        .not('file_url', 'is', null)
        .limit(50);

      if (error) throw error;
      if (!missingAssets || missingAssets.length === 0) {
        toast.info('No assets to sync');
        return;
      }

      toast.info(`Syncing ${missingAssets.length} assets to Salesforce...`);

      const { data, error: syncError } = await supabase.functions.invoke('sync-asset-to-salesforce', {
        body: { 
          assetIds: missingAssets.map(a => a.id),
          creatorContactId: user?.id  // Pass logged-in user's Salesforce Contact ID
        }
      });

      if (syncError) throw syncError;

      const successCount = data?.results?.filter((r: any) => r.success).length || 0;
      toast.success(`Synced ${successCount}/${missingAssets.length} assets to Salesforce`);
      
      // Refresh stats
      await loadStats();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync assets to Salesforce');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading sync health...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const { syncHealth, contentOrigin, salesforceApiStatus, wasabiBreakdown } = stats;
  const syncPercentage = syncHealth.total > 0 
    ? Math.round((syncHealth.inSync / syncHealth.total) * 100) 
    : 100;

  const hasIssues = syncHealth.missingSfdc > 0 || syncHealth.missingFile > 0;
  const filesCount = syncHealth.inSync + syncHealth.missingSfdc;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-6">
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-semibold">Sync Health</CardTitle>
                </div>
                {!isOpen && (
                  <div className="flex items-center gap-2 ml-2">
                    {hasIssues ? (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {syncHealth.missingSfdc + syncHealth.missingFile} issues
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        All synced
                      </Badge>
                    )}
                    <Badge variant="secondary" title="Files tracked in storage (has a file_url)">
                      {filesCount} files
                    </Badge>
                    {syncHealth.missingSfdc > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncMissing();
                        }}
                        disabled={syncing}
                      >
                        {syncing ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <CloudUpload className="h-3 w-3 mr-1" />
                        )}
                        Retry All ({syncHealth.missingSfdc})
                      </Button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* API Connection Status Indicator */}
                {salesforceApiStatus && (
                  <Badge 
                    variant="outline" 
                    className={salesforceApiStatus.isConnected 
                      ? "bg-green-500/10 text-green-600 border-green-500/20" 
                      : "bg-red-500/10 text-red-600 border-red-500/20"
                    }
                  >
                    {salesforceApiStatus.isConnected ? (
                      <>
                        <Wifi className="h-3 w-3 mr-1" />
                        SFDC API
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3 mr-1" />
                        SFDC Offline
                      </>
                    )}
                  </Badge>
                )}
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
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Sync Status Section */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Sync Status (SFDC ↔ Storage)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* In Sync */}
                <div className="border rounded-lg p-4 bg-green-500/5 border-green-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium text-sm">In Sync</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{syncHealth.inSync}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Assets with SFDC record & file
                  </p>
                </div>

                {/* Missing SFDC Record */}
                <div className={`border rounded-lg p-4 ${syncHealth.missingSfdc > 0 ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-muted/30 border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-5 w-5 ${syncHealth.missingSfdc > 0 ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                      <span className="font-medium text-sm">Missing SFDC</span>
                    </div>
                    <span className={`text-2xl font-bold ${syncHealth.missingSfdc > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                      {syncHealth.missingSfdc}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Files without Salesforce record
                  </p>
                  {syncHealth.missingSfdc > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={handleSyncMissing}
                      disabled={syncing}
                    >
                      {syncing ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <CloudUpload className="h-3 w-3 mr-1" />
                      )}
                      Sync to SFDC
                    </Button>
                  )}
                </div>

                {/* Missing File */}
                <div className={`border rounded-lg p-4 ${syncHealth.missingFile > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-muted/30 border-border'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <XCircle className={`h-5 w-5 ${syncHealth.missingFile > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                      <span className="font-medium text-sm">Missing File</span>
                    </div>
                    <span className={`text-2xl font-bold ${syncHealth.missingFile > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {syncHealth.missingFile}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    SFDC records without file
                  </p>
                </div>
              </div>

              {/* Sync Progress Bar */}
              {syncHealth.total > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Sync Rate</span>
                    <span className="text-xs font-medium">{syncPercentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${syncPercentage === 100 ? 'bg-green-500' : syncPercentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${syncPercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Wasabi Storage Section */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Wasabi Storage
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Videos */}
                <div className="border rounded-lg p-4 bg-blue-500/5 border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Video className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-sm">Videos</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">{wasabiBreakdown.videos}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    .mp4, .mov, .webm files
                  </p>
                </div>

                {/* Images */}
                <div className="border rounded-lg p-4 bg-emerald-500/5 border-emerald-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Image className="h-5 w-5 text-emerald-500" />
                      <span className="font-medium text-sm">Images</span>
                    </div>
                    <span className="text-2xl font-bold text-emerald-600">{wasabiBreakdown.images}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    .jpg, .png, .webp files
                  </p>
                </div>

                {/* Total */}
                <div className="border rounded-lg p-4 bg-violet-500/5 border-violet-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5 text-violet-500" />
                      <span className="font-medium text-sm">Total</span>
                    </div>
                    <span className="text-2xl font-bold text-violet-600">{wasabiBreakdown.total}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All media on Wasabi
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Content Origin Section */}
            <div>
              <h4 className="text-sm font-medium mb-3">Content Origin</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* YouTube */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Youtube className="h-5 w-5 text-red-500" />
                      <span className="font-medium text-sm">YouTube</span>
                    </div>
                    <span className="text-xl font-bold">{contentOrigin.youtube}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Embedded video content
                  </p>
                </div>

                {/* AI Generated */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      <span className="font-medium text-sm">AI Generated</span>
                    </div>
                    <span className="text-xl font-bold">{contentOrigin.aiGenerated}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Media Hub generated content
                  </p>
                </div>

                {/* Uploaded */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Upload className="h-5 w-5 text-blue-500" />
                      <span className="font-medium text-sm">Uploaded</span>
                    </div>
                    <span className="text-xl font-bold">{contentOrigin.uploaded}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Manual uploads to storage
                  </p>
                </div>

                {/* Audio */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Music className="h-5 w-5 text-orange-500" />
                      <span className="font-medium text-sm">Audio</span>
                    </div>
                    <span className="text-xl font-bold">{contentOrigin.audio}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    MP3 and audio files
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default MediaSourceDashboard;