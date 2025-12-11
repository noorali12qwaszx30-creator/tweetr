import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  role: UserRole | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name')
        .eq('user_id', userId)
        .maybeSingle();

      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      return {
        username: profile?.username || '',
        fullName: profile?.full_name || null,
        role: roleData?.role as UserRole | null,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { username: '', fullName: null, role: null };
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        if (session?.user) {
          // Defer Supabase calls with setTimeout to avoid deadlock
          setTimeout(async () => {
            const profile = await fetchUserProfile(session.user.id);
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              username: profile.username,
              fullName: profile.fullName,
              role: profile.role,
            });
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      
      if (session?.user) {
        fetchUserProfile(session.user.id).then(profile => {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: profile.username,
            fullName: profile.fullName,
            role: profile.role,
          });
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<{ error: string | null }> => {
    try {
      // Convert username to email format for Supabase auth
      const email = `${username.toLowerCase().trim()}@restaurant.local`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
        }
        return { error: error.message };
      }

      // Check if user is active
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (profile && profile.is_active === false) {
          // Sign out the user immediately
          await supabase.auth.signOut();
          return { error: 'هذا الحساب معطّل. تواصل مع المدير التنفيذي' };
        }
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'حدث خطأ غير متوقع' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      login, 
      logout, 
      isAuthenticated: !!session 
    }}>
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