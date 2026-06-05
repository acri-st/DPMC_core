export type AuthUser = {
  sub: string;
  email?: string;
  preferredUsername?: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  roles: string[];
};

export type AppUser = {
  id: number;
  keycloakSub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
};

export type SessionContext = {
  sessionId: number;
  userId: number;
};

export type TokenSet = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
};
