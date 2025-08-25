import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'oidc-client-ts';
import { authService } from './oidcClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | undefined;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  loadingComponent?: React.ComponentType;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children, 
  loadingComponent: LoadingComponent 
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await authService.initializeAuth();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Set up token renewal
    const interval = setInterval(async () => {
      if (authService.user && authService.user.expires_in && authService.user.expires_in < 60) {
        try {
          const renewedUser = await authService.renewToken();
          setUser(renewedUser);
        } catch (error) {
          console.error('Token renewal failed:', error);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const login = async () => {
    await authService.login();
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const hasRole = (role: string): boolean => {
    return authService.hasRole(role);
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: authService.isAuthenticated,
    isLoading,
    token: authService.token,
    login,
    logout,
    hasRole,
  };

  if (isLoading && LoadingComponent) {
    return <LoadingComponent />;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const useKeycloak = () => {
  const auth = useAuth();
  return {
    keycloak: {
      authenticated: auth.isAuthenticated,
      token: auth.token,
      hasRealmRole: auth.hasRole,
      hasResourceRole: auth.hasRole,
      login: auth.login,
      logout: auth.logout,
      profile: auth.user?.profile,
      realm: process.env.REACT_APP_KEYCLOAK_REALM,
    },
    initialized: !auth.isLoading,
  };
};