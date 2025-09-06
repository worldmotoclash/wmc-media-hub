
import React from 'react';
import { Link } from 'react-router-dom';
import AnimatedLogo from './AnimatedLogo';
import { Shield, FileText, Cookie, Info, Briefcase, Contact } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-16 bg-black text-white">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-5 space-y-6">
            <AnimatedLogo className="text-white" />
            <p className="text-gray-400 max-w-md">
              World Moto Clash is reimagining motorsport entertainment through innovation, technology, and global competition.
            </p>
          </div>
          
          <div className="md:col-span-4">
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/#about" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  About
                </a>
              </li>
              <li>
                <a href="/#investment" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Investment
                </a>
              </li>
              <li>
                <a href="/#contact" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <Contact className="w-4 h-4 mr-2" />
                  Contact
                </a>
              </li>
              <li>
                <Link to="/login" className="text-gray-400 hover:text-white transition-colors flex items-center">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Investor Login
                </Link>
              </li>
            </ul>
          </div>
          
          <div className="md:col-span-3">
            {/* This section is now empty and can be removed if needed */}
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/10 text-gray-400 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            &copy; {currentYear} World Moto Clash. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <Link to="/privacy-policy" className="flex items-center hover:text-white transition-colors">
              <Shield className="w-4 h-4 mr-1" />
              <span>Privacy Policy</span>
            </Link>
            <Link to="/terms-of-service" className="flex items-center hover:text-white transition-colors">
              <FileText className="w-4 h-4 mr-1" />
              <span>Terms of Service</span>
            </Link>
            <Link to="/cookie-policy" className="flex items-center hover:text-white transition-colors">
              <Cookie className="w-4 h-4 mr-1" />
              <span>Cookie Policy</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
