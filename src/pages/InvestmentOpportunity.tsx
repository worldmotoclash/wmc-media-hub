import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import HeroSection from '@/components/investment/HeroSection';
import OverviewSection from '@/components/investment/OverviewSection';
import FeaturesSection from '@/components/investment/FeaturesSection';
import MarketSection from '@/components/investment/MarketSection';
import TractionSection from '@/components/investment/TractionSection';
import InvestmentTermsSection from '@/components/investment/InvestmentTermsSection';
import CtaSection from '@/components/investment/CtaSection';
import FloatingCta from '@/components/investment/FloatingCta';

import PerksSection from '@/components/investment/PerksSection';

const InvestmentOpportunity: React.FC = () => {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Redirect if no user is logged in
    if (!user) {
      toast.error('Please log in to access this page');
      navigate('/login');
    }
  }, [user, navigate]);

  const handleSignOut = () => {
    setUser(null);
    toast.success('Successfully logged out');
    navigate('/');
  };

  if (!user) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DashboardHeader handleSignOut={handleSignOut} />
      
      <motion.main
        className="pt-8 pb-24" 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <HeroSection />
        <OverviewSection />
        <FeaturesSection />
        <MarketSection />
        <TractionSection />
        <InvestmentTermsSection />
        <PerksSection />
        <CtaSection />
        <FloatingCta />
      </motion.main>
    </div>
  );
};

export default InvestmentOpportunity;
