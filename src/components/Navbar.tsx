
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnimatedLogo from './AnimatedLogo';
import { useUser } from '@/contexts/UserContext';
import ProfileDropdown from '@/components/ui/profile-dropdown';

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, setUser } = useUser();
  const isHomePage = location.pathname === '/';
  
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 20;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  const handleLogout = () => {
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <motion.header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all-cubic ${
        scrolled 
          ? 'py-2 bg-background/80 backdrop-blur-md shadow-sm' 
          : 'py-4 bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <div className="container mx-auto px-6 flex items-center justify-between">
        <div className="z-10">
          <Link to="/">
            <AnimatedLogo />
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <ProfileDropdown onSignOut={handleLogout} variant="navbar" />
          </motion.div>
        </nav>
        
        <div className="md:hidden">
          <ProfileDropdown onSignOut={handleLogout} variant="navbar" />
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
