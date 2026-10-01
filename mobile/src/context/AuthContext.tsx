import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import { getAccessToken, saveTokens, clearTokens } from '../storage/authStorage';
import { router } from 'expo-router';
import { loadCrmDirectory } from '../utils/crmUserDirectory';

type User = {
  id: number;
  name: string;
  username?: string;
  email: string;
  role: string;
  companyId: number;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('[AuthContext] Initializing, checking auth state...');
    checkAuth();
  }, []);

  const checkAuth = async () => {
    console.log('[AuthContext] checkAuth invoked');
    try {
      const token = await getAccessToken();
      if (token) {
        console.log('[AuthContext] Access token found. Fetching /auth/me...');
        const res = await apiClient.get('/auth/me');
        if (res.data?.success && res.data?.user) {
          console.log('[AuthContext] /auth/me successful, setting user:', res.data.user.name);
          setUser(res.data.user);
          await loadCrmDirectory(token).catch(err => console.error('Failed to load CRM directory', err));
        } else {
          console.log('[AuthContext] /auth/me failed or no user returned. Clearing tokens.');
          await clearTokens();
          setUser(null);
        }
      } else {
        console.log('[AuthContext] No access token found');
      }
    } catch (error) {
      console.log('[AuthContext] Auth check failed with error:', error);
      await clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
      console.log('[AuthContext] Initial auth check complete, isLoading set to false');
    }
  };

  const login = async (credentials: any) => {
    console.log('[AuthContext] login invoked with username:', credentials.username);
    try {
      console.log('[AuthContext] Sending POST to /auth/login...');
      const res = await apiClient.post('/auth/login', {
        ...credentials,
        clientType: 'mobile',
      });
      console.log('[AuthContext] Raw response received. Status:', res.status);
      if (res.data?.success) {
        console.log('[AuthContext] Login API call successful, updating state');
        setUser(res.data.user);
        if (res.data.tokens) {
          await saveTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
          console.log('[AuthContext] Tokens saved securely');
          await loadCrmDirectory(res.data.tokens.accessToken).catch(err => console.error('Failed to load CRM directory', err));
        }
        if (res.data.user.role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else {
          router.replace('/(tabs)/dashboard');
        }
      } else {
        console.log('[AuthContext] Login failed: success flag is false in response data', JSON.stringify(res.data));
        throw new Error('Login failed: Invalid response from server');
      }
    } catch (error: any) {
      console.log('[AuthContext] Login API call failed with exception!');
      console.log('[AuthContext] Exception Stack:', error.stack || 'No stack trace');
      if (error.response) {
         console.log('[AuthContext] Exception Response Body:', JSON.stringify(error.response.data));
      }
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  };

  const logout = async () => {
    console.log('[AuthContext] logout invoked');
    try {
      await apiClient.post('/auth/logout');
      console.log('[AuthContext] /auth/logout API successful');
    } catch (error) {
      console.log('[AuthContext] Logout API error:', error);
    } finally {
      console.log('[AuthContext] Clearing tokens and replacing router to /login');
      await clearTokens();
      setUser(null);
      router.replace('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
