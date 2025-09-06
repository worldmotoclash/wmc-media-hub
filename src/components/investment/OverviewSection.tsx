
import React from 'react';
import { motion } from 'framer-motion';
import { Bike, Tv, Users, Music } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const OverviewSection: React.FC = () => {
  const features = [
    {
      icon: <Bike className="h-8 w-8 text-red-500" />,
      title: "Electrifying Races",
      description: "Head-to-head battles on custom superbikes"
    },
    {
      icon: <Tv className="h-8 w-8 text-red-500" />,
      title: "Cinematic Storytelling",
      description: "Live-streamed with rider cams and dramatic narratives"
    },
    {
      icon: <Users className="h-8 w-8 text-red-500" />,
      title: "AI-Powered Engagement",
      description: "Real-time telemetry and digital collectibles"
    },
    {
      icon: <Music className="h-8 w-8 text-red-500" />,
      title: "Complete Experience",
      description: "Hosted by Norman Reedus with an immersive atmosphere"
    }
  ];

  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-6 dark:text-white">
            🏁 What Is World Moto Clash?
          </h2>
          
          <p className="text-xl text-gray-700 dark:text-gray-300">
            World Moto Clash (WMC) is America's first motorsports entertainment league built for the modern fan. Imagine if MotoGP, American Idol, and Burning Man collided. That's WMC.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow dark:bg-gray-800">
                <CardContent className="pt-6 flex flex-col items-center text-center">
                  <div className="mb-4 p-3 bg-red-50 rounded-full dark:bg-gray-700">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 dark:text-white">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-12 text-center"
        >
          <p className="text-xl font-semibold italic text-gray-800 dark:text-gray-200">
            "This isn't just a race. It's a rebellion on wheels."
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default OverviewSection;
