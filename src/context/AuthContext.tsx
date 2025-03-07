
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

// User types
export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  role: UserRole;
}

// Mock users for demonstration
const MOCK_USERS = [
  { id: '1', username: 'admin', password: 'admin123', role: 'admin' as UserRole },
  { id: '2', username: 'user', password: 'user123', role: 'user' as UserRole },
];

// Auth context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check for saved auth on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('logisticsUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('logisticsUser');
      }
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const foundUser = MOCK_USERS.find(
      u => u.username === username && u.password === password
    );
    
    if (foundUser) {
      const { password, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      localStorage.setItem('logisticsUser', JSON.stringify(userWithoutPassword));
      toast.success(`Welcome back, ${userWithoutPassword.username}!`);
      setLoading(false);
      return true;
    }
    
    setLoading(false);
    toast.error('Invalid username or password');
    return false;
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('logisticsUser');
    toast.info('You have been logged out');
    navigate('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
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
