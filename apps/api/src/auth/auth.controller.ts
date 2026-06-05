import {
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Public } from '@/common/decorators/public.decorator';
import { SuccessResponse } from '@/common/decorators/response.decorator';
import { SessionGuard } from '@/common/guards/session.guard';
import { Response as ResponseHelper } from '@/common/utils/response.utils';
import { sanitizeReturnTo } from '@/common/utils';
import { ConfigService } from '@/core/config';
import { CryptoService } from '@/core/crypto';
import { PATHS, GetCurrentUserResponse200Schema } from '@dpmc/client';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { UserService } from '@/modules/user/user.service';

const OAUTH_COOKIE_TTL_MS = 10 * 60 * 1000; // 10 min

type OAuthState = {
  state: string;
  codeVerifier: string;
  returnTo: string;
};

@ApiTags('auth')
@Controller()
export class AuthController {
  private readonly sessionCookie: string;
  private readonly oauthCookie: string;
  private readonly cookieDomain?: string;
  private readonly secureCookies: boolean;
  private readonly frontendUrl: string;
  private readonly redirectUri: string;

  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
    private readonly crypto: CryptoService,
  ) {
    this.sessionCookie = this.config.get('SESSION_COOKIE_NAME');
    this.oauthCookie = this.config.get('OAUTH_COOKIE_NAME');
    this.cookieDomain = this.config.get('COOKIE_DOMAIN');
    this.secureCookies = this.config.isProduction;
    this.frontendUrl = this.config.get('FRONTEND_URL');
    this.redirectUri = `${this.config.get('API_URL')}${PATHS.AUTH.CALLBACK}`;
  }

  @Public()
  @Get(PATHS.AUTH.LOGIN)
  login(
    @Query('returnTo') returnTo: string | undefined,
    @Res() res: Response,
  ): void {
    const state = AuthService.randomState();
    const codeVerifier = AuthService.randomCodeVerifier();
    const safeReturnTo = sanitizeReturnTo(returnTo);

    const payload: OAuthState = { state, codeVerifier, returnTo: safeReturnTo };
    const cookieValue = this.crypto
      .encrypt(JSON.stringify(payload))
      .toString('base64');

    res.cookie(this.oauthCookie, cookieValue, {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'lax',
      domain: this.cookieDomain,
      path: '/',
      maxAge: OAUTH_COOKIE_TTL_MS,
    });

    const url = this.authService.buildAuthorizeUrl({
      redirectUri: this.redirectUri,
      state,
      codeVerifier,
    });
    res.redirect(url);
  }

  @Public()
  @Get(PATHS.AUTH.CALLBACK)
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (error) {
      res.redirect(this.frontendErrorUrl('/', error));
      return;
    }
    if (!code || !state) {
      res.redirect(this.frontendErrorUrl('/', 'missing_code'));
      return;
    }

    const cookieValue = req.cookies?.[this.oauthCookie];
    if (!cookieValue) {
      res.redirect(this.frontendErrorUrl('/', 'oauth_state_missing'));
      return;
    }

    let parsed: OAuthState;
    try {
      const json = this.crypto.decrypt(Buffer.from(cookieValue, 'base64'));
      parsed = JSON.parse(json) as OAuthState;
    } catch {
      this.clearOAuthCookie(res);
      res.redirect(this.frontendErrorUrl('/', 'oauth_state_invalid'));
      return;
    }

    this.clearOAuthCookie(res);

    if (parsed.state !== state) {
      res.redirect(this.frontendErrorUrl('/', 'state_mismatch'));
      return;
    }

    let tokens;
    try {
      tokens = await this.authService.exchangeCode({
        code,
        codeVerifier: parsed.codeVerifier,
        redirectUri: this.redirectUri,
      });
    } catch {
      res.redirect(this.frontendErrorUrl(parsed.returnTo, 'token_exchange'));
      return;
    }

    const claims = await this.authService.verifyAccessToken(tokens.accessToken);
    const appUser = await this.userService.syncFromClaims(claims);

    const session = await this.sessionService.create({
      userId: appUser.id,
      tokens,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    });

    res.cookie(this.sessionCookie, session.id, {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'lax',
      domain: this.cookieDomain,
      path: '/',
      expires: tokens.refreshTokenExpiresAt,
    });

    res.redirect(`${this.frontendUrl}${parsed.returnTo}`);
  }

  @UseGuards(SessionGuard)
  @Post(PATHS.AUTH.LOGOUT)
  @HttpCode(204)
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const rawSid = req.cookies?.[this.sessionCookie];
    const sid = rawSid ? Number(rawSid) : NaN;
    if (Number.isInteger(sid)) {
      const loaded = await this.sessionService.load(sid);
      if (loaded) {
        await this.authService.revokeRefreshToken(
          loaded.refreshToken,
          loaded.userId,
        );
        await this.sessionService.delete(sid);
      }
    }
    res.clearCookie(this.sessionCookie, {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'lax',
      domain: this.cookieDomain,
      path: '/',
    });
    res.status(204).send();
  }

  @UseGuards(SessionGuard)
  @SuccessResponse(GetCurrentUserResponse200Schema)
  @Get(PATHS.AUTH.ME)
  @ApiOkResponse({ description: 'Current authenticated user.' })
  me(@Req() req: Request) {
    if (!req.appUser || !req.user) {
      throw new UnauthorizedException();
    }
    return ResponseHelper.success({
      id: req.appUser.id,
      email: req.appUser.email,
      displayName: req.appUser.displayName,
      avatarUrl: req.appUser.avatarUrl,
      roles: req.user.roles,
    });
  }

  private clearOAuthCookie(res: Response): void {
    res.clearCookie(this.oauthCookie, {
      httpOnly: true,
      secure: this.secureCookies,
      sameSite: 'lax',
      domain: this.cookieDomain,
      path: '/',
    });
  }

  private frontendErrorUrl(returnTo: string, error: string): string {
    const safe = sanitizeReturnTo(returnTo);
    const sep = safe.includes('?') ? '&' : '?';
    return `${this.frontendUrl}${safe}${sep}auth_error=${encodeURIComponent(error)}`;
  }
}
