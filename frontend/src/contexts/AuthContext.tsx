/**
 * Authentication Context
 * Provides global authentication state and methods throughout the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
  isTokenExpired,
} from '../utils/tokenStorage';
import { extractErrorMessage } from '../utils/apiErrors';

// User type definition
export interface User {
  _id: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'STUDENT' | 'ORGANIZER' | 'ADMIN';
  university?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasRole: (role: string | string[]) => boolean;
}

// Register data type
export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  university?: string;
  role?: 'STUDENT' | 'ORGANIZER' | 'ADMIN';
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Check if user has required role(s)
   */
  const hasRole = useCallback((role: string | string[]): boolean => {
    if (!user) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(user.role);
  }, [user]);

  /**
   * Fetch current user profile
   */
  const fetchUserProfile = useCallback(async (): Promise<User | null> => {
    try {
      const response = await api.get('/auth/me');
      if (response.data?.success && response.data?.data?.user) {
        return response.data.data.user;
      }
      return null;
    } catch (error: any) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  }, []);

  /**
   * Refresh user profile from API
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const userData = await fetchUserProfile();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [fetchUserProfile]);

  /**
   * Initialize authentication state
   * Checks for existing tokens and validates them
   */
  const initializeAuth = useCallback(async (): Promise<void> => {
    try {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      // No tokens available
      if (!accessToken || !refreshToken) {
        setIsLoading(false);
        return;
      }

      // Check if access token is expired
      if (isTokenExpired(accessToken)) {
        // Access token expired, but we have refresh token
        // The API interceptor will handle the refresh
        // Try to fetch user profile which will trigger refresh if needed
        const userData = await fetchUserProfile();
        if (userData) {
          setUser(userData);
        } else {
          // Refresh failed, clear tokens
          clearTokens();
        }
      } else {
        // Access token is valid, fetch user profile
        const userData = await fetchUserProfile();
        if (userData) {
          setUser(userData);
        } else {
          // Failed to fetch user, clear tokens
          clearTokens();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile]);

  /**
   * Login user
   */
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/login', { email, password });

      if (response.data?.success && response.data?.data) {
        const { user: userData, accessToken, refreshToken } = response.data.data;

        // Store tokens
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);

        // Set user state
        setUser(userData);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (userData: RegisterData): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/register', userData);

      if (response.data?.success && response.data?.data) {
        const { user: newUser, accessToken, refreshToken } = response.data.data;

        // Store tokens
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);

        // Set user state
        setUser(newUser);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      const errorMessage = extractErrorMessage(error);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Logout user
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      // Call logout endpoint to invalidate refresh token on server
      try {
        await api.post('/auth/logout');
      } catch (error) {
        // Even if logout API call fails, clear local tokens
        console.error('Logout API call failed:', error);
      }

      // Clear tokens and user state
      clearTokens();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API call fails
      clearTokens();
      setUser(null);
    }
  }, []);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Set up token expiration check
  useEffect(() => {
    if (!user) return;

    const checkTokenExpiration = () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      if (!accessToken || !refreshToken) {
        logout();
        return;
      }

      // If both tokens are expired, logout
      if (isTokenExpired(accessToken) && isTokenExpired(refreshToken)) {
        logout();
      }
    };

    // Check every minute
    const interval = setInterval(checkTokenExpiration, 60000);

    return () => clearInterval(interval);
  }, [user, logout]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

