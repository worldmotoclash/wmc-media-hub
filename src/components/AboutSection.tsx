import React from 'react';
import { motion } from 'framer-motion';
import { Circle, List, Square } from 'lucide-react';

const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-gray-50 to-white z-0"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">About World Moto Clash</h2>
            <p className="text-lg text-gray-600 text-balance">
              Transforming motorsport entertainment through innovation, technology, and global competition.
            </p>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <motion.div 
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-6">
              <Circle className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Our Vision</h3>
            <p className="text-gray-600">
              To revolutionize motorsport by creating the Greatest Motorcycle racing on the planet.
            </p>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-6">
              <List className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Market Opportunity</h3>
            <p className="text-gray-600">
              The USA is the largest motorcycle market in the world with 40 billion in motorcycle sales and accessories and is ripe for a change.
            </p>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-6">
              <Square className="w-6 h-6 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Business Model</h3>
            <p className="text-gray-600">
              Multi-revenue streams through live events, media rights, sponsorships, merchandise, and digital products with strong licensing potential and no sanctioning fees. Our reliance on strategic partners to lower G & A makes us more capital efficient.
            </p>
          </motion.div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <motion.div 
            className="flex-1"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative h-[400px] rounded-2xl overflow-hidden">
              <div className="absolute inset-0 blur-load" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1461889100534-d5d508639d4c?ixlib=rb-1.2.1&auto=format&fit=crop&w=50&q=20)' }}>
                <img 
                  src="https://images.unsplash.com/photo-1461889100534-d5d508639d4c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80" 
                  alt="Racing team" 
                  className="w-full h-full object-cover"
                  onLoad={(e) => e.currentTarget.parentElement?.classList.add('loaded')}
                />
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            className="flex-1 max-w-xl"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h3 className="text-2xl font-bold mb-6">The World Moto Clash Difference</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs">1</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">One Class the Go Fast Class</h4>
                  <p className="text-gray-600">
                    The Richest Races in History Focused on Fan Experience and Entertainment with No Equipment Rules
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs">2</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">Cutting Edge AI Driven Sports Technology</h4>
                  <p className="text-gray-600">
                    Proprietary racing telemetry and integrated digital platforms providing unparalleled viewer engagement.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs">3</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">Media Innovation</h4>
                  <p className="text-gray-600">
                    Revolutionary broadcast techniques and digital-first content strategy targeting the next generation of motorsport fans.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
