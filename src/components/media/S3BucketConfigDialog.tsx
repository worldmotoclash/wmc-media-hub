import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Plus, Loader2, AlertTriangle, Globe } from 'lucide-react';

interface S3BucketConfigDialogProps {
  onConfigAdded: () => void;
}

const getEndpointForRegion = (region: string) => {
  const endpointMap: { [key: string]: string } = {
    'us-east-1': 'https://s3.wasabisys.com',
    'us-west-1': 'https://s3.us-west-1.wasabisys.com',
    'us-west-2': 'https://s3.us-west-2.wasabisys.com',
    'us-central-1': 'https://s3.us-central-1.wasabisys.com',
    'ca-central-1': 'https://s3.ca-central-1.wasabisys.com',
    'eu-west-1': 'https://s3.eu-west-1.wasabisys.com',
    'eu-central-1': 'https://s3.eu-central-1.wasabisys.com',
    'ap-southeast-1': 'https://s3.ap-southeast-1.wasabisys.com'
  };
  return endpointMap[region] || 'https://s3.wasabisys.com';
};

export const S3BucketConfigDialog: React.FC<S3BucketConfigDialogProps> = ({ onConfigAdded }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    bucket_name: '',
    endpoint_url: '',
    region: 'us-east-1',
    scan_frequency_hours: 24,
    cdn_base_url: ''
  });
  const { toast } = useToast();
  const { user } = useUser();
  const { hasValidSession, isReady, checkAndCreateSession } = useSupabaseAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add S3 bucket configurations",
        variant: "destructive",
      });
      return;
    }

    // Check for valid Supabase session before proceeding
    if (!hasValidSession()) {
      toast({
        title: "Database Authentication Required",
        description: "Attempting to establish database connection...",
        variant: "destructive",
      });
      
      // Try to establish session
      const sessionCreated = await checkAndCreateSession();
      if (!sessionCreated) {
        toast({
          title: "Database Connection Failed",
          description: "Unable to connect to database. Please enable Anonymous Authentication in Supabase settings.",
          variant: "destructive",
        });
        return;
      }
    }
    
    setLoading(true);

    try {
      const insertData = {
        ...formData,
        cdn_base_url: formData.cdn_base_url.trim() || null
      };
      
      const { error } = await supabase
        .from('s3_bucket_configs')
        .insert([insertData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "S3 bucket configuration added successfully",
      });

      setFormData({
        name: '',
        bucket_name: '',
        endpoint_url: '',
        region: 'us-east-1',
        scan_frequency_hours: 24,
        cdn_base_url: ''
      });
      setOpen(false);
      onConfigAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add S3 bucket configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={!user || !isReady}>
          <Plus className="w-4 h-4 mr-2" />
          Add S3 Bucket
          {!hasValidSession() && isReady && (
            <AlertTriangle className="w-4 h-4 ml-2 text-amber-500" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add S3 Bucket Configuration</DialogTitle>
          <DialogDescription>
            Connect your S3-compatible bucket. Authentication uses the server's global Wasabi credentials - you only need to specify the bucket details.
          </DialogDescription>
          {!hasValidSession() && isReady && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <p className="text-sm text-amber-800">
                Database authentication not established. Anonymous Auth may be disabled in Supabase settings.
              </p>
            </div>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Configuration Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Wasabi Production"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="bucket_name">Bucket Name</Label>
            <Input
              id="bucket_name"
              value={formData.bucket_name}
              onChange={(e) => setFormData(prev => ({ ...prev, bucket_name: e.target.value }))}
              placeholder="my-video-bucket"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="endpoint_url">Endpoint URL</Label>
            <Input
              id="endpoint_url"
              value={formData.endpoint_url}
              onChange={(e) => setFormData(prev => ({ ...prev, endpoint_url: e.target.value }))}
              placeholder={`Example: ${getEndpointForRegion(formData.region)}`}
              required
            />
            <p className="text-sm text-muted-foreground mt-1">
              Auto-filled for Wasabi. For other providers, enter custom endpoint.
            </p>
          </div>
          
          
          <div>
            <Label htmlFor="region">Region</Label>
            <Select value={formData.region} onValueChange={(value) => {
              setFormData(prev => ({ 
                ...prev, 
                region: value,
                endpoint_url: getEndpointForRegion(value)
              }));
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="us-east-1">US East 1</SelectItem>
                <SelectItem value="us-west-1">US West 1</SelectItem>
                <SelectItem value="us-west-2">US West 2</SelectItem>
                <SelectItem value="us-central-1">US Central 1 (Texas)</SelectItem>
                <SelectItem value="ca-central-1">Canada Central 1 (Toronto)</SelectItem>
                <SelectItem value="eu-west-1">EU West 1</SelectItem>
                <SelectItem value="eu-central-1">EU Central 1 (Amsterdam)</SelectItem>
                <SelectItem value="ap-southeast-1">AP Southeast 1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-primary" />
              <Label htmlFor="cdn_base_url" className="font-medium">CDN Base URL (Optional)</Label>
            </div>
            <Input
              id="cdn_base_url"
              value={formData.cdn_base_url}
              onChange={(e) => setFormData(prev => ({ ...prev, cdn_base_url: e.target.value }))}
              placeholder="https://media.worldmotoclash.com"
            />
            <p className="text-sm text-muted-foreground mt-2">
              If configured, media URLs will use this domain instead of the raw S3 endpoint.
            </p>
          </div>
          
          <div>
            <Label htmlFor="scan_frequency">Scan Frequency (hours)</Label>
            <Input
              id="scan_frequency"
              type="number"
              min="1"
              max="168"
              value={formData.scan_frequency_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, scan_frequency_hours: parseInt(e.target.value) }))}
              required
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Configuration
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};