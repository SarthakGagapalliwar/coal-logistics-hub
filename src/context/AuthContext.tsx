import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// User types
export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  email?: string;
}

// Auth context type
interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, username: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize auth state from Supabase session
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      // Check for existing session
      const { data } = await supabase.auth.getSession();
      
      if (data.session) {
        await setUserFromSession(data.session);
      }
      
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            await setUserFromSession(session);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
          }
        }
      );
      
      setLoading(false);
      
      // Cleanup subscription
      return () => {
        subscription.unsubscribe();
      };
    };
    
    initializeAuth();
  }, []);

  // Helper to convert Supabase user to our app user
  const setUserFromSession = async (session: Session) => {
    const supabaseUser = session.user;
    
    if (!supabaseUser) return;
    
    // Fetch user role from profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('role, username')
      .eq('id', supabaseUser.id)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      return;
    }
    
    // Set user with data from auth and profile
    setUser({
      id: supabaseUser.id,
      username: data?.username || supabaseUser.email?.split('@')[0] || 'user',
      role: (data?.role as UserRole) || 'user',
      email: supabaseUser.email
    });
  };

  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return false;
      }
      
      if (data?.user) {
        toast.success(`Welcome back!`);
        setLoading(false);
        return true;
      }
      
      setLoading(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred during login');
      setLoading(false);
      return false;
    }
  };

  // Signup function
  const signup = async (email: string, password: string, username: string): Promise<boolean> => {
    setLoading(true);
    
    try {
      // 1. Register user in Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password.trim(),
        options: {
          data: {
            username: username.trim()
          }
        }
      });
      
      if (error) {
        console.error('Signup error:', error);
        toast.error(error.message);
        setLoading(false);
        return false;
      }
      
      if (data?.user) {
        // 2. Create a profile record for the user
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: data.user.id,
              username: username.trim(), 
              role: 'user',
              created_at: new Date().toISOString(),
            }
          ]);
          
        if (profileError) {
          console.error('Profile creation error:', profileError);
          toast.error('Failed to create user profile');
          setLoading(false);
          return false;
        }
        
        toast.success('Account created successfully! Please verify your email.');
        setLoading(false);
        return true;
      }
      
      setLoading(false);
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('An unexpected error occurred during signup');
      setLoading(false);
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast.error('Error signing out');
      return;
    }
    
    setUser(null);
    toast.info('You have been logged out');
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
