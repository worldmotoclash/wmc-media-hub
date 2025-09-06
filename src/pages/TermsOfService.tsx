
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion } from 'framer-motion';

const TermsOfService: React.FC = () => {
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
          <h1 className="text-3xl md:text-4xl font-bold mb-6">📜 Terms of Service – World Moto Clash</h1>
          <p className="text-gray-600 mb-8">Effective Date: 3-31-2025</p>
          
          <div className="prose max-w-none">
            <p>Welcome to World Moto Clash! By using our website or participating in our community, you agree to the following terms.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
            <p>By accessing our site or services, you agree to these Terms and our Privacy Policy.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">2. Eligibility</h2>
            <p>You must be at least 13 years old to use our platform. Some features may require additional age verification.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">3. User Conduct</h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the site only for lawful purposes.</li>
              <li>Respect the community (no hate speech, harassment, or abuse).</li>
              <li>Not post or share unauthorized content.</li>
            </ul>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">4. Intellectual Property</h2>
            <p>All content on World Moto Clash (logos, videos, designs, etc.) is owned by us or licensed. Don't use it without permission.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">5. Submissions</h2>
            <p>When you submit content (photos, videos, stories), you grant us a non-exclusive right to use it in our media, promotions, and site content.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">6. Disclaimers</h2>
            <p>Use the site at your own risk. We provide content "as is" without warranties.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">7. Limitation of Liability</h2>
            <p>We're not liable for indirect damages or losses arising from your use of the site or services.</p>
            
            <h2 className="text-2xl font-bold mt-8 mb-4">8. Changes to Terms</h2>
            <p>We may update these terms. Continued use means you accept the changes.</p>
            
            <p className="mt-8">Need support? Contact support@worldmotoclash.com.</p>
          </div>
        </div>
      </motion.div>
      <Footer />
    </div>
  );
};

export default TermsOfService;
