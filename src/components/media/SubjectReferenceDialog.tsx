import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageDropzone } from "@/components/media/ImageDropzone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Library, 
  Loader2, 
  Check, 
  User, 
  Car, 
  Box, 
  Mountain,
  Users,
  X
} from "lucide-react";

interface Subject {
  id: string;
  type: 'person' | 'vehicle' | 'animal' | 'object' | 'group';
  appearance: string;
  wardrobe?: string;
  distinguishingTraits: string[];
  position: string;
}

interface PartialStyleProfile {
  subjects?: Subject[];
  visualAnchors?: string[];
  negativeConstraints?: string[];
}

interface SubjectReference {
  imageUrl: string;
  assetId?: string;
  fromLibrary?: boolean;
  libraryId?: string;
  profile?: PartialStyleProfile;
}

interface CharacterLibraryItem {
  id: string;
  name: string;
  element_type: string;
  image_url: string;
  thumbnail_url?: string;
  style_profile: any;
  description?: string;
  tags: string[];
  created_at: string;
}

interface SubjectReferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: Subject | null;
  onApplyReference: (subjectId: string, reference: SubjectReference) => void;
  onClearReference: (subjectId: string) => void;
  existingReference?: SubjectReference;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'person':
    case 'character':
      return User;
    case 'vehicle':
      return Car;
    case 'object':
      return Box;
    case 'scene':
      return Mountain;
    case 'group':
      return Users;
    default:
      return Box;
  }
};

