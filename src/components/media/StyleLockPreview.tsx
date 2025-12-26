import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Loader2, Pin, Users, Sun, Camera } from "lucide-react";
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

// Map position strings to CSS positions for overlay
const positionToCSS = (position: string): { top: string; left: string } => {
  const posLower = position.toLowerCase();
  let top = '50%';
  let left = '50%';

  // Vertical positioning
  if (posLower.includes('top') || posLower.includes('upper')) {
    top = '15%';
  } else if (posLower.includes('bottom') || posLower.includes('lower')) {
    top = '85%';
  } else if (posLower.includes('foreground')) {
    top = '75%';
  } else if (posLower.includes('background') || posLower.includes('distant')) {
    top = '25%';
  } else if (posLower.includes('middle') || posLower.includes('center')) {
    top = '50%';
  }

  // Horizontal positioning
  if (posLower.includes('left')) {
    left = '20%';
  } else if (posLower.includes('right')) {
    left = '80%';
  } else if (posLower.includes('center') || posLower.includes('middle')) {
    left = '50%';
  }

  // Combined positions
  if (posLower.includes('top-left') || posLower.includes('upper-left')) {
    top = '15%';
    left = '20%';
  } else if (posLower.includes('top-right') || posLower.includes('upper-right')) {
    top = '15%';
    left = '80%';
  } else if (posLower.includes('bottom-left') || posLower.includes('lower-left')) {
    top = '85%';
    left = '20%';
  } else if (posLower.includes('bottom-right') || posLower.includes('lower-right')) {
    top = '85%';
    left = '80%';
  }

  return { top, left };
};

// Get icon for subject type
const getSubjectIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'person':
    case 'group':
      return Users;
    default:
      return null;
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
    <div className="relative rounded-lg overflow-hidden border border-border/50 bg-muted/20">
      {/* Master Image */}
      <img 
        src={imageUrl} 
        alt="Style Lock Preview" 
        className="w-full h-auto max-h-[300px] object-contain"
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

      {/* Subject Labels Overlay */}
      {!isAnalyzing && styleProfile?.subjects && styleProfile.subjects.length > 0 && (
        <>
          {styleProfile.subjects.map((subject, index) => {
            const position = positionToCSS(subject.position);
            const isPinned = !!subjectReferences[subject.id];
            const Icon = getSubjectIcon(subject.type);

            return (
              <button
                key={subject.id || index}
                type="button"
                onClick={() => onSubjectClick(subject)}
                className={cn(
                  "absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200",
                  "hover:scale-110 hover:z-20 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full"
                )}
                style={{ top: position.top, left: position.left }}
                title={`${subject.id}: ${subject.appearance}`}
              >
                <Badge 
                  variant={isPinned ? "default" : "secondary"}
                  className={cn(
                    "shadow-lg cursor-pointer text-xs whitespace-nowrap",
                    "backdrop-blur-sm border",
                    isPinned 
                      ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-500 text-white" 
                      : "bg-background/90 hover:bg-background border-border/50"
                  )}
                >
                  {isPinned && <Pin className="w-3 h-3 mr-1" />}
                  {Icon && <Icon className="w-3 h-3 mr-1" />}
                  <span className="font-medium">{subject.id}</span>
                  <span className="text-[10px] opacity-75 ml-1">({subject.type})</span>
                </Badge>
              </button>
            );
          })}
        </>
      )}

      {/* Environment Badge - Bottom Left */}
      {!isAnalyzing && styleProfile?.environment && (
        <div className="absolute bottom-2 left-2">
          <Badge 
            variant="outline" 
            className="bg-background/90 backdrop-blur-sm text-[10px] border-border/50"
          >
            <Sun className="w-3 h-3 mr-1" />
            {styleProfile.environment.setting} • {styleProfile.environment.timeOfDay}
          </Badge>
        </div>
      )}

      {/* Camera/Lighting Badge - Bottom Right */}
      {!isAnalyzing && styleProfile?.lighting && (
        <div className="absolute bottom-2 right-2">
          <Badge 
            variant="outline" 
            className="bg-background/90 backdrop-blur-sm text-[10px] border-border/50"
          >
            <Camera className="w-3 h-3 mr-1" />
            {styleProfile.lighting.direction} {styleProfile.lighting.quality}
          </Badge>
        </div>
      )}

      {/* No subjects detected message */}
      {!isAnalyzing && styleProfile && (!styleProfile.subjects || styleProfile.subjects.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
            No subjects detected
          </Badge>
        </div>
      )}

      {/* Click hint */}
      {!isAnalyzing && styleProfile?.subjects && styleProfile.subjects.length > 0 && (
        <div className="absolute top-2 left-2 right-2">
          <div className="bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-[10px] text-muted-foreground text-center">
            Click subjects to pin reference images for consistency
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleLockPreview;
