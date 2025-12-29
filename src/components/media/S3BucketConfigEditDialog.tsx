import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Globe } from 'lucide-react';

interface S3BucketConfig {
  id: string;
  name: string;
  bucket_name: string;
  endpoint_url: string;
  region: string;
  scan_frequency_hours: number;
  cdn_base_url: string | null;
}

interface S3BucketConfigEditDialogProps {
  config: S3BucketConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigUpdated: () => void;
}

export const S3BucketConfigEditDialog: React.FC<S3BucketConfigEditDialogProps> = ({
  config,
  open,
  onOpenChange,
  onConfigUpdated
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bucket_name: '',
    endpoint_url: '',
    scan_frequency_hours: 24,
    cdn_base_url: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (config) {
      setFormData({
        name: config.name,
        bucket_name: config.bucket_name,
        endpoint_url: config.endpoint_url,
        scan_frequency_hours: config.scan_frequency_hours,
        cdn_base_url: config.cdn_base_url || ''
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    setLoading(true);

    try {
      const updateData = {
        name: formData.name,
        bucket_name: formData.bucket_name,
        endpoint_url: formData.endpoint_url,
        scan_frequency_hours: formData.scan_frequency_hours,
        cdn_base_url: formData.cdn_base_url.trim() || null
      };

      console.log('Updating S3 config with:', updateData);

      const { data, error } = await supabase
        .from('s3_bucket_configs')
        .update(updateData)
        .eq('id', config.id)
        .select();

      if (error) throw error;

      // Check if the update actually affected any rows
      if (!data || data.length === 0) {
        throw new Error('Update failed - no rows were modified. This may be a permissions issue.');
      }

      console.log('Update successful, returned data:', data);

      toast({
        title: "Success",
        description: "S3 bucket configuration updated successfully",
      });

      onOpenChange(false);
      onConfigUpdated();
    } catch (error: any) {
      console.error('Failed to update S3 config:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update S3 bucket configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit S3 Bucket Configuration</DialogTitle>
          <DialogDescription>
            Update your S3-compatible bucket settings. Configure a CDN URL to serve files through a custom domain.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-name">Configuration Name</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Wasabi Production"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="edit-bucket_name">Bucket Name</Label>
            <Input
              id="edit-bucket_name"
              value={formData.bucket_name}
              onChange={(e) => setFormData(prev => ({ ...prev, bucket_name: e.target.value }))}
              placeholder="my-video-bucket"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="edit-endpoint_url">Endpoint URL</Label>
            <Input
              id="edit-endpoint_url"
              value={formData.endpoint_url}
              onChange={(e) => setFormData(prev => ({ ...prev, endpoint_url: e.target.value }))}
              placeholder="https://s3.us-central-1.wasabisys.com"
              required
            />
          </div>

          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-primary" />
              <Label htmlFor="edit-cdn_base_url" className="font-medium">CDN Base URL (Optional)</Label>
            </div>
            <Input
              id="edit-cdn_base_url"
              value={formData.cdn_base_url}
              onChange={(e) => setFormData(prev => ({ ...prev, cdn_base_url: e.target.value }))}
              placeholder="https://media.worldmotoclash.com"
            />
            <p className="text-sm text-muted-foreground mt-2">
              If configured, media URLs will use this domain instead of the raw S3 endpoint. 
              This is useful when you have a custom DNS pointing to your bucket.
            </p>
            {formData.cdn_base_url && (
              <div className="mt-3 p-2 bg-background rounded border text-xs">
                <p className="text-muted-foreground mb-1">Example URL with CDN:</p>
                <code className="text-primary break-all">
                  {formData.cdn_base_url}/path/to/file.mp4
                </code>
              </div>
            )}
          </div>
          
          <div>
            <Label htmlFor="edit-scan_frequency">Scan Frequency (hours)</Label>
            <Input
              id="edit-scan_frequency"
              type="number"
              min="1"
              max="168"
              value={formData.scan_frequency_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, scan_frequency_hours: parseInt(e.target.value) }))}
              required
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
