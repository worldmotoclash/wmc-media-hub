import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PodcastPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  embedCode: string;
  title: string;
}

const PodcastPlayerModal: React.FC<PodcastPlayerModalProps> = ({
  isOpen,
  onClose,
  embedCode,
  title
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    console.log('[PodcastPlayerModal] Loading player for:', title);
    
    // Clear any existing content
    containerRef.current.innerHTML = '';

    // Create a temporary div to parse the embed code
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = embedCode;

    // Extract the script elements and container div
    const scriptElements = tempDiv.querySelectorAll('script');
    const containerDiv = tempDiv.querySelector('div');

    if (containerDiv) {
      // Add the container div
      containerRef.current.appendChild(containerDiv.cloneNode(true));
    }

    // Add script elements
    scriptElements.forEach(script => {
      const newScript = document.createElement('script');
      if (script.src) {
        newScript.src = script.src;
        newScript.onload = () => {
          console.log('[PodcastPlayerModal] Script loaded, player should be ready');
          setIsPlayerLoaded(true);
        };
      }
      if (script.innerHTML) {
        newScript.innerHTML = script.innerHTML;
      }
      Array.from(script.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      
      containerRef.current?.appendChild(newScript);
    });

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [isOpen, embedCode, title]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="w-full">
          <div ref={containerRef} className="w-full min-h-[200px]" />
          {!isPlayerLoaded && (
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading podcast player...</div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PodcastPlayerModal;