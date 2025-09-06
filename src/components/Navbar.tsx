
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnimatedLogo from './AnimatedLogo';
import { Button } from '@/components/ui/button';

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
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

  const scrollToSection = (id: string) => {
    if (!isHomePage) {
      // Redirect to home page with section hash
      window.location.href = `/#${id}`;
      return;
    }
    
    const element = document.getElementById(id);
    if (element) {
      const navbarHeight = 80; // Approximate navbar height
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - navbarHeight;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <motion.header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all-cubic ${
        scrolled 
          ? 'py-2 bg-white/80 backdrop-blur-md shadow-sm' 
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
            <button
              onClick={() => scrollToSection('about')}
              className="text-sm font-medium hover:text-gray-600 transition-colors"
            >
              About
            </button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <button
              onClick={() => scrollToSection('investment')}
              className="text-sm font-medium hover:text-gray-600 transition-colors"
            >
              Investment
            </button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <button
              onClick={() => scrollToSection('contact')}
              className="text-sm font-medium hover:text-gray-600 transition-colors"
            >
              Register
            </button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <Button asChild className="bg-science-blue hover:bg-science-blue/80 text-white rounded-md">
              <Link to="/login">Investor Login</Link>
            </Button>
          </motion.div>
        </nav>
        
        <div className="md:hidden">
          <Button asChild variant="outline" className="border-science-blue text-science-blue hover:bg-science-blue/5">
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
