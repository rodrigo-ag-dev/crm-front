import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import api from '../services/api';
import { healthService } from '../services/healthService';

interface User {
  id: string;
  fullName: string;
  firstName?: string;
  email: string;
  username: string;
  role?: string;
  mustChangePassword?: boolean;
  tenantId?: string;
  tenantName?: string;
  /** The user's actual tenant, unaffected by a platform admin's "viewing as" switch — see tenantId above, which is the effective one. */
  homeTenantId?: string;
  platformAdmin?: boolean;
}

interface RawUserPayload {
  id: string;
  fullName?: string;
  name?: string;
  firstName?: string;
  email: string;
  username: string;
  role?: string;
  mustChangePassword?: boolean;
  tenantId?: string;
  tenantName?: string;
  homeTenantId?: string;
  platformAdmin?: boolean;
}

interface AuthContextData {
  user: User | null;
  signIn: (user: User) => void;
  signOut: () => Promise<void>;
  updateUser: (user: RawUserPayload) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  setupRequired: boolean;
  markSetupComplete: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

const getFirstName = (name: string) => name.trim().split(/\s+/)[0] || name;

const normalizeUser = (user: RawUserPayload): User => {
  const fullName = user.fullName ?? user.name ?? user.username ?? user.email ?? '';

  return {
    id: user.id,
    fullName,
    firstName: user.firstName ?? getFirstName(fullName),
    email: user.email,
    username: user.username,
    role: user.role,
    mustChangePassword: Boolean(user.mustChangePassword),
    tenantId: user.tenantId,
    tenantName: user.tenantName,
    homeTenantId: user.homeTenantId,
    platformAdmin: Boolean(user.platformAdmin),
  };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([api.get('/auth/me'), api.get('/healthcheck')])
      .then(([meResult, healthResult]) => {
        if (!isMounted) {
          return;
        }

        setUser((currentUser) => {
          if (meResult.status === 'fulfilled') {
            return normalizeUser(meResult.value.data);
          }
          return currentUser ?? null;
        });

        const required = healthResult.status === 'fulfilled'
          ? Boolean(healthResult.value.data?.setupRequired)
          : false;
        setSetupRequired(required);
        healthService.setSetupRequired(required);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const markSetupComplete = () => {
    setSetupRequired(false);
    healthService.setSetupRequired(false);
  };

  const signIn = (user: User) => {
    setUser(normalizeUser(user));
    setIsLoading(false);
  };

  const updateUser = (user: RawUserPayload) => {
    setUser(normalizeUser(user));
  };

  const signOut = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout — clearing local state still logs the user out client-side.
    }
    try {
      window.localStorage.removeItem('crm_token');
    } catch (e) {
      // Ignore storage errors.
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, signIn, signOut, updateUser, isAuthenticated: !!user, isLoading, setupRequired, markSetupComplete }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
