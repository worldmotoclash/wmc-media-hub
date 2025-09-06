import React from 'react';
import { motion } from 'framer-motion';

const ContactInfo: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="space-y-8"
    >
      <div>
        <h3 className="text-2xl font-bold mb-6">Investor Relations</h3>
        
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-1">Phone</h4>
              <p className="text-gray-600">+1 (855) WMC-MOTO - (855-962-6686)</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-1">Email</h4>
              <p className="text-gray-600">investors@worldmotoclash.com</p>
              <p className="text-sm text-gray-500 mt-1">We'll respond within 24 hours</p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-1">Headquarters</h4>
              <p className="text-gray-600">Palo Alto, California </p>
              <p className="text-sm text-gray-500 mt-1">By appointment only</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-100 p-6 rounded-xl">
        <h4 className="text-lg font-semibold mb-4">Next Steps</h4>
        <p className="text-gray-600 mb-4">
          Contact us by either filling out the form or calling 855-WMC-MOTO, our investor relations team will:
        </p>
        <ol className="space-y-2 list-decimal list-inside text-gray-600">
          <li>Schedule an initial consultation</li>
          <li>Provide detailed investment documentation</li>
          <li>Arrange a meeting with our executive team</li>
          <li>Guide you through the investment process</li>
        </ol>
      </div>
    </motion.div>
  );
};

export default ContactInfo;
