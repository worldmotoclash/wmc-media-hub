import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Trash2, RefreshCw, Clock, Wifi, WifiOff, AlertCircle, Pencil, Globe, Link } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { S3BucketConfigDialog } from './S3BucketConfigDialog';
import { S3BucketConfigEditDialog } from './S3BucketConfigEditDialog';

interface S3BucketConfig {
  id: string;
  name: string;
  bucket_name: string;
  endpoint_url: string;
  region: string;
  scan_frequency_hours: number;
  last_scanned_at: string | null;
  is_active: boolean;
  created_at: string;
  cdn_base_url: string | null;
}

interface S3BucketConfigManagerProps {
  onConfigChange: () => void;
}

export const S3BucketConfigManager: React.FC<S3BucketConfigManagerProps> = ({ onConfigChange }) => {
  const [configs, setConfigs] = useState<S3BucketConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());
  const [editingConfig, setEditingConfig] = useState<S3BucketConfig | null>(null);
  const { toast } = useToast();
  const { user } = useUser();
  const { isReady, hasValidSession } = useSupabaseAuth();

  useEffect(() => {
    if (isReady) {
      loadConfigs();
    }
  }, [user, isReady]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // SELECT is public - no auth needed for reads
      const { data, error: fetchError } = await supabase
        .from('s3_bucket_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error loading S3 configs:', fetchError);
        setError(`Failed to load configurations: ${fetchError.message}`);
        setConfigs([]);
        return;
      }

      setConfigs(data || []);
    } catch (err: any) {
      console.error('Unexpected error loading configs:', err);
      setError(`Unexpected error: ${err.message}`);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (configId: string) => {
    setScanningIds(prev => new Set(prev).add(configId));

    try {
      // Short timeout since the scan now runs in the background
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

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
          body: JSON.stringify({ bucketConfigId: configId, forceRescan: true }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      const payload = await response.json().catch(() => ({} as any));

      if (response.status === 202) {
        toast({
          title: 'Scan Started',
          description: 'Scanning is running in the background. The Last scan timestamp will update shortly.',
        });

        // Refresh soon (and again later) to pick up last_scanned_at updates.
        setTimeout(() => {
          loadConfigs();
          onConfigChange();
        }, 3000);

        setTimeout(() => {
          loadConfigs();
          onConfigChange();
        }, 15000);

        return;
      }

      if (!response.ok) {
        throw new Error(payload?.error || `Scan failed with status ${response.status}`);
      }

      if (payload?.success) {
        toast({
          title: 'Scan Complete',
          description: `Found ${payload.totalMedia || 0} media files (${payload.newMedia || 0} new, ${payload.updatedMedia || 0} updated)`,
        });
      } else {
        throw new Error(payload?.error || 'Scan failed');
      }

      setTimeout(() => {
        loadConfigs();
        onConfigChange();
      }, 1000);
    } catch (error: any) {
      console.error('Scan error:', error);
      const isTimeout = error.name === 'AbortError';
      toast({
        title: isTimeout ? 'Scan Start Timeout' : 'Scan Failed',
        description: isTimeout
          ? 'Scan start request timed out. Please try again.'
          : (error.message || 'Failed to scan S3 bucket'),
        variant: 'destructive',
      });
    } finally {
      setScanningIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(configId);
        return newSet;
      });
    }
  };

  const handleTestConnection = async (configId: string) => {
    setTestingIds(prev => new Set(prev).add(configId));
    
    try {
      const { data, error } = await supabase.functions.invoke('test-s3-connection', {
        body: { bucketConfigId: configId }
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Connection Test Successful",
          description: "S3 bucket is accessible and ready for scanning",
        });
      } else {
        toast({
          title: "Connection Test Failed", 
          description: result?.error || "Unable to connect to S3 bucket",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Connection test error:', error);
      toast({
        title: "Connection Test Failed",
        description: error.message || "Failed to test S3 connection",
        variant: "destructive",
      });
    } finally {
      setTestingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(configId);
        return newSet;
      });
    }
  };

  const handleDelete = async (configId: string) => {
    try {
      const { error } = await supabase
        .from('s3_bucket_configs')
        .delete()
        .eq('id', configId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "S3 bucket configuration deleted",
      });

      loadConfigs();
      onConfigChange();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete configuration",
        variant: "destructive",
      });
    }
  };

  const handleConfigAdded = () => {
    loadConfigs();
    onConfigChange();
  };

  const handleRegenerateCdnUrls = async (config: S3BucketConfig) => {
    if (!config.cdn_base_url) {
      toast({
        title: "CDN URL Not Set",
        description: "Please set a CDN Base URL first by editing the bucket configuration.",
        variant: "destructive",
      });
      return;
    }

    setRegeneratingIds(prev => new Set(prev).add(config.id));

    try {
      // Get all assets from this bucket
      const { data: assets, error: fetchError } = await supabase
        .from('media_assets')
        .select('id, file_url, s3_key')
        .eq('source', 's3_bucket')
        .ilike('source_id', `%${config.bucket_name}%`);

      if (fetchError) throw fetchError;

      if (!assets || assets.length === 0) {
        toast({
          title: "No Assets Found",
          description: "No assets found for this bucket to update.",
        });
        return;
      }

      // Update each asset's file_url to use CDN
      let updated = 0;
      for (const asset of assets) {
        if (asset.s3_key) {
          const newUrl = `${config.cdn_base_url}/${asset.s3_key}`;
          if (asset.file_url !== newUrl) {
            const { error: updateError } = await supabase
              .from('media_assets')
              .update({ file_url: newUrl })
              .eq('id', asset.id);
            
            if (!updateError) updated++;
          }
        }
      }

      toast({
        title: "CDN URLs Updated",
        description: `Updated ${updated} of ${assets.length} assets to use CDN URL.`,
      });

      onConfigChange();
    } catch (error: any) {
      console.error('Regenerate CDN URLs error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate CDN URLs",
        variant: "destructive",
      });
    } finally {
      setRegeneratingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(config.id);
        return newSet;
      });
    }
  };

  const formatLastScanned = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return <div>Loading S3 configurations...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">S3 Bucket Configurations</h3>
        <S3BucketConfigDialog onConfigAdded={handleConfigAdded} />
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!error && configs.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No S3 bucket configurations found. Add one to start syncing your media assets.
            </p>
          </CardContent>
        </Card>
      )}

      {configs.length > 0 && (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{config.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {config.bucket_name} • {config.endpoint_url}
                    </p>
                    {config.cdn_base_url && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-primary">
                        <Globe className="w-3 h-3" />
                        <span>CDN: {config.cdn_base_url}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant={config.is_active ? "default" : "secondary"}>
                    {config.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Scans every {config.scan_frequency_hours}h
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Last scan: {formatLastScanned(config.last_scanned_at)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => handleScan(config.id)}
                        disabled={scanningIds.has(config.id) || testingIds.has(config.id)}
                      >
                        <RefreshCw className={`w-3 h-3 ${scanningIds.has(config.id) ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingConfig(config)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestConnection(config.id)}
                      disabled={testingIds.has(config.id)}
                    >
                      {testingIds.has(config.id) ? (
                        <WifiOff className="w-4 h-4 mr-2 animate-pulse" />
                      ) : (
                        <Wifi className="w-4 h-4 mr-2" />
                      )}
                      {testingIds.has(config.id) ? 'Testing...' : 'Test'}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleScan(config.id)}
                      disabled={scanningIds.has(config.id) || testingIds.has(config.id)}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${scanningIds.has(config.id) ? 'animate-spin' : ''}`} />
                      {scanningIds.has(config.id) ? 'Scanning...' : 'Scan'}
                    </Button>

                    {config.cdn_base_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRegenerateCdnUrls(config)}
                        disabled={regeneratingIds.has(config.id)}
                        title="Update all existing assets to use CDN URL"
                      >
                        <Link className={`w-4 h-4 mr-2 ${regeneratingIds.has(config.id) ? 'animate-spin' : ''}`} />
                        {regeneratingIds.has(config.id) ? 'Updating...' : 'Apply CDN'}
                      </Button>
                    )}
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this S3 bucket configuration? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(config.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <S3BucketConfigEditDialog
        config={editingConfig}
        open={!!editingConfig}
        onOpenChange={(open) => !open && setEditingConfig(null)}
        onConfigUpdated={() => {
          loadConfigs();
          onConfigChange();
        }}
      />
    </div>
  );
};
