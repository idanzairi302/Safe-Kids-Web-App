import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setAccessToken, clearAccessToken } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: FormData) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tryRefresh = async () => {
      try {
        const { data } = await api.post('/api/auth/refresh');
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch {
        clearAccessToken();
      } finally {
        setLoading(false);
      }
    };
    tryRefresh();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    await api.post('/api/auth/register', { username, email, password });
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    const { data } = await api.post('/api/auth/google', { credential });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const updateUser = useCallback(async (formData: FormData): Promise<User> => {
    const { data } = await api.put('/api/users/me', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setUser(data);
    return data;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
