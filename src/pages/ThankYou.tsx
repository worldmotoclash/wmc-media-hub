
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

const ThankYou: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex-grow flex items-center justify-center py-20 px-6"
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-8">
            <svg className="w-10 h-10 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Thank You!</h1>
          
          <p className="text-xl text-gray-600 mb-10">
            Your message has been successfully submitted. Our investor relations team will contact you soon.
          </p>
          
          <div className="space-y-4">
            <Button 
              onClick={() => navigate('/')} 
              className="bg-black hover:bg-black/80 text-white px-8"
            >
              Return to Home
            </Button>
            
            <p className="text-sm text-gray-500 mt-8">
              If you have any urgent inquiries, please contact us directly at 
              <a href="mailto:investors@worldmotoclash.com" className="text-black font-medium hover:underline ml-1">
                investors@worldmotoclash.com
              </a>
            </p>
          </div>
        </div>
      </motion.main>
      
      <Footer />
    </div>
  );
};

export default ThankYou;
