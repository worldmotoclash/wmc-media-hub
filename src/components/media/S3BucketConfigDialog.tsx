import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Loader2 } from 'lucide-react';

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
    access_key_id: '',
    region: 'us-east-1',
    scan_frequency_hours: 24
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to add S3 bucket configurations');
      }

      const { error } = await supabase
        .from('s3_bucket_configs')
        .insert([{ ...formData, created_by: user.id }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "S3 bucket configuration added successfully",
      });

      setFormData({
        name: '',
        bucket_name: '',
        endpoint_url: '',
        access_key_id: '',
        region: 'us-east-1',
        scan_frequency_hours: 24
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
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add S3 Bucket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add S3 Bucket Configuration</DialogTitle>
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
              Endpoint will auto-populate based on region selection
            </p>
          </div>
          
          <div>
            <Label htmlFor="access_key_id">Access Key ID</Label>
            <Input
              id="access_key_id"
              value={formData.access_key_id}
              onChange={(e) => setFormData(prev => ({ ...prev, access_key_id: e.target.value }))}
              placeholder="Your S3 access key"
              required
            />
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