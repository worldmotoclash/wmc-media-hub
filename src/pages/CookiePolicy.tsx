
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';

const CookiePolicy: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-grow container mx-auto px-6 pt-24 pb-12" // Added pt-24 for top padding
      >
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-6">🍪 Cookie Policy – World Moto Clash</h1>
          <p className="text-gray-600 mb-8">Effective Date: 3-31-2025</p>
          
          <div className="prose max-w-none">
            <p>We use cookies and similar technologies to improve your experience on World Moto Clash.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">1. What Are Cookies?</h2>
            <p>Cookies are small files stored on your device that help websites remember your preferences and track performance.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">2. Types of Cookies We Use</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Essential Cookies:</strong> Needed for site functionality.</li>
              <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the site.</li>
              <li><strong>Marketing Cookies:</strong> Personalize content and track ad effectiveness.</li>
            </ul>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">3. How to Manage Cookies</h2>
            <p>You can control cookies through your browser settings. Some features may not work correctly if cookies are disabled.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">4. Third-Party Cookies</h2>
            <p>We may use services like Google Analytics or social media embeds that place their own cookies.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">5. Updates</h2>
            <p>We may revise this policy as needed. Check this page for the latest version.</p>
          </div>
        </div>
      </motion.div>
      <Footer />
    </div>
  );
};

export default CookiePolicy;
