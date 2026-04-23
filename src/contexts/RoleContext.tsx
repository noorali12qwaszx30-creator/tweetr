import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface RoleContextType {
  role: UserRole | null;
  setRole: (role: UserRole) => void;
  clearRole: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [role, setRoleState] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('selectedRole');
    return saved as UserRole | null;
  });

  // Always trust the database role from AuthContext over the localStorage value.
  // This prevents a user from elevating privileges by editing localStorage in DevTools.
  useEffect(() => {
    if (!isAuthenticated) {
      setRoleState(null);
      localStorage.removeItem('selectedRole');
      return;
    }
    if (user?.role) {
      const stored = localStorage.getItem('selectedRole') as UserRole | null;
      if (stored !== user.role) {
        // Stored role does not match the actual DB role — overwrite.
        localStorage.setItem('selectedRole', user.role);
        setRoleState(user.role);
      } else if (role !== user.role) {
        setRoleState(user.role);
      }
    }
  }, [user?.role, isAuthenticated]);

  const setRole = (newRole: UserRole) => {
    // Only allow setting a role that matches the user's actual DB role.
    if (user?.role && newRole !== user.role) {
      console.warn('Attempted to set role that does not match DB role; ignoring.');
      return;
    }
    setRoleState(newRole);
    localStorage.setItem('selectedRole', newRole);
  };

  const clearRole = () => {
    setRoleState(null);
    localStorage.removeItem('selectedRole');
  };

  return (
    <RoleContext.Provider value={{ role, setRole, clearRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