export const SubjectReferenceDialog: React.FC<SubjectReferenceDialogProps> = ({
  open,
  onOpenChange,
  subject,
  onApplyReference,
  onClearReference,
  existingReference
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [uploadedAssetId, setUploadedAssetId] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedProfile, setAnalyzedProfile] = useState<PartialStyleProfile | null>(null);
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [libraryName, setLibraryName] = useState("");
  const [libraryItems, setLibraryItems] = useState<CharacterLibraryItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<CharacterLibraryItem | null>(null);

  // Reset state when dialog opens/closes or subject changes
  useEffect(() => {
    if (open && subject) {
      setUploadedImageUrl(existingReference?.imageUrl || "");
      setUploadedAssetId(existingReference?.assetId || "");
      setAnalyzedProfile(existingReference?.profile || null);
      setSaveToLibrary(false);
      setLibraryName(subject.id);
      setSelectedLibraryItem(null);
      loadLibraryItems();
    }
  }, [open, subject?.id]);

  const loadLibraryItems = async () => {
    setIsLoadingLibrary(true);
    try {
      const { data, error } = await supabase
        .from('character_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLibraryItems(data || []);
    } catch (error) {
      console.error('Failed to load character library:', error);
    }
    setIsLoadingLibrary(false);
  };

  const handleImageUpload = (info: { url: string; assetId?: string }) => {
    setUploadedImageUrl(info.url);
    setUploadedAssetId(info.assetId || "");
    setAnalyzedProfile(null);
    setSelectedLibraryItem(null);
  };

  const analyzeElement = async () => {
    if (!uploadedImageUrl || !subject) return;

    setIsAnalyzing(true);
    try {
      const response = await supabase.functions.invoke('analyze-master-image', {
        body: { 
          imageUrl: uploadedImageUrl, 
          assetId: uploadedAssetId,
          elementType: subject.type === 'person' ? 'character' : subject.type,
          elementDescription: subject.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Analysis failed');
      }

      if (response.data?.success && response.data?.styleProfile) {
        setAnalyzedProfile(response.data.styleProfile);
        toast({
          title: "Element Analyzed",
          description: `Extracted details for ${subject.id}`,
        });
      } else {
        throw new Error(response.data?.error || 'Failed to analyze element');
      }
    } catch (error) {
      console.error('Element analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : 'Failed to analyze element',
        variant: "destructive",
      });
    }
    setIsAnalyzing(false);
  };

  const handleApply = async () => {
    if (!subject) return;

    const imageUrl = selectedLibraryItem?.image_url || uploadedImageUrl;
    if (!imageUrl) {
      toast({
        title: "No Image Selected",
        description: "Please upload an image or select from the library",
        variant: "destructive",
      });
      return;
    }

    // Save to library if checked
    if (saveToLibrary && !selectedLibraryItem && uploadedImageUrl) {
      try {
        const { error } = await supabase
          .from('character_library')
          .insert([{
            name: libraryName || subject.id,
            element_type: subject.type === 'person' ? 'character' : subject.type,
            image_url: uploadedImageUrl,
            source_asset_id: uploadedAssetId || null,
            style_profile: (analyzedProfile || {}) as any,
            description: subject.appearance,
            tags: subject.distinguishingTraits || []
          }]);

        if (error) throw error;
        toast({
          title: "Saved to Library",
          description: `${libraryName || subject.id} added to Character Library`,
        });
      } catch (error) {
        console.error('Failed to save to library:', error);
        toast({
          title: "Save Failed",
          description: "Failed to save to Character Library",
          variant: "destructive",
        });
      }
    }

    // Apply the reference
    const reference: SubjectReference = selectedLibraryItem ? {
      imageUrl: selectedLibraryItem.image_url,
      fromLibrary: true,
      libraryId: selectedLibraryItem.id,
      profile: selectedLibraryItem.style_profile as PartialStyleProfile
    } : {
      imageUrl: uploadedImageUrl,
      assetId: uploadedAssetId,
      fromLibrary: false,
      profile: analyzedProfile || undefined
    };

    onApplyReference(subject.id, reference);
    onOpenChange(false);
  };

  const handleClear = () => {
    if (subject) {
      onClearReference(subject.id);
      onOpenChange(false);
    }
  };

  const handleLibraryItemSelect = (item: CharacterLibraryItem) => {
    setSelectedLibraryItem(item);
    setUploadedImageUrl("");
    setUploadedAssetId("");
    setAnalyzedProfile(item.style_profile as PartialStyleProfile);
  };

  if (!subject) return null;

  const TypeIcon = getTypeIcon(subject.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5" />
            Pin Reference for "{subject.id}"
          </DialogTitle>
          <DialogDescription>
            Upload a specific reference image to lock in this {subject.type}'s appearance across all generated variants.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload New
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Library className="w-4 h-4" />
              Character Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <ImageDropzone
              value={uploadedImageUrl}
              onChange={(url) => setUploadedImageUrl(url)}
              onUploadComplete={handleImageUpload}
              label={`Reference Image for ${subject.id}`}
              description="Upload a clear reference image for this element"
              disabled={isAnalyzing}
            />

            {uploadedImageUrl && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={analyzeElement}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : analyzedProfile ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Re-analyze
                      </>
                    ) : (
                      "Analyze Element"
                    )}
                  </Button>
                  {analyzedProfile && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-300">
                      <Check className="w-3 h-3 mr-1" />
                      Analyzed
                    </Badge>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="save-library" 
                    checked={saveToLibrary}
                    onCheckedChange={(checked) => setSaveToLibrary(checked as boolean)}
                  />
                  <label
                    htmlFor="save-library"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Save to Character Library for reuse
                  </label>
                </div>

                {saveToLibrary && (
                  <div className="space-y-2">
                    <Label htmlFor="library-name" className="text-sm">Library Name</Label>
                    <Input
                      id="library-name"
                      value={libraryName}
                      onChange={(e) => setLibraryName(e.target.value)}
                      placeholder="e.g., Santa Claus, Red Motorcycle"
                    />
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="library" className="mt-4">
            {isLoadingLibrary ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : libraryItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Library className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No items in library yet</p>
                <p className="text-sm">Upload and save references to build your library</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="grid grid-cols-3 gap-3 p-1">
                  {libraryItems.map((item) => {
                    const ItemIcon = getTypeIcon(item.element_type);
                    const isSelected = selectedLibraryItem?.id === item.id;
                    
                    return (
                      <div
                        key={item.id}
                        className={`relative group cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
                          isSelected 
                            ? 'border-primary ring-2 ring-primary/20' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleLibraryItemSelect(item)}
                      >
                        <img
                          src={item.thumbnail_url || item.image_url}
                          alt={item.name}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <div className="flex items-center gap-1">
                            <ItemIcon className="w-3 h-3 text-white/80" />
                            <span className="text-xs text-white font-medium truncate">
                              {item.name}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          {existingReference && (
            <Button type="button" variant="destructive" size="sm" onClick={handleClear}>
              <X className="w-4 h-4 mr-1" />
              Clear Reference
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleApply}
            disabled={!uploadedImageUrl && !selectedLibraryItem}
          >
            <Check className="w-4 h-4 mr-2" />
            Apply Reference
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
