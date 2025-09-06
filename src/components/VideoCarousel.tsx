import React, { useRef, useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import { Autoplay, Navigation } from 'swiper/modules';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useUser } from '@/contexts/UserContext';
import { trackDocumentClick } from '@/services/loginService';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/autoplay';
import 'swiper/css/navigation';

// Define the video data structure
export interface VideoData {
  id: number;
  videoSrc: string;
  videoTitle: string;
  title: string;
  subtitle: string;
  duration?: number;
}

interface VideoCarouselProps {
  videos: VideoData[];
}

const VideoCarousel: React.FC<VideoCarouselProps> = ({ videos }) => {
  const [swiper, setSwiper] = useState<SwiperType | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Function to extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    let videoId = null;
    
    if (url.includes('embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0];
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }
    
    return videoId;
  };

  // Function to ensure YouTube parameters are properly set for autoplay
  const getEnhancedVideoUrl = (url: string) => {
    const videoId = extractVideoId(url);
    
    if (!videoId) return url;
    
    // Always include autoplay parameters
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&disablekb=1&modestbranding=1&origin=${window.location.origin}`;
  };

  // Handle slide change
  const handleSlideChange = (swiper: SwiperType) => {
    setActiveIndex(swiper.realIndex);
  };

  // Simplified video click handler with better logging
  const handleVideoClick = async (video: VideoData, event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    console.log(`[VideoCarousel] Video click detected - Title: ${video.title}`);
    
    if (!user?.id) {
      console.error('[VideoCarousel] No user ID available for tracking');
      return;
    }
    
    try {
      console.log(`[VideoCarousel] About to track video click for: ${video.title}`);
      
      await trackDocumentClick(
        user.id,
        video.videoSrc,
        'Video Clicked',
        video.title
      );
      
      console.log(`[VideoCarousel] Video tracking completed for: ${video.title}`);
    } catch (error) {
      console.error('[VideoCarousel] Error tracking video click:', error);
    }
  };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden">
      <Swiper
        modules={[Autoplay, Navigation]}
        spaceBetween={0}
        slidesPerView={1}
        autoplay={{
          delay: 8000,
          disableOnInteraction: false,
          pauseOnMouseEnter: false
        }}
        loop={true}
        speed={1000}
        className="h-full w-full rounded-2xl"
        onSwiper={(swiper) => {
          setSwiper(swiper);
          setActiveIndex(swiper.realIndex);
        }}
        onSlideChange={handleSlideChange}
        watchSlidesProgress
      >
        {videos.map((video, index) => (
          <SwiperSlide key={video.id} className="h-full w-full">
            <div
              className="relative h-full w-full group cursor-pointer"
              tabIndex={0}
              aria-label={`Play ${video.title} Video`}
              role="button"
              onClick={(e) => handleVideoClick(video, e)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleVideoClick(video, e);
                }
              }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/50 z-10"></div>
              
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <AspectRatio ratio={16/9} className="w-full h-full">
                  {isMounted && (
                    <iframe 
                      className="w-full h-full" 
                      src={getEnhancedVideoUrl(video.videoSrc)}
                      title={video.videoTitle}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      frameBorder="0"
                      loading="lazy"
                      allowFullScreen
                    ></iframe>
                  )}
                </AspectRatio>
              </div>
              
              <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6 z-20">
                <h3 className="text-white text-xl md:text-2xl lg:text-3xl font-bold">{video.title}</h3>
                <p className="text-white text-sm md:text-base lg:text-lg opacity-80">{video.subtitle}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Navigation Arrows */}
      <button
        onClick={() => swiper?.slidePrev()}
        className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 z-30 text-white hover:text-gray-200 transition-colors duration-300"
        aria-label="Previous slide"
      >
        <ArrowLeft className="h-6 w-6 md:h-8 md:w-8" />
      </button>

      <button
        onClick={() => swiper?.slideNext()}
        className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 z-30 text-white hover:text-gray-200 transition-colors duration-300"
        aria-label="Next slide"
      >
        <ArrowRight className="h-6 w-6 md:h-8 md:w-8" />
      </button>
    </div>
  );
};

export default VideoCarousel;
