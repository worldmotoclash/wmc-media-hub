import React from 'react';
import { motion } from 'framer-motion';

const MediaHubHero: React.FC = () => {
  return (
    <section className="min-h-[60vh] w-full flex items-center justify-center relative overflow-hidden bg-woodsmoke">
      {/* Background gradient effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-to-br from-cinnabar/20 to-transparent opacity-70 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-science-blue/20 to-transparent opacity-70 rounded-full blur-3xl transform translate-x-1/4 translate-y-1/4"></div>
      </div>
      
      <div className="container mx-auto px-6 py-16 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div className="inline-block px-4 py-2 mb-6 border border-white/20 rounded-full bg-white/10 backdrop-blur-sm">
              <span className="text-sm font-medium text-white/80">
                WMC Media Administration
              </span>
            </div>
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            World Moto Clash
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cinnabar to-science-blue">Media Hub</span>
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Pure Racing, Pure Entertainment
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default MediaHubHero;