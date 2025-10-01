
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import AnimatedLogo from './AnimatedLogo';
import { Shield, FileText, Cookie, Upload, FolderOpen, Briefcase } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

const Footer: React.FC = () => {
  const { user } = useUser();
  const location = useLocation();
  const currentYear = new Date().getFullYear();
  
  // Hide investor portal link on media hub pages
  const isMediaHubPage = location.pathname === '/' || location.pathname.startsWith('/admin/media');
  
  return (
    <footer className="py-16 bg-woodsmoke text-white">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-5 space-y-6">
            <AnimatedLogo className="text-white" />
            <p className="text-gray-400 max-w-md">
              World Moto Clash Media Hub - Central platform for managing and exploring WMC media content. 
              Experience the future of motorsports media management.
            </p>
          </div>
          
          <div className="md:col-span-4">
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {user ? (
                <>
                  <li>
                    <Link to="/admin/media/library" className="text-gray-400 hover:text-white transition-colors flex items-center">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Media Library
                    </Link>
                  </li>
                  <li>
                    <Link to="/admin/media/upload" className="text-gray-400 hover:text-white transition-colors flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Content
                    </Link>
                  </li>
                  {!isMediaHubPage && (
                    <li>
                      <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors flex items-center">
                        <Briefcase className="w-4 h-4 mr-2" />
                        Investor Portal
                      </Link>
                    </li>
                  )}
                  <li>
                    <a 
                      href="https://worldmotoclash.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-white transition-colors flex items-center"
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Main Site
                    </a>
                  </li>
                </>
              ) : (
                <li>
                  <Link to="/login" className="text-gray-400 hover:text-white transition-colors flex items-center">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Login
                  </Link>
                </li>
              )}
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
