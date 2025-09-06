
import React from 'react';
import { motion } from 'framer-motion';
import ContactForm from './contact/ContactForm';
import ContactInfo from './contact/ContactInfo';

const ContactSection: React.FC = () => {
  return (
    <section id="contact" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white to-gray-50 z-0"></div>
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Contact Us</h2>
            <p className="text-lg text-gray-600 text-balance">
              Interested in learning more about investing in World Moto Clash? Our team is ready to answer your questions.
            </p>
          </motion.div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <ContactForm />
          <ContactInfo />
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
