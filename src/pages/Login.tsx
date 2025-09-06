
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import AnimatedLogo from '@/components/AnimatedLogo';
import LoginForm from '@/components/LoginForm';

const Login: React.FC = () => {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Background gradient effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-bl from-gray-100 to-transparent opacity-70 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-2/3 h-2/3 bg-gradient-to-tr from-gray-100 to-transparent opacity-70 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/4"></div>
      </div>
      
      <div className="z-10 w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <AnimatedLogo />
          </Link>
        </div>
        
        <LoginForm />
        
        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <Link to="/" className="text-sm text-gray-600 hover:text-black transition-colors inline-flex items-center">
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Return to Homepage
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
