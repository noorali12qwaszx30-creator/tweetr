import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, role: UserRole) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users for testing
const DEMO_USERS: Record<string, { password: string; role: UserRole }> = {
  'cashier': { password: '1234', role: 'cashier' },
  'field': { password: '1234', role: 'field' },
  'delivery': { password: '1234', role: 'delivery' },
  'takeaway': { password: '1234', role: 'takeaway' },
  'kitchen': { password: '1234', role: 'kitchen' },
  'admin': { password: 'admin', role: 'admin' },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (username: string, password: string, role: UserRole): boolean => {
    // For demo purposes, accept any credentials with the selected role
    // In production, this would validate against the backend
    const demoUser = DEMO_USERS[username];
    if (demoUser && demoUser.password === password && demoUser.role === role) {
      setUser({
        id: `user-${Date.now()}`,
        username,
        role,
      });
      return true;
    }
    
    // Allow any user with password "1234" for demo
    if (password === '1234') {
      setUser({
        id: `user-${Date.now()}`,
        username,
        role,
      });
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
