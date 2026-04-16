import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the user type based on the XML feed structure
export interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  phone?: string;
  mobile?: string;
  mailingstreet?: string;
  ipaddress?: string;
  ndaSigned?: boolean;
  mediaHubAccess: 'Admin' | 'Editor' | 'Viewer' | 'Creator';
  role?: 'racer' | 'admin' | 'investor';
}

export interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAdmin: () => boolean;
  isEditor: () => boolean;
  isCreator: () => boolean;
  isViewer: () => boolean;
  canDelete: (videoUserId: string) => boolean;
}


const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('wmcUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('wmcUser', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('wmcUser');
    }
  };

  const isAdmin = () => user?.mediaHubAccess === 'Admin';
  const isEditor = () => ['Admin', 'Editor', 'Creator'].includes(user?.mediaHubAccess || '');
  const isCreator = () => user?.mediaHubAccess === 'Creator';
  const isViewer = () => user?.mediaHubAccess === 'Viewer';
  const canDelete = (videoUserId: string) => {
    if (!user) return false;
    return user.mediaHubAccess === 'Admin' || user.id === videoUserId;
  };

  return (
    <UserContext.Provider value={{ user, setUser, isAdmin, isEditor, isCreator, isViewer, canDelete }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
