import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Trash2, RefreshCw, Clock, Wifi, WifiOff, AlertCircle } from 'lucide-react';
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
      
      const canAccessDatabase = hasValidSession();
      
      if (!canAccessDatabase) {
        setError('Please log in to manage S3 bucket configurations.');
        setConfigs([]);
        setLoading(false);
        return;
      }
      
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      
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
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Scan failed with status ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result?.success) {
        toast({
          title: "Scan Complete",
          description: `Found ${result.totalMedia || 0} media files (${result.newMedia || 0} new, ${result.updatedMedia || 0} updated)`,
        });
      } else {
        throw new Error(result?.error || 'Scan failed');
      }

      setTimeout(() => {
        loadConfigs();
        onConfigChange();
      }, 1000);
    } catch (error: any) {
      console.error('Scan error:', error);
      const isTimeout = error.name === 'AbortError';
      toast({
        title: isTimeout ? "Scan Timeout" : "Scan Failed",
        description: isTimeout 
          ? "The scan is taking longer than expected. Check back shortly - it may still complete in the background."
          : (error.message || "Failed to scan S3 bucket"),
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
