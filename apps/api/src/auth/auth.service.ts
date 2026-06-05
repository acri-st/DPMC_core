import { createHash, randomBytes } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { JWTPayload } from 'jose';

import { ConfigService } from '@/core/config';
import { base64Url, lazyImport } from '@/common/utils';
import type { AuthUser, TokenSet } from './auth.types';

type JoseModule = typeof import('jose');
const loadJose = lazyImport(() => import('jose'));

type KeycloakClaims = JWTPayload & {
  email?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  realm_access?: { roles?: string[] };
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
};

@Injectable()
export class AuthService {
  private jwks?: ReturnType<JoseModule['createRemoteJWKSet']>;
  private readonly issuer: string;
  private readonly tokenEndpoint: string;
  private readonly authorizeEndpoint: string;
  private readonly logoutEndpoint: string;
  private readonly clientId: string;
  private readonly clientSecret?: string;
  private readonly http: AxiosInstance;
  constructor(private readonly config: ConfigService) {
    const url = this.config.get('KEYCLOAK_URL');
    const realm = this.config.get('KEYCLOAK_REALM');
    this.issuer = `${url}/realms/${realm}`;
    this.tokenEndpoint = `${this.issuer}/protocol/openid-connect/token`;
    this.authorizeEndpoint = `${this.issuer}/protocol/openid-connect/auth`;
    this.logoutEndpoint = `${this.issuer}/protocol/openid-connect/logout`;
    this.clientId = this.config.get('KEYCLOAK_CLIENT_ID');
    const secret = this.config.get('KEYCLOAK_CLIENT_SECRET');
    this.clientSecret = secret && secret.length > 0 ? secret : undefined;
    this.http = axios.create({ timeout: 5_000 });
  }

  buildAuthorizeUrl(opts: {
    redirectUri: string;
    state: string;
    codeVerifier: string;
    scope?: string;
  }): string {
    const challenge = base64Url(
      createHash('sha256').update(opts.codeVerifier).digest(),
    );
    const url = new URL(this.authorizeEndpoint);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', opts.scope ?? 'openid profile email');
    url.searchParams.set('redirect_uri', opts.redirectUri);
    url.searchParams.set('state', opts.state);
    url.searchParams.set('code_challenge', challenge);
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  static randomState(): string {
    return base64Url(randomBytes(24));
  }

  static randomCodeVerifier(): string {
    return base64Url(randomBytes(64));
  }

  async exchangeCode(opts: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<TokenSet> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code: opts.code,
      redirect_uri: opts.redirectUri,
      code_verifier: opts.codeVerifier,
    });
    if (this.clientSecret) body.set('client_secret', this.clientSecret);

    const tokens = await this.callTokenEndpoint(body);
    return this.toTokenSet(tokens);
  }

  async refreshTokens(refreshToken: string): Promise<TokenSet | null> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      refresh_token: refreshToken,
    });
    if (this.clientSecret) body.set('client_secret', this.clientSecret);

    try {
      const tokens = await this.callTokenEndpoint(body);
      return this.toTokenSet(tokens);
    } catch {
      return null;
    }
  }

  async revokeRefreshToken(
    refreshToken: string,
    _userId?: number,
  ): Promise<void> {
    const body = new URLSearchParams({
      client_id: this.clientId,
      refresh_token: refreshToken,
    });
    if (this.clientSecret) body.set('client_secret', this.clientSecret);
    try {
      await this.http.post(this.logoutEndpoint, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch {
      // best effort
    }
  }

  async verifyAccessToken(token: string): Promise<AuthUser> {
    try {
      const { createRemoteJWKSet, jwtVerify } = await loadJose();
      this.jwks ??= createRemoteJWKSet(
        new URL(`${this.issuer}/protocol/openid-connect/certs`),
      );
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
      });
      return this.toAuthUser(payload);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  toAuthUser(payload: KeycloakClaims): AuthUser {
    if (!payload.sub) {
      throw new UnauthorizedException('Token is missing subject');
    }
    return {
      sub: payload.sub,
      email: payload.email,
      preferredUsername: payload.preferred_username,
      firstName: payload.given_name,
      lastName: payload.family_name,
      picture: payload.picture,
      roles: payload.realm_access?.roles ?? [],
    };
  }

  // Kept for backward compat: routed through verifyAccessToken.
  async verifyToken(token: string): Promise<AuthUser> {
    return this.verifyAccessToken(token);
  }

  private async callTokenEndpoint(
    body: URLSearchParams,
  ): Promise<TokenResponse> {
    try {
      const response = await this.http.post<TokenResponse>(
        this.tokenEndpoint,
        body,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new UnauthorizedException(
          (error.response?.data as { error_description?: string })
            ?.error_description ?? 'Keycloak token exchange failed',
        );
      }
      throw error;
    }
  }

  private toTokenSet(tokens: TokenResponse): TokenSet {
    const now = Date.now();
    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: new Date(now + tokens.expires_in * 1000),
      refreshTokenExpiresAt: new Date(now + tokens.refresh_expires_in * 1000),
    };
  }
}
