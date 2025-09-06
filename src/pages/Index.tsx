
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import MediaHubHero from '@/components/media/MediaHubHero';
import ActionCards from '@/components/media/ActionCards';
import SearchBar from '@/components/media/SearchBar';
import RecentUploads from '@/components/media/RecentUploads';
import Footer from '@/components/Footer';

const Index: React.FC = () => {
  const { user } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    // Redirect if no user is logged in
    if (!user) {
      toast.error('Please log in to access the WMC Media Hub');
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <MediaHubHero />
      <ActionCards />
      <SearchBar />
      <RecentUploads />
      <Footer />
    </div>
  );
};

export default Index;
