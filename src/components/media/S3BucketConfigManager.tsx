import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Trash2, RefreshCw, Clock, Wifi, WifiOff, Lock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { S3BucketConfigDialog } from './S3BucketConfigDialog';

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
  isReadOnly?: boolean; // For default config shown without auth
}

interface S3BucketConfigManagerProps {
  onConfigChange: () => void;
}

// Default Wasabi configuration - shown when no Supabase session exists
const DEFAULT_WASABI_CONFIG: S3BucketConfig = {
  id: 'default-wasabi',
  name: 'Wasabi Production (Default)',
  bucket_name: 'shortf-media',
  endpoint_url: 'https://s3.us-central-1.wasabisys.com',
  region: 'us-central-1',
  scan_frequency_hours: 24,
  last_scanned_at: null,
  is_active: true,
  created_at: new Date().toISOString(),
  isReadOnly: true,
};

export const S3BucketConfigManager: React.FC<S3BucketConfigManagerProps> = ({ onConfigChange }) => {
  const [configs, setConfigs] = useState<S3BucketConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useUser();
  const { isReady, hasValidSession } = useSupabaseAuth();

  useEffect(() => {
    // Wait for Supabase auth to be ready before loading
    if (isReady) {
      loadConfigs();
    }
  }, [user, isReady]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      
      // Check if we have a valid Supabase session for database operations
      const canAccessDatabase = hasValidSession();
      
      if (!canAccessDatabase) {
        // No valid session - show default config as read-only
        console.log('No valid Supabase session, showing default Wasabi config as read-only');
        setConfigs([DEFAULT_WASABI_CONFIG]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('s3_bucket_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading S3 configs:', error);
        // On error, fall back to default config
        setConfigs([DEFAULT_WASABI_CONFIG]);
        return;
      }

      // Auto-seed default Wasabi configuration if no configs exist
      if (!data || data.length === 0) {
        console.log('No S3 configs found, auto-seeding default Wasabi configuration...');
        
        const { data: newConfig, error: insertError } = await supabase
          .from('s3_bucket_configs')
          .insert({
            name: 'Wasabi Production (Default)',
            bucket_name: 'shortf-media',
            endpoint_url: 'https://s3.us-central-1.wasabisys.com',
            region: 'us-central-1',
            scan_frequency_hours: 24,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error auto-seeding default config:', insertError);
          // Fall back to showing read-only default
          setConfigs([DEFAULT_WASABI_CONFIG]);
        } else {
          console.log('Successfully auto-seeded default Wasabi config:', newConfig?.id);
          setConfigs([newConfig]);
          toast({
            title: "Default Configuration Added",
            description: "Wasabi S3 bucket configuration has been automatically set up.",
          });
        }
        return;
      }

      setConfigs(data || []);
    } catch (error: any) {
      console.error('Unexpected error loading configs:', error);
      // Fall back to default config on any error
      setConfigs([DEFAULT_WASABI_CONFIG]);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (configId: string) => {
    setScanningIds(prev => new Set(prev).add(configId));
    
    try {
      const { data, error } = await supabase.functions.invoke('scan-s3-buckets', {
        body: { bucketConfigId: configId, forceRescan: true }
      });

      if (error) throw error;

      // Handle the actual response data format
      const result = data as any;
      if (result?.success) {
        toast({
          title: "Scan Complete",
          description: `Found ${result.totalVideos} videos (${result.newVideos} new, ${result.updatedVideos} updated)`,
        });
      } else {
        throw new Error(result?.error || 'Scan failed');
      }

      // Refresh configs to show updated last_scanned_at
      setTimeout(() => {
        loadConfigs();
        onConfigChange();
      }, 1000);
    } catch (error: any) {
      console.error('Scan error:', error);
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to scan S3 bucket",
        variant: "destructive",
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
      // Only refresh S3 config data, not all media assets
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
    // Only refresh S3 config data, not all media assets
    onConfigChange();
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

      {!user && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Please log in to manage S3 bucket configurations.
            </p>
          </CardContent>
        </Card>
      )}

      {user && configs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No S3 bucket configurations found. Add one to start syncing your media assets.
            </p>
          </CardContent>
        </Card>
      ) : configs.length > 0 && (
        <div className="grid gap-4">
          {configs.map((config) => (
            <Card key={config.id} className={config.isReadOnly ? 'border-dashed' : ''}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{config.name}</CardTitle>
                      {config.isReadOnly && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Read-only
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {config.bucket_name} • {config.endpoint_url}
                    </p>
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
                    <div>
                      Last scan: {formatLastScanned(config.last_scanned_at)}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {config.isReadOnly ? (
                      <p className="text-xs text-muted-foreground italic">
                        Sign in to Supabase to manage configurations
                      </p>
                    ) : (
                      <>
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
                          {testingIds.has(config.id) ? 'Testing...' : 'Test Connection'}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleScan(config.id)}
                          disabled={scanningIds.has(config.id) || testingIds.has(config.id)}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${scanningIds.has(config.id) ? 'animate-spin' : ''}`} />
                          {scanningIds.has(config.id) ? 'Scanning...' : 'Scan Now'}
                        </Button>
                        
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
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};