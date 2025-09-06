
import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';

const TractionSection: React.FC = () => {
  const achievements = [
    "Mobile/TV App MVP complete",
    "Salesforce-powered racer portal live",
    "Top-tier mentors signed: Colin Edwards, Gregg Smrz, Miguel Duhamel",
    "Media partnership talks underway",
    "Initial brand interest from Kawasaki"
  ];

  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 lg:order-1"
          >
            <h2 className="text-3xl font-bold mb-6 dark:text-white">
              📈 Traction & Momentum
            </h2>
            
            <div className="space-y-4 mb-8">
              {achievements.map((item, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="p-1 bg-green-100 rounded-full text-green-600 dark:bg-green-900 dark:text-green-400">
                    <Check className="h-5 w-5" />
                  </div>
                  <span className="text-lg text-gray-800 dark:text-gray-200">{item}</span>
                </motion.div>
              ))}
            </div>
            
            <p className="text-lg text-gray-700 dark:text-gray-300">
              We've been building steadily, forming partnerships and developing the technology that will power the next generation of motorsports entertainment.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-2"
          >
            <div className="relative rounded-lg overflow-hidden shadow-xl">
              <AspectRatio ratio={16/9}>
                <img 
                  src="/lovable-uploads/miguel-podium.jpg" 
                  alt="Miguel Podium" 
                  className="w-full h-full object-cover"
                />
              </AspectRatio>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default TractionSection;
