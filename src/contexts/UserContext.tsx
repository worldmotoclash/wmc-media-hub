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
  mediaHubAccess: 'Admin' | 'Editor' | 'Viewer';
}

export interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isAdmin: () => boolean;
  isEditor: () => boolean;
  canDelete: (videoUserId: string) => boolean;
}


const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  console.log('UserProvider initializing...');
  const [user, setUser] = useState<User | null>(null);

  const isAdmin = () => user?.mediaHubAccess === 'Admin';
  const isEditor = () => user?.mediaHubAccess === 'Editor' || user?.mediaHubAccess === 'Admin';
  const canDelete = (videoUserId: string) => {
    if (!user) return false;
    return user.mediaHubAccess === 'Admin' || user.id === videoUserId;
  };

  const contextValue = { user, setUser, isAdmin, isEditor, canDelete };
  console.log('UserProvider context value:', contextValue);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  console.log('useUser hook called');
  const context = useContext(UserContext);
  console.log('useUser context:', context);
  if (context === undefined) {
    console.error('useUser called outside of UserProvider!');
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
