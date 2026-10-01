import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { getStoredToken, getStoredUser, setStoredAuth, clearStoredAuth } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore state on startup
  useEffect(() => {
    try {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      } else {
        clearStoredAuth();
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Error restoring auth state:', err);
      clearStoredAuth();
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }

    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    if (data.success && data.token && data.user) {
      setStoredAuth(data.token, data.user);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } else {
      throw new Error(data.message || 'Login failed');
    }
  };

  const register = async (name, email, password, role = 'student') => {
    const data = await api.post('/api/auth/register', { name, email, password, role });
    if (data.success && data.token && data.user) {
      setStoredAuth(data.token, data.user);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } else {
      throw new Error(data.message || 'Registration failed');
    }
  };

  const logout = () => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
