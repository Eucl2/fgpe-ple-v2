// src/auth/keycloak-compat.ts
import { useAuth } from './AuthContext';

export interface KeycloakProfile {
  id?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  attributes?: { [key: string]: string[] };
}

// Updated useKeycloak hook for compatibility
export const useKeycloak = () => {
  const auth = useAuth();
  
  const keycloak = {
    authenticated: auth.isAuthenticated,
    token: auth.token,
    loadUserProfile: async (): Promise<KeycloakProfile> => {
      if (auth.user && auth.user.profile) {
        return {
          id: auth.user.profile.sub,
          username: auth.user.profile.preferred_username,
          email: auth.user.profile.email,
          firstName: auth.user.profile.given_name,
          lastName: auth.user.profile.family_name,
          emailVerified: auth.user.profile.email_verified,
        };
      }
      return {};
    },
    hasRealmRole: auth.hasRole,
    hasResourceRole: auth.hasRole,
    login: auth.login,
    logout: auth.logout,
    profile: auth.user?.profile,
    realm: process.env.REACT_APP_KEYCLOAK_REALM,
    isTokenExpired: () => auth.user ? auth.user.expired : true,
    updateToken: () => Promise.resolve(true),
    manualLogin: () => {},
    onTokenExpired: null as any,
  };

  return {
    keycloak,
    initialized: !auth.isLoading,
  };
};