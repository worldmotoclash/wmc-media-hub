import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Music, Download, ExternalLink, CheckCircle, AlertTriangle, Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaAsset } from '@/services/unifiedMediaService';
import { motion } from 'framer-motion';

interface AudioPreviewModalProps {
  asset: MediaAsset | null;
  isOpen: boolean;
  onClose: () => void;
}

const AudioPreviewModal: React.FC<AudioPreviewModalProps> = ({ asset, isOpen, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [isOpen]);

  if (!asset) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSyncStatusBadge = (syncStatus?: string) => {
    switch (syncStatus) {
      case 'in_sync':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="w-3 h-3 mr-1" />
            Synced
          </Badge>
        );
      case 'missing_sfdc':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Missing SFDC
          </Badge>
        );
      case 'missing_file':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Missing File
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (dur: number | string | undefined) => {
    if (!dur) return 'Unknown';
    const seconds = typeof dur === 'string' ? parseFloat(dur) : dur;
    if (isNaN(seconds)) return dur.toString();
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground pr-8 flex items-center gap-2">
            <Music className="w-5 h-5 text-orange-500" />
            {asset.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Audio Player with Waveform Visualization */}
          <div className="relative bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-lg overflow-hidden p-8">
            {/* Animated Waveform */}
            <div className="flex items-center justify-center gap-1 mb-6">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 bg-gradient-to-t from-orange-500 to-amber-400 rounded-full"
                  initial={{ height: 8 }}
                  animate={isPlaying ? { 
                    height: [8, 20 + Math.random() * 40, 8],
                  } : { height: 8 }}
                  transition={{
                    duration: 0.6 + Math.random() * 0.4,
                    repeat: Infinity,
                    delay: i * 0.05,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>

            {/* Play/Pause Button */}
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={togglePlayPause}
                className="w-20 h-20 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center transition-colors shadow-lg"
              >
                {isPlaying ? (
                  <Pause className="w-10 h-10 text-white" />
                ) : (
                  <Play className="w-10 h-10 text-white ml-1" />
                )}
              </button>

              {/* Time Display */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration || asset.duration || 0)}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-md">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>

            {/* Hidden Audio Element */}
            <audio
              ref={audioRef}
              src={asset.fileUrl || ''}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              preload="metadata"
            />

            {/* Format Badge */}
            {asset.fileFormat && (
              <Badge variant="outline" className="absolute bottom-4 left-4 bg-background/80 text-xs uppercase">
                {asset.fileFormat}
              </Badge>
            )}
          </div>
          
          {/* Audio Details */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* Asset Type Badge */}
              <Badge variant="secondary" className="flex items-center gap-1 bg-orange-100 text-orange-800">
                <Volume2 className="w-3 h-3" />
                Audio
              </Badge>

              {/* Status Badge */}
              <Badge variant="outline" className={getStatusColor(asset.status)}>
                {asset.status}
              </Badge>

              {/* Sync Status Badge */}
              {asset.syncStatus && getSyncStatusBadge(asset.syncStatus)}
              
              {/* Created date */}
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{!isNaN(Date.parse(asset.createdAt)) ? new Date(asset.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              {(asset.duration || asset.metadata?.formatted_duration) && (
                <div>
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium">{formatDuration(asset.duration || asset.metadata?.formatted_duration)}</p>
                </div>
              )}
              {asset.fileSize && (
                <div>
                  <p className="text-xs text-muted-foreground">File Size</p>
                  <p className="text-sm font-medium">{formatFileSize(asset.fileSize)}</p>
                </div>
              )}
              {asset.fileFormat && (
                <div>
                  <p className="text-xs text-muted-foreground">Format</p>
                  <p className="text-sm font-medium uppercase">{asset.fileFormat}</p>
                </div>
              )}
              {asset.source && (
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="text-sm font-medium capitalize">{asset.source.replace('_', ' ')}</p>
                </div>
              )}
            </div>

            {/* Description */}
            {asset.description && (
              <div>
                <h4 className="font-semibold text-foreground mb-2">Description</h4>
                <p className="text-muted-foreground text-sm">{asset.description}</p>
              </div>
            )}

            {/* Tags */}
            {asset.tags && asset.tags.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {asset.tags.map((tag) => (
                    <Badge 
                      key={tag.id} 
                      variant="outline" 
                      style={{ borderColor: tag.color + '40', color: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {asset.fileUrl && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => window.open(asset.fileUrl, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Original
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = asset.fileUrl!;
                      link.download = asset.title;
                      link.click();
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AudioPreviewModal;