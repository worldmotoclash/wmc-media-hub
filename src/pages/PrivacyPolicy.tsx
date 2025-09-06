
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';

const PrivacyPolicy: React.FC = () => {
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
          <h1 className="text-3xl md:text-4xl font-bold mb-6">🌐 Privacy Policy – World Moto Clash</h1>
          <p className="text-gray-600 mb-8">Effective Date: 3-31-2025</p>
          
          <div className="prose max-w-none">
            <p>World Moto Clash ("we," "us," or "our") respects your privacy. This Privacy Policy explains how we collect, use, share, and protect your information when you visit our website, participate in events, or use our services.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect</h2>
            <p><strong>Personal Info:</strong> Name, email address, social media handles, or any info you provide when signing up.</p>
            <p><strong>Usage Data:</strong> IP address, browser type, device info, interaction with the site.</p>
            <p><strong>Optional Data:</strong> Surveys, user-generated content (photos/videos), or race participation data.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">2. How We Use Your Info</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To deliver services and personalize your experience.</li>
              <li>To communicate with you (updates, events, marketing).</li>
              <li>To improve our content and platform performance.</li>
              <li>For legal and security purposes.</li>
            </ul>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">3. Sharing Your Info</h2>
            <p>We do not sell your personal data. We may share data with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Service providers who help operate our platform (e.g., hosting, analytics).</li>
              <li>Law enforcement if required by law.</li>
              <li>Partners with your explicit consent.</li>
            </ul>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">4. Your Rights</h2>
            <p>Depending on your location, you may have rights to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access or delete your data.</li>
              <li>Opt out of marketing emails.</li>
              <li>Request correction or restriction of use.</li>
            </ul>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">5. Data Security</h2>
            <p>We use encryption, access controls, and secure hosting to protect your data.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">6. Children's Privacy</h2>
            <p>World Moto Clash is not directed to children under 13. We don't knowingly collect data from minors.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">7. Changes</h2>
            <p>We'll update this Privacy Policy as needed. We'll notify you of significant changes.</p>
            
            <p className="mt-8">Questions? Contact us at support@worldmotoclash.com.</p>
          </div>
        </div>
      </motion.div>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
