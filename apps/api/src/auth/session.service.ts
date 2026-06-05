import { Injectable, Logger } from '@nestjs/common';

import { bufferToBytes } from '@/common/utils';
import { CryptoService } from '@/core/crypto';
import { PrismaService } from '@/core/prisma';
import { AuthService } from './auth.service';
import type { TokenSet } from './auth.types';

const REFRESH_LEEWAY_MS = 30 * 1000;

export type LoadedSession = {
  id: number;
  userId: number;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
};

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly authService: AuthService,
  ) {}

  async create(opts: {
    userId: number;
    tokens: TokenSet;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<{ id: number }> {
    const created = await this.prisma.session.create({
      data: {
        userId: opts.userId,
        accessToken: bufferToBytes(
          this.crypto.encrypt(opts.tokens.accessToken),
        ),
        refreshToken: bufferToBytes(
          this.crypto.encrypt(opts.tokens.refreshToken),
        ),
        accessTokenExpiresAt: opts.tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: opts.tokens.refreshTokenExpiresAt,
        userAgent: opts.userAgent ?? null,
        ipAddress: opts.ipAddress ?? null,
      },
      select: { id: true },
    });
    return created;
  }

  async load(sessionId: number): Promise<LoadedSession | null> {
    const row = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!row) return null;
    return {
      id: row.id,
      userId: row.userId,
      accessToken: this.crypto.decrypt(Buffer.from(row.accessToken)),
      refreshToken: this.crypto.decrypt(Buffer.from(row.refreshToken)),
      accessTokenExpiresAt: row.accessTokenExpiresAt,
      refreshTokenExpiresAt: row.refreshTokenExpiresAt,
    };
  }

  async ensureFresh(session: LoadedSession): Promise<LoadedSession | null> {
    const now = Date.now();
    if (session.accessTokenExpiresAt.getTime() - REFRESH_LEEWAY_MS > now) {
      return session;
    }
    if (session.refreshTokenExpiresAt.getTime() <= now) {
      await this.delete(session.id);
      return null;
    }
    const fresh = await this.authService.refreshTokens(session.refreshToken);
    if (!fresh) {
      this.logger.debug(`Refresh failed for session ${session.id}`);
      await this.delete(session.id);
      return null;
    }
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        accessToken: bufferToBytes(this.crypto.encrypt(fresh.accessToken)),
        refreshToken: bufferToBytes(this.crypto.encrypt(fresh.refreshToken)),
        accessTokenExpiresAt: fresh.accessTokenExpiresAt,
        refreshTokenExpiresAt: fresh.refreshTokenExpiresAt,
        lastSeenAt: new Date(),
      },
    });
    return {
      ...session,
      accessToken: fresh.accessToken,
      refreshToken: fresh.refreshToken,
      accessTokenExpiresAt: fresh.accessTokenExpiresAt,
      refreshTokenExpiresAt: fresh.refreshTokenExpiresAt,
    };
  }

  async touch(sessionId: number): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    });
  }

  async delete(sessionId: number): Promise<void> {
    await this.prisma.session
      .delete({ where: { id: sessionId } })
      .catch(() => undefined);
  }
}
