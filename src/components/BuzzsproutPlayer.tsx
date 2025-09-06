import React, { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { trackDocumentClick } from '@/services/loginService';
import { TRACKING_ACTIONS } from '@/constants/trackingActions';
import { Play } from 'lucide-react';
import PodcastPlayerModal from './PodcastPlayerModal';

interface BuzzsproutPlayerProps {
  embedCode: string;
  title: string;
  documentUrl: string;
  className?: string;
}

const BuzzsproutPlayer: React.FC<BuzzsproutPlayerProps> = ({ 
  embedCode, 
  title, 
  documentUrl, 
  className = '' 
}) => {
  const { user } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleThumbnailClick = async () => {
    if (!user?.id) return;
    
    console.log('[BuzzsproutPlayer] Thumbnail clicked for:', title);
    
    try {
      await trackDocumentClick(
        user.id,
        documentUrl,
        TRACKING_ACTIONS.AUDIO_CLICKED,
        title
      );
      console.log('[BuzzsproutPlayer] Audio tracking completed successfully');
      setIsModalOpen(true);
    } catch (error) {
      console.error('[BuzzsproutPlayer] Error tracking audio:', error);
      // Still open modal even if tracking fails
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div 
        className={`podcast-thumbnail cursor-pointer hover:opacity-80 transition-opacity ${className}`}
        onClick={handleThumbnailClick}
      >
        <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 border border-border rounded-lg p-4 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
              <Play className="w-6 h-6 text-primary fill-current" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground truncate">
              {title}
            </h4>
            <p className="text-xs text-muted-foreground">
              Click to play podcast episode
            </p>
          </div>
        </div>
      </div>

      <PodcastPlayerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        embedCode={embedCode}
        title={title}
      />
    </>
  );
};

export default BuzzsproutPlayer;