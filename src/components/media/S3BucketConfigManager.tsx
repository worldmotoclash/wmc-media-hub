import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Trash2, RefreshCw, Clock } from 'lucide-react';
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
  const [scanningIds, setScanningIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useUser();
  useSupabaseAuth(); // Ensure Supabase auth when user is logged in

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      if (!user) {
        setConfigs([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('s3_bucket_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('S3 config loading error:', error);
        throw error;
      }
      setConfigs(data || []);
    } catch (error: any) {
      console.error('Failed to load S3 bucket configurations:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load S3 bucket configurations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (configId: string) => {
    setScanningIds(prev => new Set(prev).add(configId));
    
    try {
      const { error } = await supabase.functions.invoke('scan-s3-buckets', {
        body: { bucketConfigId: configId, forceRescan: true }
      });

      if (error) throw error;

      toast({
        title: "Scan Started",
        description: "S3 bucket scan initiated successfully",
      });

      // Refresh configs to show updated last_scanned_at
      setTimeout(() => {
        loadConfigs();
        // Only refresh S3 config data, not all media assets
        onConfigChange();
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message || "Failed to start S3 bucket scan",
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

      {configs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              No S3 bucket configurations found. Add one to start syncing your media assets.
            </p>
          </CardContent>
        </Card>
      ) : (
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
                    <div>
                      Last scan: {formatLastScanned(config.last_scanned_at)}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleScan(config.id)}
                      disabled={scanningIds.has(config.id)}
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${scanningIds.has(config.id) ? 'animate-spin' : ''}`} />
                      {scanningIds.has(config.id) ? 'Scanning...' : 'Scan Now'}
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{config.name}"? This will stop scanning this bucket but won't delete existing media assets.
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