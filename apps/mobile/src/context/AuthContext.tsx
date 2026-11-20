import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole } from '@resortos/shared';
import {
  api,
  ApiError,
  getStoredToken,
  storeToken,
  removeStoredToken,
  type LoginPortal,
} from '@/services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, portal?: LoginPortal) => Promise<UserProfile>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function isAdminRole(role: UserRole): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

/** The dashboard route a signed-in user belongs on. */
export function homeRouteFor(role: UserRole): '/admin' | '/manager' {
  return isAdminRole(role) ? '/admin' : '/manager';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function restoreSession() {
      try {
        const savedToken = await getStoredToken();
        if (savedToken) {
          const profile = await api.getMe();
          setToken(savedToken);
          setUser(profile);
        }
      } catch (err) {
        // Only discard the token when the server rejected it. On a network
        // failure keep it, so the session can be restored on the next launch.
        if (err instanceof ApiError && err.status !== 0) {
          await removeStoredToken();
        }
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);

  const login = async (
    email: string,
    password: string,
    portal?: LoginPortal
  ): Promise<UserProfile> => {
    const session = await api.login(email, password, portal);
    await storeToken(session.token);
    setToken(session.token);
    setUser(session.user);
    return session.user;
  };

  const logout = async () => {
    await removeStoredToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
