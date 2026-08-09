"use client";

import React from 'react';
import { authApi, AuthUser } from '@/services/api';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = 'auth_token';

// Small helper to pull a readable message out of an axios error
const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response
      ?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data
      .message;
  }
  return fallback;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [token, setToken] = React.useState<string | null>(
    localStorage.getItem(TOKEN_KEY)
  );
  const [isLoading, setIsLoading] = React.useState(true);

  // On mount (or whenever the token changes), fetch the logged-in user's
  // details from the database so the UI always reflects real stored data.
  React.useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const response = await authApi.getMe();
        const fetchedUser = response.data.data.user;
        setUser(fetchedUser);
        syncLegacyStorage(fetchedUser);
      } catch (error) {
        // Token invalid/expired - clear everything
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Keep the legacy localStorage keys other components read from in sync,
  // so existing UI (Navbar, ProfileHeader, etc.) keeps working.
  const syncLegacyStorage = (u: AuthUser) => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user_name', u.name);
    localStorage.setItem('user_email', u.email);
    window.dispatchEvent(new Event('storage'));
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      const { token: newToken, user: loggedInUser } = response.data.data;

      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(loggedInUser);
      syncLegacyStorage(loggedInUser);

      return loggedInUser;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Invalid email or password'));
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      await authApi.register({ name, email, password });
      // Auto sign-in right after a successful sign-up
      return await login(email, password);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to create account'));
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event('storage'));
  };

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
