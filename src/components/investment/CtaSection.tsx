
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useInvestNowAction } from '@/hooks/useInvestNowAction';
import TierSelectionDialog from './TierSelectionDialog';

const CtaSection: React.FC = () => {
  const { handleInvestNowClick } = useInvestNowAction();
  const [showTierDialog, setShowTierDialog] = useState(false);

  return (
    <section className="py-24 bg-gray-900 text-white">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl font-bold mb-6">
            👊 Join the Clash
          </h2>
          
          <p className="text-xl text-gray-300 mb-6">
            Become an early investor in the most radical motorsport league since the invention of the superbike.
          </p>
          
          <div className="mb-12">
            <Button 
              size="lg" 
              className="bg-red-600 hover:bg-red-700 text-white text-xl px-10 py-6"
              onClick={handleInvestNowClick}
            >
              Invest Now 👉
            </Button>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-2xl font-bold mb-2">💥 WMC isn't just a league. It's a movement.</p>
            <p className="text-2xl font-bold text-red-500">Are you in?</p>
          </motion.div>
        </motion.div>
      </div>

      <TierSelectionDialog 
        open={showTierDialog} 
        onOpenChange={setShowTierDialog} 
      />
    </section>
  );
};

export default CtaSection;
