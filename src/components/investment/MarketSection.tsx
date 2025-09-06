
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, PieChart, Users, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const MarketSection: React.FC = () => {
  const opportunities = [
    {
      icon: <TrendingUp className="h-6 w-6 text-red-500" />,
      title: "Finalize Cross-Platform App",
      description: "Complete development of our revolutionary viewer experience"
    },
    {
      icon: <PieChart className="h-6 w-6 text-red-500" />,
      title: "Launch Live Events",
      description: "Begin our race calendar in California, Texas, and Florida"
    },
    {
      icon: <Users className="h-6 w-6 text-red-500" />,
      title: "Build Content Studio",
      description: "Create our AI-driven fan platform and storytelling hub"
    },
    {
      icon: <Wallet className="h-6 w-6 text-red-500" />,
      title: "Equip Rider Teams",
      description: "Train and outfit the first clash rider teams"
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
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <h2 className="text-3xl font-bold mb-6 dark:text-white">
            🧨 The Opportunity
          </h2>
          
          <p className="text-lg text-gray-700 dark:text-gray-300">
            We're offering early supporters the chance to own a piece of this revolution. Your investment helps us realize the full potential of World Moto Clash and transform motorsports entertainment.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {opportunities.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-2 hover:border-red-400 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:hover:border-red-400">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-2 bg-red-50 rounded-full dark:bg-gray-700">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2 dark:text-white">{item.title}</h3>
                      <p className="text-gray-600 dark:text-gray-300">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
            This is a rare opportunity to get in before the first flag drops.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default MarketSection;
