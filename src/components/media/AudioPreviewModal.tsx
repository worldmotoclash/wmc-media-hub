import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Calendar, Music, Download, ExternalLink, CheckCircle, AlertTriangle, Play, Pause, Volume2, VolumeX, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MediaAsset } from '@/services/unifiedMediaService';
import { motion } from 'framer-motion';

interface AudioPreviewModalProps {
  asset: MediaAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayInBackground?: (asset: MediaAsset) => void;
}

const AudioPreviewModal: React.FC<AudioPreviewModalProps> = ({ asset, isOpen, onClose, onPlayInBackground }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

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

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (newVolume > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handlePlayInBackground = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
    onPlayInBackground?.(asset);
    onClose();
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
            {/* Animated Waveform - Fixed height container with scaleY animation to prevent bouncing */}
            <div className="flex items-end justify-center gap-1 h-16 mb-6">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 bg-gradient-to-t from-orange-500 to-amber-400 rounded-full origin-bottom"
                  style={{ height: '100%' }}
                  animate={isPlaying ? { 
                    scaleY: [0.15, 0.3 + Math.random() * 0.7, 0.15],
                  } : { scaleY: 0.15 }}
                  transition={{
                    duration: 0.5 + Math.random() * 0.5,
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
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-500 [&_.bg-primary]:bg-orange-500"
                />
              </div>

              {/* Volume Control */}
              <div className="flex items-center justify-center gap-3 mt-2">
                <Button size="icon" variant="ghost" onClick={toggleMute} className="h-8 w-8">
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-32 [&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-500 [&_.bg-primary]:bg-orange-500"
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
            <div className="flex flex-wrap gap-2 pt-2">
              {onPlayInBackground && (
                <Button variant="outline" onClick={handlePlayInBackground}>
                  <Minimize2 className="w-4 h-4 mr-2" />
                  Play in Background
                </Button>
              )}
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
                    className="bg-orange-500 hover:bg-orange-600"
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
