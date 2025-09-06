
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AnimatedLogo from '@/components/AnimatedLogo';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Sun, Moon, Settings, LogOut, User } from 'lucide-react';

interface DashboardHeaderProps {
  handleSignOut: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ handleSignOut }) => {
  const { user } = useUser();
  const { theme, toggleTheme } = useTheme();
  
  if (!user) return null;
  
  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="z-10">
          <AnimatedLogo />
        </Link>
        
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
                <div className="text-sm text-right">
                  <div className="font-medium dark:text-white">{user.name}</div>
                  <div className="text-gray-500 dark:text-gray-400">{user.status}</div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-lg font-medium text-gray-700 dark:text-gray-300">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                {theme === 'light' ? (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark Mode</span>
                  </>
                ) : (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light Mode</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-500">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
