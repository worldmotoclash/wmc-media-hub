
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import VideoCarousel, { VideoData } from '@/components/VideoCarousel';

const HeroSection: React.FC = () => {
  // Array of video data with improved YouTube URLs and better titles
  const videos: VideoData[] = [
    {
      id: 1,
      videoSrc: "https://www.youtube.com/embed/mVkp_elkgQk?start=55",
      videoTitle: "The Corkscrew",
      title: "NOTHING LIKE IT",
      subtitle: "Danger. Danger. Danger",
      duration: 8000
    },
    {
      id: 2,
      videoSrc: "https://www.youtube.com/embed/Ka2X73qTQ5Y",
      videoTitle: "Laguna Seca Racing",
      title: "NO RULES, ONE CLASS",
      subtitle: "Where speed meets innovation",
      duration: 8000
    },
    // Commented out video ID3
    // {
    //   id: 3,
    //   videoSrc: "https://youtu.be/ilJTemepdME",
    //   videoTitle: "WMC TEAMS OWNERS",
    //   title: "WMC TEAMS OWNERS",
    //   subtitle: "The Owners",
    //  },
    // Commented out fourth video
    // {
    //   id: 4,
    //   videoSrc: "https://www.youtube.com/embed/kopVOs0gfRM",
    //   videoTitle: "Norman Reedus",
    //   title: "ACTION STARS RACING",
    //   subtitle: "Walking Dead Star Norman Reedus",
    //   duration: 8000
    // }
  ];
  
  return (
    <section className="min-h-screen w-full flex items-center justify-center relative overflow-hidden pt-16 md:pt-20">
      {/* Background gradient effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-to-br from-gray-100 to-transparent opacity-70 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-gray-100 to-transparent opacity-70 rounded-full blur-3xl transform translate-x-1/4 translate-y-1/4"></div>
      </div>
      
      <div className="container mx-auto px-6 py-6 md:py-12 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-12">
          <motion.div 
            className="flex-1 max-w-2xl"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <div className="inline-block px-3 py-1 mb-4 md:mb-6 border border-gray-200 rounded-full bg-white/50 backdrop-blur-sm">
                <span className="text-xs font-medium text-gray-600">
                  Exclusive Investor Portal
                </span>
              </div>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 md:mb-6 text-balance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Reimagining <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-gray-600">Motorsports</span> 
            </motion.h1>
            
            <motion.p 
              className="text-base md:text-lg lg:text-xl text-gray-600 mb-6 md:mb-8 max-w-xl leading-relaxed text-balance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Bringing pure racing and big time prize money to Motocycle racing.
            </motion.p>
            
            <motion.div 
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <Button asChild className="bg-science-blue hover:bg-science-blue/80 text-white px-6 md:px-8 py-4 md:py-6 rounded-md text-sm md:text-base">
                <Link to="/login">Investor Login</Link>
              </Button>
              <Button asChild variant="outline" className="border-black text-black hover:bg-black/5 px-6 md:px-8 py-4 md:py-6 rounded-md text-sm md:text-base">
                <a href="#contact">Contact Us</a>
              </Button>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="flex-1 relative w-full"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <div className="w-full h-[280px] sm:h-[350px] md:h-[400px] lg:h-[500px] relative rounded-2xl overflow-hidden">
              <VideoCarousel videos={videos} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
