
import React from 'react';
import { motion } from 'framer-motion';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { User, Video, Smartphone } from 'lucide-react';

const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <User className="h-6 w-6" />,
      title: "Racers as Rockstars",
      description: "With backstories, rivalries, and underdog arcs that fans can follow and engage with"
    },
    {
      icon: <Video className="h-6 w-6" />,
      title: "Weekend-Long Events",
      description: "Complete with music, food, fan zones, and live interaction for total immersion"
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Real-Time Data & Views",
      description: "Onboard views and social voting — all powered by our state-of-the-art app"
    }
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
          >
            <div className="relative rounded-lg overflow-hidden shadow-xl">
              <AspectRatio ratio={16/9}>
                <iframe 
                  src="https://drive.google.com/file/d/139MfNgnY1G-cZ2GrK-omxtxUilLmZNtF/preview" 
                  title="WMC Showcase"
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                ></iframe>
              </AspectRatio>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-lg"
          >
            <h2 className="text-3xl font-bold mb-6 dark:text-white">
              💥 Why Now?
            </h2>
            
            <p className="text-lg text-gray-700 mb-8 dark:text-gray-300">
              Motorsports is a $125B+ industry, but it's stuck in neutral. Younger fans crave more than lap times — they want access, drama, and digital depth.
            </p>
            
            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="flex items-start gap-4"
                >
                  <div className="flex-shrink-0 p-2 bg-red-100 rounded-full text-red-600 dark:bg-gray-700 dark:text-red-400">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1 dark:text-white">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
