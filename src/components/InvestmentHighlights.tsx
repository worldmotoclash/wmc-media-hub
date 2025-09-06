import React from 'react';
import { motion } from 'framer-motion';

const InvestmentHighlights: React.FC = () => {
  return (
    <section id="investment" className="py-24 bg-science-blue text-white relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-1/3 h-1/3 bg-gradient-to-br from-science-blue/50 to-transparent opacity-30 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-science-blue/50 to-transparent opacity-30 rounded-full blur-3xl transform translate-x-1/4 translate-y-1/4"></div>
      </div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Investment Opportunity</h2>
            <p className="text-lg text-white/80 text-balance">
              A unique opportunity to participate in the future of motorsport entertainment during our Series A funding round.
            </p>
          </motion.div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="rounded-2xl p-8 bg-white/10 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-4">Investment Benefits</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-white mt-1 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span>Priority access to premier hospitality at all events</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-white mt-1 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span>Exclusive investor events with teams and riders</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-white mt-1 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span>Early access to limited-edition merchandise</span>
                </li>
              </ul>
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-4">Exit Strategy</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-white mt-1 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span>Strategic acquisition by major sports/media conglomerate</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-white mt-1 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span>Strategic investment in 5-7 year timeframe</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-white mt-1 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span>Continued private growth with dividend distribution</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default InvestmentHighlights;
