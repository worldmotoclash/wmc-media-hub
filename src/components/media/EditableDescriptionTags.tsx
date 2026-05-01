import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Pencil, Save, X, Plus, Loader2, ChevronDown } from 'lucide-react';
import { MediaTag } from '@/services/unifiedMediaService';

interface EditableDescriptionTagsProps {
  localTitle?: string;
  setLocalTitle?: (v: string) => void;
  localDescription: string;
  setLocalDescription: (v: string) => void;
  localTags: MediaTag[];
  availableTags?: MediaTag[];
  isEditing: boolean;
  isSaving: boolean;
  newTagInput: string;
  setNewTagInput: (v: string) => void;
  canEdit: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onRemoveTag: (tagId: string) => void;
  onAddTag: () => void;
  onAddTagFromExisting?: (tag: MediaTag) => void;
  onSave: () => void;
  isCreatingLocal?: boolean;
  onCreateLocal?: () => void;
}

const EditableDescriptionTags: React.FC<EditableDescriptionTagsProps> = ({
  localTitle,
  setLocalTitle,
  localDescription,
  setLocalDescription,
  localTags,
  availableTags = [],
  isEditing,
  isSaving,
  newTagInput,
  setNewTagInput,
  canEdit,
  onStartEditing,
  onCancelEditing,
  onRemoveTag,
  onAddTag,
  onAddTagFromExisting,
  onSave,
  isCreatingLocal,
  onCreateLocal,
}) => {
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);

  // Tags not yet applied to this asset
  const unusedTags = useMemo(() => {
    const usedIds = new Set(localTags.map((t) => t.id));
    return availableTags.filter((t) => !usedIds.has(t.id));
  }, [availableTags, localTags]);

  return (
    <div className="space-y-4">
      {/* Edit/Save controls */}
      <div className="flex items-center justify-end gap-2">
        {canEdit ? (
          isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={onCancelEditing} disabled={isSaving}>
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={onSave} disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Saving…</>
                ) : (
                  <><Save className="w-4 h-4 mr-1" />Save</>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={onStartEditing}>
              <Pencil className="w-4 h-4 mr-1" />
              Edit details
            </Button>
          )
        ) : onCreateLocal ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground italic">Salesforce-only — create a local record to edit</span>
            <Button variant="outline" size="sm" onClick={onCreateLocal} disabled={isCreatingLocal}>
              {isCreatingLocal ? (
                <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Creating…</>
              ) : (
                <><Pencil className="w-4 h-4 mr-1" />Enable editing</>
              )}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Title */}
      {localTitle !== undefined && setLocalTitle && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-foreground">Title</h4>
          </div>
          {isEditing ? (
            <Input
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              placeholder="Asset title..."
              className="text-sm"
            />
          ) : (
            <p className="text-foreground text-sm font-medium">
              {localTitle || <span className="italic text-muted-foreground">Untitled</span>}
            </p>
          )}
        </div>
      )}

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-foreground">Description</h4>
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
            {/* Tag autocomplete popover */}
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-sm gap-1">
                  <Plus className="w-3 h-3" />
                  Add Tag
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search or create tag..."
                    value={newTagInput}
                    onValueChange={setNewTagInput}
                  />
                  <CommandList
                    className="max-h-64 overflow-y-scroll overscroll-contain"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <CommandEmpty>
                      {newTagInput.trim() ? (
                        <button
                          className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
                          onClick={() => {
                            onAddTag();
                            setTagPopoverOpen(false);
                          }}
                        >
                          <Plus className="w-3 h-3" />
                          Create "{newTagInput.trim()}"
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs p-2">Type to search…</span>
                      )}
                    </CommandEmpty>
                    <CommandGroup>
                      {unusedTags.map((tag) => (
                        <CommandItem
                          key={tag.id}
                          value={tag.name}
                          onSelect={() => {
                            onAddTagFromExisting?.(tag);
                            setTagPopoverOpen(false);
                          }}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full mr-2 shrink-0"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

    </div>
  );
};

export default EditableDescriptionTags;
