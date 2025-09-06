
import React, { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import InvestmentHighlights from '@/components/InvestmentHighlights';
import ContactSection from '@/components/contact/ContactSection';
import Footer from '@/components/Footer';

const Index: React.FC = () => {
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Handle anchor links in URL
    const handleAnchorLink = () => {
      const hash = window.location.hash.substring(1);
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            const navbarHeight = 80; // Approximate navbar height
            const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
            const offsetPosition = elementPosition - navbarHeight;
            
            window.scrollTo({
              top: offsetPosition,
              behavior: "smooth"
            });
          }
        }, 100);
      }
    };

    handleAnchorLink();
    window.addEventListener('hashchange', handleAnchorLink);
    
    // Handle lazy loading of images
    const blurDivs = document.querySelectorAll('.blur-load');
    blurDivs.forEach(div => {
      const img = div.querySelector('img');
      
      function loaded() {
        div.classList.add('loaded');
      }
      
      if (img?.complete) {
        loaded();
      } else {
        img?.addEventListener('load', loaded);
      }
    });
    
    // Fix to handle form redirections from Salesforce
    if (window.location.pathname === "/thankyouinvestor") {
      window.location.href = "/thankyou";
    }
    
    return () => {
      blurDivs.forEach(div => {
        const img = div.querySelector('img');
        img?.removeEventListener('load', () => div.classList.add('loaded'));
      });
      window.removeEventListener('hashchange', handleAnchorLink);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <InvestmentHighlights />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Index;
