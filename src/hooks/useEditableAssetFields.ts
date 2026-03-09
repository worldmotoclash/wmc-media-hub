import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MediaTag } from '@/services/unifiedMediaService';

interface UseEditableAssetFieldsOptions {
  assetId: string | undefined;
  initialTitle?: string;
  initialDescription?: string;
  initialTags: MediaTag[];
  onAssetUpdated?: () => void;
}

export const useEditableAssetFields = ({
  assetId,
  initialTitle,
  initialDescription,
  initialTags,
  onAssetUpdated,
}: UseEditableAssetFieldsOptions) => {
  const [localTitle, setLocalTitle] = useState(initialTitle || '');
  const [localDescription, setLocalDescription] = useState(initialDescription || '');
  const [localTags, setLocalTags] = useState<MediaTag[]>(initialTags);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<MediaTag[]>([]);

  // Sync from props when asset changes
  useEffect(() => {
    setLocalTitle(initialTitle || '');
    setLocalDescription(initialDescription || '');
    setLocalTags(initialTags);
  }, [initialTitle, initialDescription, initialTags]);

  // Fetch available tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase
        .from('media_tags')
        .select('*')
        .order('name');
      if (data) {
        setAvailableTags(
          data.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description || '',
            color: t.color || '#6366f1',
          }))
        );
      }
    };
    fetchTags();
  }, []);

  const isValidUUID = (id?: string) =>
    !!id?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  const canEdit = isValidUUID(assetId);

  const startEditing = () => setIsEditing(true);

  const cancelEditing = () => {
    setLocalTitle(initialTitle || '');
    setLocalDescription(initialDescription || '');
    setLocalTags(initialTags);
    setNewTagInput('');
    setIsEditing(false);
  };

  const removeTag = (tagId: string) => {
    setLocalTags((prev) => prev.filter((t) => t.id !== tagId));
  };

  const addTagFromExisting = (tag: MediaTag) => {
    if (localTags.some((t) => t.id === tag.id)) {
      toast.info('Tag already added');
      return;
    }
    setLocalTags((prev) => [...prev, tag]);
    setNewTagInput('');
  };

  const addTag = async () => {
    const name = newTagInput.trim().toLowerCase();
    if (!name) return;

    // Check if already in local list
    if (localTags.some((t) => t.name.toLowerCase() === name)) {
      toast.info('Tag already added');
      setNewTagInput('');
      return;
    }

    // Check if exists in available tags
    const existing = availableTags.find((t) => t.name.toLowerCase() === name);
    if (existing) {
      setLocalTags((prev) => [...prev, existing]);
      setNewTagInput('');
      return;
    }

    // Create in DB
    const { data: created, error } = await supabase
      .from('media_tags')
      .insert({ name })
      .select()
      .single();

    if (error || !created) {
      toast.error('Failed to create tag');
      return;
    }

    const newTag: MediaTag = {
      id: created.id,
      name: created.name,
      description: created.description || '',
      color: created.color || '#6366f1',
    };

    setLocalTags((prev) => [...prev, newTag]);
    setAvailableTags((prev) => [...prev, newTag]);
    setNewTagInput('');
  };

  const handleSave = async () => {
    if (!assetId || !canEdit) return;
    setIsSaving(true);

    try {
      // Update title and description
      const { error: updateError } = await supabase
        .from('media_assets')
        .update({ title: localTitle, description: localDescription })
        .eq('id', assetId);

      if (updateError) throw updateError;

      // Determine tag changes
      const originalIds = new Set(initialTags.map((t) => t.id));
      const currentIds = new Set(localTags.map((t) => t.id));

      const toAdd = localTags.filter((t) => !originalIds.has(t.id));
      const toRemove = initialTags.filter((t) => !currentIds.has(t.id));

      // Remove tags
      for (const tag of toRemove) {
        await supabase
          .from('media_asset_tags')
          .delete()
          .eq('media_asset_id', assetId)
          .eq('tag_id', tag.id);
      }

      // Add tags
      for (const tag of toAdd) {
        await supabase
          .from('media_asset_tags')
          .insert({ media_asset_id: assetId, tag_id: tag.id });
      }

      toast.success('Changes saved');
      setIsEditing(false);
      onAssetUpdated?.();

      // Sync to Salesforce
      try {
        await supabase.functions.invoke('sync-asset-to-salesforce', {
          body: { assetId },
        });
        toast.success('Synced to Salesforce');
      } catch (syncErr) {
        console.error('SFDC sync error:', syncErr);
        toast.error('Saved locally but Salesforce sync failed');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error('Failed to save changes', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const refreshFromDB = useCallback(async () => {
    if (!assetId || !isValidUUID(assetId)) return;

    const { data: asset } = await supabase
      .from('media_assets')
      .select('title, description')
      .eq('id', assetId)
      .single();

    const { data: tagRows } = await supabase
      .from('media_asset_tags')
      .select('tag_id, media_tags(id, name, description, color)')
      .eq('media_asset_id', assetId);

    if (asset) {
      setLocalTitle(asset.title || '');
      setLocalDescription(asset.description || '');
    }

    if (tagRows) {
      const tags: MediaTag[] = tagRows
        .map((row: any) => row.media_tags)
        .filter(Boolean)
        .map((t: any) => ({ id: t.id, name: t.name, description: t.description || '', color: t.color || '#6366f1' }));
      setLocalTags(tags);
    }
  }, [assetId]);

  return {
    localTitle,
    setLocalTitle,
    localDescription,
    setLocalDescription,
    localTags,
    availableTags,
    isEditing,
    isSaving,
    newTagInput,
    setNewTagInput,
    canEdit,
    startEditing,
    cancelEditing,
    removeTag,
    addTag,
    addTagFromExisting,
    handleSave,
    refreshFromDB,
  };
};
