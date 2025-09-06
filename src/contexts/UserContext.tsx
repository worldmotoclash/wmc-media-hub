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
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
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
