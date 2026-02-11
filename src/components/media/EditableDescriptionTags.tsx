import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Save, X, Plus, Loader2 } from 'lucide-react';
import { MediaTag } from '@/services/unifiedMediaService';

interface EditableDescriptionTagsProps {
  localDescription: string;
  setLocalDescription: (v: string) => void;
  localTags: MediaTag[];
  isEditing: boolean;
  isSaving: boolean;
  newTagInput: string;
  setNewTagInput: (v: string) => void;
  canEdit: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onRemoveTag: (tagId: string) => void;
  onAddTag: () => void;
  onSave: () => void;
}

const EditableDescriptionTags: React.FC<EditableDescriptionTagsProps> = ({
  localDescription,
  setLocalDescription,
  localTags,
  isEditing,
  isSaving,
  newTagInput,
  setNewTagInput,
  canEdit,
  onStartEditing,
  onCancelEditing,
  onRemoveTag,
  onAddTag,
  onSave,
}) => {
  return (
    <div className="space-y-4">
      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-foreground">Description</h4>
          {canEdit && !isEditing && (
            <Button variant="ghost" size="sm" onClick={onStartEditing} className="h-7 px-2 text-xs">
              <Pencil className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
        {isEditing ? (
          <Textarea
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            placeholder="Add a description..."
            className="min-h-[80px]"
          />
        ) : (
          <p className="text-muted-foreground text-sm">
            {localDescription || <span className="italic">No description</span>}
          </p>
        )}
      </div>

      {/* Tags */}
      <div>
        <h4 className="font-semibold text-foreground mb-2">Tags</h4>
        <div className="flex flex-wrap gap-2">
          {localTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="outline"
              style={{ borderColor: tag.color + '40', color: tag.color }}
              className="flex items-center gap-1"
            >
              {tag.name}
              {isEditing && (
                <button
                  onClick={() => onRemoveTag(tag.id)}
                  className="ml-1 hover:text-destructive"
                  aria-label={`Remove ${tag.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
          {localTags.length === 0 && !isEditing && (
            <span className="text-sm text-muted-foreground italic">No tags</span>
          )}
        </div>
        {isEditing && (
          <div className="flex items-center gap-2 mt-2">
            <Input
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddTag())}
              placeholder="Add tag..."
              className="h-8 text-sm flex-1 max-w-[200px]"
            />
            <Button variant="outline" size="sm" onClick={onAddTag} className="h-8">
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
        )}
      </div>

      {/* Save / Cancel */}
      {isEditing && (
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={onCancelEditing} disabled={isSaving}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default EditableDescriptionTags;
