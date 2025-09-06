
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';
import { useInvestNowAction } from '@/hooks/useInvestNowAction';
import TierSelectionDialog from './TierSelectionDialog';

const FloatingCta: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showTierDialog, setShowTierDialog] = useState(false);
  const { handleInvestNowClick } = useInvestNowAction();

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button when page is scrolled 400px
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              onClick={scrollToTop}
              size="icon"
              className="bg-gray-800 hover:bg-gray-700 text-white rounded-full shadow-lg"
            >
              <ArrowUp className="h-5 w-5" />
              <span className="sr-only">Back to top</span>
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <Button
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg px-6"
              onClick={handleInvestNowClick}
            >
              Invest Now
            </Button>
          </motion.div>
        </div>
      )}

      <TierSelectionDialog 
        open={showTierDialog} 
        onOpenChange={setShowTierDialog} 
      />
    </AnimatePresence>
  );
};

export default FloatingCta;
