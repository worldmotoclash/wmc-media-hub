import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Bike, Trophy, User, LogOut } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/racer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/racer/application', label: 'Application', icon: FileText },
  { to: '/racer/motorcycle', label: 'Motorcycle', icon: Bike },
  { to: '/racer/qualification', label: 'Qualification', icon: Trophy },
  { to: '/racer/profile', label: 'Profile', icon: User },
];

interface RacerPortalLayoutProps {
  children: React.ReactNode;
}

const RacerPortalLayout: React.FC<RacerPortalLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleSignOut = () => {
    sessionStorage.removeItem('racerUser');
    navigate('/racer/login');
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background dark">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-50 bg-card border-b border-border">
          <div className="px-4 py-3">
            <h1 className="text-lg font-bold racing-gradient-text">WMC PORTAL</h1>
          </div>
          <div className="flex overflow-x-auto gap-1 px-3 pb-2 scrollbar-hide">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )
                }
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
        <main className="p-4">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark flex">
      {/* Desktop sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col fixed inset-y-0 left-0 z-40">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold racing-gradient-text tracking-wider">WMC PORTAL</h1>
          <p className="text-xs text-muted-foreground mt-1">Racer Application System</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  );
};

export default RacerPortalLayout;
