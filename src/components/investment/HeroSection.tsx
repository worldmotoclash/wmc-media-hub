import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useInvestNowAction } from '@/hooks/useInvestNowAction';

const HeroSection: React.FC = () => {
  const { handleInvestNowClick } = useInvestNowAction();

  const handleLearnMore = () => {
    const element = document.getElementById('invest');
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative py-20 bg-gradient-to-br from-gray-900 to-black overflow-hidden">
      <div className="absolute inset-0 bg-[url('/lovable-uploads/sonoma-drone.jpg')] bg-cover bg-center opacity-20"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <motion.div 
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-block bg-red-600 text-white font-bold px-4 py-1 rounded-full mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            🚨 The Future of Motorsports is Now
          </motion.div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            <span className="block">Invest in</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">
              World Moto Clash
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 mb-8">
            A new motorsport league. A global movement. A media revolution.
          </p>
          
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Button 
              size="lg" 
              className="bg-red-600 hover:bg-red-700 text-white text-lg px-8"
              onClick={handleInvestNowClick}
            >
              Invest Now 👉
            </Button>

            <Button 
              variant="outline" 
              size="lg"
              className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 text-lg"
              onClick={handleLearnMore}
            >
              Learn More <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
