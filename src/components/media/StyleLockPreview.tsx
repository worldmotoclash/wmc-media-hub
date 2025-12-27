import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Pin, PinOff, Users, Car, Dog, Box, Sun, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  type: 'person' | 'vehicle' | 'animal' | 'object' | 'group';
  appearance: string;
  wardrobe?: string;
  distinguishingTraits: string[];
  position: string;
}

interface StyleProfile {
  subjects?: Subject[];
  environment?: {
    setting: string;
    timeOfDay: string;
    weather?: string;
    backgroundElements: string[];
  };
  lighting?: {
    direction: string;
    quality: string;
    keyTones: string[];
  };
  colorGrade?: {
    palette: string[];
    mood: string;
    contrast: string;
    texture: string;
  };
  cameraStyle?: {
    lensType: string;
    depthOfField: string;
    compositionNotes: string;
  };
  visualAnchors?: string[];
  negativeConstraints?: string[];
}

interface SubjectReference {
  imageUrl: string;
  analysisPrompt?: string;
  libraryId?: string;
}

interface StyleLockPreviewProps {
  imageUrl: string;
  styleProfile: StyleProfile | null;
  subjectReferences: Record<string, SubjectReference>;
  isAnalyzing: boolean;
  onSubjectClick: (subject: Subject) => void;
}

// Get icon for subject type
const getSubjectIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'person':
      return Users;
    case 'group':
      return Users;
    case 'vehicle':
      return Car;
    case 'animal':
      return Dog;
    case 'object':
      return Box;
    default:
      return Box;
  }
};

export const StyleLockPreview: React.FC<StyleLockPreviewProps> = ({
  imageUrl,
  styleProfile,
  subjectReferences,
  isAnalyzing,
  onSubjectClick,
}) => {
  return (
    <div className="rounded-lg overflow-hidden border border-border/50 bg-muted/20">
      {/* Master Image - Clean, no overlays */}
      <div className="relative">
        <img 
          src={imageUrl} 
          alt="Style Lock Preview" 
          className="w-full h-auto max-h-[250px] object-contain bg-black/20"
        />

        {/* Loading Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <div className="text-sm text-muted-foreground text-center px-4">
              <p className="font-medium">Analyzing image...</p>
              <p className="text-xs mt-1">Detecting subjects, environment, and style</p>
            </div>
          </div>
        )}

        {/* Environment & Lighting Badges - Bottom corners */}
        {!isAnalyzing && styleProfile && (
          <div className="absolute bottom-2 left-2 right-2 flex justify-between pointer-events-none">
            {styleProfile.environment && (
              <Badge 
                variant="outline" 
                className="bg-background/90 backdrop-blur-sm text-[10px] border-border/50"
              >
                <Sun className="w-3 h-3 mr-1" />
                {styleProfile.environment.setting} • {styleProfile.environment.timeOfDay}
              </Badge>
            )}
            {styleProfile.lighting && (
              <Badge 
                variant="outline" 
                className="bg-background/90 backdrop-blur-sm text-[10px] border-border/50"
              >
                <Camera className="w-3 h-3 mr-1" />
                {styleProfile.lighting.direction} {styleProfile.lighting.quality}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Subject List - Below Image */}
      {!isAnalyzing && styleProfile && (
        <div className="border-t border-border/50">
          <div className="px-3 py-2 bg-muted/30">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Detected Subjects ({styleProfile.subjects?.length || 0})
            </h4>
          </div>
          
          {styleProfile.subjects && styleProfile.subjects.length > 0 ? (
            <ScrollArea className="max-h-[180px]">
              <div className="divide-y divide-border/30">
                {styleProfile.subjects.map((subject, index) => {
                  const isPinned = !!subjectReferences[subject.id];
                  const Icon = getSubjectIcon(subject.type);

                  return (
                    <button
                      key={subject.id || index}
                      type="button"
                      onClick={() => onSubjectClick(subject)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        "hover:bg-muted/50 focus:outline-none focus:bg-muted/50",
                        isPinned && "bg-emerald-500/10"
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                        isPinned 
                          ? "bg-emerald-500/20 text-emerald-500" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Subject Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {subject.id}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {subject.type}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {subject.appearance}
                        </p>
                      </div>

                      {/* Pin Status */}
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        isPinned 
                          ? "bg-emerald-500 text-white" 
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}>
                        {isPinned ? (
                          <Pin className="w-4 h-4" />
                        ) : (
                          <PinOff className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="px-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">No subjects detected</p>
            </div>
          )}

          {/* Help text */}
          {styleProfile.subjects && styleProfile.subjects.length > 0 && (
            <div className="px-3 py-2 bg-muted/20 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground text-center">
                Click a subject to pin a reference image for consistency
              </p>
            </div>
          )}
        </div>
      )}

      {/* No profile yet */}
      {!isAnalyzing && !styleProfile && (
        <div className="px-3 py-6 text-center border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Upload an image to analyze subjects
          </p>
        </div>
      )}
    </div>
  );
};

export default StyleLockPreview;
