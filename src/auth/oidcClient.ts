import { UserManager, User, UserManagerSettings } from 'oidc-client-ts';

const oidcConfig: UserManagerSettings = {
  authority: process.env.REACT_APP_KEYCLOAK_URL! + '/realms/' + process.env.REACT_APP_KEYCLOAK_REALM!,
  client_id: process.env.REACT_APP_KEYCLOAK_CLIENT_ID!,
  redirect_uri: window.location.origin + '/auth/callback',
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: true,
  silent_redirect_uri: window.location.origin + '/auth/silent',
  filterProtocolClaims: true,
  loadUserInfo: true,
};

export const userManager = new UserManager(oidcConfig);

export class AuthService {
  private _user: User | null = null;

  async initializeAuth(): Promise<User | null> {
    try {
      this._user = await userManager.getUser();
      return this._user;
    } catch (error) {
      console.error('Error initializing auth:', error);
      return null;
    }
  }

  async login(): Promise<void> {
    await userManager.signinRedirect();
  }

  async logout(): Promise<void> {
    await userManager.signoutRedirect();
  }

  async handleCallback(): Promise<User> {
    const user = await userManager.signinRedirectCallback();
    this._user = user;
    return user;
  }

  async renewToken(): Promise<User | null> {
    try {
      const user = await userManager.signinSilent();
      this._user = user;
      return user;
    } catch (error) {
      console.error('Token renewal failed:', error);
      return null;
    }
  }

  get user(): User | null {
    return this._user;
  }

  get isAuthenticated(): boolean {
    return this._user != null && !this._user.expired;
  }

  get token(): string | undefined {
    return this._user?.access_token;
  }

  hasRole(role: string): boolean {
    if (!this._user?.profile) return false;
    const roles = this._user.profile.realm_access?.roles || [];
    const resourceRoles = this._user.profile.resource_access?.[process.env.REACT_APP_KEYCLOAK_CLIENT_ID!]?.roles || [];
    return [...roles, ...resourceRoles].includes(role);
  }
}

export const authService = new AuthService();