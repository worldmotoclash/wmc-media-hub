import React from 'react';
import { motion } from 'framer-motion';
import { Badge, DollarSign, Percent, Gift } from 'lucide-react';
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription 
} from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const InvestmentTermsSection: React.FC = () => {
  const terms = [
    {
      icon: <DollarSign className="h-6 w-6 text-green-600" />,
      title: "Minimum Investment",
      value: "$500",
      description: "Get started with as little as $500",
      tooltip: "Lower entry point for early supporters of World Moto Clash"
    },
    {
      icon: <Badge className="h-6 w-6 text-blue-600" />,
      title: "Security Type",
      value: "Crowd SAFE",
      description: "Simple Agreement for Future Equity",
      tooltip: "Converts to equity when a triggering event occurs"
    },
    {
      icon: <Percent className="h-6 w-6 text-purple-600" />,
      title: "Valuation Cap",
      value: "$10 million",
      description: "Pre-money valuation cap",
      tooltip: "Sets maximum company valuation for your investment conversion"
    },
    {
      icon: <Gift className="h-6 w-6 text-red-600" />,
      title: "Investor Perks",
      value: "Exclusive Benefits",
      description: "WMC swag, VIP access, NFT race passes, and more",
      tooltip: "Tiered rewards based on investment amount"
    }
  ];

  return (
    <section id="invest" className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <h2 className="text-3xl font-bold mb-6 dark:text-white">
            💸 Investment Terms
          </h2>
          
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Join us as an early investor in the most radical motorsport league since the invention of the superbike.
          </p>
        </motion.div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {terms.map((term, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className="h-full hover:shadow-lg transition-shadow dark:bg-gray-800">
                      <CardHeader className="pb-2">
                        <div className="flex justify-center mb-4">
                          <div className="p-3 bg-gray-100 rounded-full dark:bg-gray-700">
                            {term.icon}
                          </div>
                        </div>
                        <CardTitle className="text-xl text-center mb-1">{term.title}</CardTitle>
                        <CardDescription className="text-center">{term.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{term.value}</p>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{term.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
          <p className="text-xl font-semibold text-gray-800 dark:text-white">
            Own the league. Not just a jersey.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default InvestmentTermsSection;
