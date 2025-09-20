import React from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Settings, LogOut, User, ChevronDown, Scissors } from 'lucide-react';

interface ProfileDropdownProps {
  onSignOut: () => void;
  variant?: 'navbar' | 'dashboard';
}

const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ onSignOut, variant = 'navbar' }) => {
  const { user } = useUser();
  const { theme, toggleTheme } = useTheme();
  
  if (!user) {
    return (
      <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
        <Link to="/login">Login</Link>
      </Button>
    );
  }

  if (variant === 'dashboard') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
            <div className="text-sm text-right">
              <div className="font-medium">{user.name}</div>
              <div className="text-muted-foreground">{user.status}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-medium">
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
          <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 hover:bg-accent">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="hidden sm:inline font-medium">{user.name}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm">
          <div className="font-medium">{user.name}</div>
          <div className="text-muted-foreground">{user.email}</div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/admin/media/library">
            <User className="mr-2 h-4 w-4" />
            <span>Media Library</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/admin/media/upload">
            <Settings className="mr-2 h-4 w-4" />
            <span>Upload Content</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/admin/media/scene-detection">
            <Scissors className="mr-2 h-4 w-4" />
            <span>Scene Detection</span>
          </Link>
        </DropdownMenuItem>
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="cursor-pointer text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;