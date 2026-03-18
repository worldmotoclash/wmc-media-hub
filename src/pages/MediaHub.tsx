import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import MediaHubHero from '@/components/media/MediaHubHero';
import SearchBar from '@/components/media/SearchBar';
import ActionCards from '@/components/media/ActionCards';
import RecentActivity from '@/components/media/RecentActivity';
import Footer from '@/components/Footer';

const MediaHub: React.FC = () => {
  const { user, isCreator } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!user) {
      toast.error('Please log in to access the WMC Media Hub');
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <MediaHubHero />
      <SearchBar />
      <ActionCards />
      {!isCreator() && (
        <>
          <RecentActivity />
          <RecentUploads />
        </>
      )}
      <Footer />
    </div>
  );
};

export default MediaHub;
