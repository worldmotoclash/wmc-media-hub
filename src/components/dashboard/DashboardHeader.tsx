
import React from 'react';
import { Link } from 'react-router-dom';
import AnimatedLogo from '@/components/AnimatedLogo';
import { useUser } from '@/contexts/UserContext';
import ProfileDropdown from '@/components/ui/profile-dropdown';

interface DashboardHeaderProps {
  handleSignOut: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ handleSignOut }) => {
  const { user } = useUser();
  
  if (!user) return null;
  
  return (
    <header className="bg-card border-b border-border">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="z-10">
          <AnimatedLogo />
        </Link>
        
        <div className="flex items-center gap-4">
          <ProfileDropdown onSignOut={handleSignOut} variant="dashboard" />
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
