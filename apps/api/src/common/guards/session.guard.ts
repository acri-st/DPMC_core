import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { ConfigService } from '@/core/config';
import { AuthService } from '@/auth/auth.service';
import { SessionService } from '@/auth/session.service';
import { UserService } from '@/modules/user/user.service';

@Injectable()
export class SessionGuard implements CanActivate {
  private readonly cookieName: string;

  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
  ) {
    this.cookieName = this.config.get('SESSION_COOKIE_NAME');
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request>();

    const bearer = extractBearer(req.headers.authorization);
    if (bearer) {
      let claims;
      try {
        claims = await this.authService.verifyAccessToken(bearer);
      } catch {
        throw new UnauthorizedException('Invalid bearer token');
      }
      const appUser = await this.userService.syncFromClaims(claims);
      req.user = claims;
      req.appUser = appUser;
      req.session = null;
      return true;
    }

    const rawSid = req.cookies?.[this.cookieName];
    if (!rawSid) {
      throw new UnauthorizedException('No session cookie');
    }
    const sid = Number(rawSid);
    if (!Number.isInteger(sid)) {
      throw new UnauthorizedException('Invalid session cookie');
    }

    const loaded = await this.sessionService.load(sid);
    if (!loaded) {
      throw new UnauthorizedException('Session not found');
    }

    const fresh = await this.sessionService.ensureFresh(loaded);
    if (!fresh) {
      throw new UnauthorizedException('Session expired');
    }

    const claims = await this.authService.verifyAccessToken(fresh.accessToken);
    const appUser = await this.userService.syncFromClaims(claims);

    req.user = claims;
    req.session = { sessionId: fresh.id, userId: fresh.userId };
    req.appUser = appUser;

    if (loaded !== fresh) {
      // already touched by ensureFresh refresh path
      return true;
    }
    await this.sessionService.touch(fresh.id);
    return true;
  }
}

function extractBearer(header: string | string[] | undefined): string | null {
  if (typeof header !== 'string') return null;
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}
