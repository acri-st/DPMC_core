import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Socket } from 'socket.io';

import { parseCookie } from '@/common/utils';
import { ConfigService } from '@/core/config';
import { AuthService } from '@/auth/auth.service';
import { SessionService } from '@/auth/session.service';
import { UserService } from '@/modules/user/user.service';
import type { AppUser, AuthUser } from '@/auth/auth.types';

export type AuthenticatedSocket = Socket & {
  data: Socket['data'] & {
    user: AuthUser;
    appUser: AppUser;
    sessionId: string;
  };
};

/**
 * Authenticates a Socket.IO connection at handshake using the same session
 * cookie as the HTTP `SessionGuard`. On success, attaches user context to
 * `socket.data` so downstream message handlers can read it.
 */
@Injectable()
export class WsSessionGuard implements CanActivate {
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
    const client = ctx.switchToWs().getClient<Socket>();
    if (client.data?.user) {
      return true;
    }
    await this.authenticate(client);
    return true;
  }

  async authenticate(client: Socket): Promise<void> {
    const cookieHeader = client.handshake.headers.cookie ?? '';
    const rawSid = parseCookie(cookieHeader, this.cookieName);
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

    client.data.user = claims;
    client.data.appUser = appUser;
    client.data.sessionId = fresh.id;

    if (loaded === fresh) {
      await this.sessionService.touch(fresh.id);
    }
  }
}
