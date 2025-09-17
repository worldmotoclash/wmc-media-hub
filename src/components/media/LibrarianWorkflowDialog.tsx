import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Save, 
  Check, 
  X, 
  Tag, 
  ExternalLink, 
  FileText, 
  Calendar,
  User,
  Database,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import {
  MediaAsset,
  MediaTag,
  fetchMediaTags,
  createMediaTag,
  updateMediaAssetTags,
  updateMediaAssetStatus,
  linkAssetToSalesforce
} from "@/services/unifiedMediaService";

interface LibrarianWorkflowDialogProps {
  asset: MediaAsset;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const LibrarianWorkflowDialog: React.FC<LibrarianWorkflowDialogProps> = ({
  asset,
  isOpen,
  onClose,
  onComplete
}) => {
  const [availableTags, setAvailableTags] = useState<MediaTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [assetTitle, setAssetTitle] = useState(asset.title);
  const [assetDescription, setAssetDescription] = useState(asset.description || '');
  const [assetStatus, setAssetStatus] = useState(asset.status);
  const [sfdcData, setSfdcData] = useState({
    playlistId: '',
    category: '',
    tags: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('review');

  useEffect(() => {
    if (isOpen) {
      loadTags();
      setSelectedTags(asset.tags.map(tag => tag.id));
    }
  }, [isOpen, asset]);

  const loadTags = async () => {
    try {
      const tags = await fetchMediaTags();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Error loading tags:', error);
      toast.error('Failed to load available tags');
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const newTag = await createMediaTag({
        name: newTagName,
        description: `Tag created during review of ${asset.title}`,
        color: '#6366f1'
      });

      setAvailableTags(prev => [...prev, newTag]);
      setSelectedTags(prev => [...prev, newTag.id]);
      setNewTagName('');
      toast.success('Tag created successfully');
    } catch (error) {
      console.error('Error creating tag:', error);
      toast.error('Failed to create tag');
    }
  };

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSaveChanges = async () => {
    try {
      setIsLoading(true);

      // Update tags
      await updateMediaAssetTags(asset.id, selectedTags);

      // Update status if changed
      if (assetStatus !== asset.status) {
        await updateMediaAssetStatus(asset.id, assetStatus);
      }

      toast.success('Changes saved successfully');
      
      if (activeTab === 'salesforce' && sfdcData.playlistId) {
        await handleLinkToSalesforce();
      } else {
        onComplete();
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkToSalesforce = async () => {
    try {
      await linkAssetToSalesforce(asset.id, sfdcData);
      toast.success('Asset linked to Salesforce successfully');
      onComplete();
    } catch (error) {
      console.error('Error linking to Salesforce:', error);
      toast.error('Failed to link to Salesforce');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'rejected': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Content Review: {asset.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="review">Review & Tag</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="salesforce">Link to SFDC</TabsTrigger>
          </TabsList>

          <TabsContent value="review" className="space-y-6">
            {/* Asset Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Asset Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="w-48 h-32 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder.svg';
                        }}
                      />
                    ) : (
                      <span className="text-4xl">📹</span>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {asset.source.replace('_', ' ')}
                      </Badge>
                      <Badge className={getStatusColor(asset.status)}>
                        {asset.status}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold">{asset.title}</h3>
                    
                    {asset.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {asset.description}
                      </p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>Size: {formatFileSize(asset.fileSize)}</div>
                      <div>Format: {asset.fileFormat?.toUpperCase() || 'Unknown'}</div>
                      <div>Created: {new Date(asset.createdAt).toLocaleDateString()}</div>
                      <div>Resolution: {asset.resolution || 'Unknown'}</div>
                    </div>

                    {asset.fileUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(asset.fileUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Original
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Update */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Review Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={assetStatus} onValueChange={setAssetStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Tags Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create New Tag */}
                <div className="flex gap-2">
                  <Input
                    placeholder="New tag name..."
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                  />
                  <Button onClick={handleCreateTag} disabled={!newTagName.trim()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tag
                  </Button>
                </div>

                <Separator />

                {/* Available Tags */}
                <div>
                  <Label className="text-sm font-medium">Available Tags</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto">
                    {availableTags.map(tag => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={tag.id}
                          checked={selectedTags.includes(tag.id)}
                          onCheckedChange={() => handleTagToggle(tag.id)}
                        />
                        <label
                          htmlFor={tag.id}
                          className="text-sm cursor-pointer flex-1"
                        >
                          <Badge
                            variant="outline"
                            style={{ borderColor: tag.color + '40', color: tag.color }}
                          >
                            {tag.name}
                          </Badge>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Tags Preview */}
                {selectedTags.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Selected Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTags.map(tagId => {
                        const tag = availableTags.find(t => t.id === tagId);
                        return tag ? (
                          <Badge
                            key={tagId}
                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                          >
                            {tag.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Asset Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={assetTitle}
                    onChange={(e) => setAssetTitle(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={assetDescription}
                    onChange={(e) => setAssetDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>File Size</Label>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatFileSize(asset.fileSize)}
                    </div>
                  </div>
                  <div>
                    <Label>Format</Label>
                    <div className="text-sm text-muted-foreground mt-1">
                      {asset.fileFormat?.toUpperCase() || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <Label>Resolution</Label>
                    <div className="text-sm text-muted-foreground mt-1">
                      {asset.resolution || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <Label>Duration</Label>
                    <div className="text-sm text-muted-foreground mt-1">
                      {asset.duration ? `${Math.floor(asset.duration / 60)}:${(asset.duration % 60).toString().padStart(2, '0')}` : 'Unknown'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity History */}
            <Card>
              <CardHeader>
                <CardTitle>Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {asset.activities.length > 0 ? (
                    asset.activities.map(activity => (
                      <div key={activity.id} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="font-medium">{activity.action}</div>
                          <div className="text-muted-foreground">
                            {new Date(activity.createdAt).toLocaleString()}
                          </div>
                          {Object.keys(activity.details).length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {JSON.stringify(activity.details, null, 2)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-center py-4">
                      No activity history available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="salesforce" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Link to Salesforce
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create a new content record in Salesforce and link this asset to it.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="playlistId">Playlist ID</Label>
                    <Input
                      id="playlistId"
                      value={sfdcData.playlistId}
                      onChange={(e) => setSfdcData(prev => ({ ...prev, playlistId: e.target.value }))}
                      placeholder="e.g., a2H5e000002JD7g"
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={sfdcData.category}
                      onValueChange={(value) => setSfdcData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="racing">Racing</SelectItem>
                        <SelectItem value="interview">Interview</SelectItem>
                        <SelectItem value="behind-scenes">Behind the Scenes</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="promotional">Promotional</SelectItem>
                        <SelectItem value="archive">Archive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="sfdcTags">Tags (comma-separated)</Label>
                  <Input
                    id="sfdcTags"
                    value={sfdcData.tags}
                    onChange={(e) => setSfdcData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g., racing, highlights, 2024"
                  />
                </div>

                <div>
                  <Label htmlFor="sfdcDescription">Description</Label>
                  <Textarea
                    id="sfdcDescription"
                    value={sfdcData.description}
                    onChange={(e) => setSfdcData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    placeholder="Description for the Salesforce record..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          
          {assetStatus === 'rejected' ? (
            <Button
              onClick={handleSaveChanges}
              disabled={isLoading}
              variant="destructive"
            >
              <X className="w-4 h-4 mr-2" />
              {isLoading ? 'Rejecting...' : 'Reject Asset'}
            </Button>
          ) : (
            <Button
              onClick={handleSaveChanges}
              disabled={isLoading}
            >
              {assetStatus === 'approved' ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Saving...' : assetStatus === 'approved' ? 'Approve & Save' : 'Save Changes'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};