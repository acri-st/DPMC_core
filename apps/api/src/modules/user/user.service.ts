import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/core/prisma';
import type { AppUser, AuthUser } from '@/auth/auth.types';
import {
  PaginatedResult,
  PaginationQuery,
  buildSearchWhere,
  paginationSkipTake,
} from '@/common/utils/pagination';
import { buildDisplayName, pickAvatar } from './user.utils';

type UserListRow = {
  id: number;
  keycloakSub: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date | null;
};

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    pagination: PaginationQuery,
  ): Promise<PaginatedResult<UserListRow>> {
    const { skip, take } = paginationSkipTake(pagination);
    const search = buildSearchWhere(['displayName', 'email'], pagination.q);
    const where = search ?? undefined;
    const select = {
      id: true,
      keycloakSub: true,
      email: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
      sessions: {
        orderBy: { lastSeenAt: 'desc' } as const,
        take: 1,
        select: { lastSeenAt: true },
      },
    };
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { displayName: 'asc' },
        select,
      }),
      this.prisma.user.count({ where }),
    ]);
    const items = users.map((u) => ({
      id: u.id,
      keycloakSub: u.keycloakSub,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastSeenAt: u.sessions[0]?.lastSeenAt ?? null,
    }));
    return { items, total };
  }

  async listAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        keycloakSub: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          orderBy: { lastSeenAt: 'desc' },
          take: 1,
          select: { lastSeenAt: true },
        },
      },
    });
    return users.map((u) => ({
      id: u.id,
      keycloakSub: u.keycloakSub,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastSeenAt: u.sessions[0]?.lastSeenAt ?? null,
    }));
  }

  async syncFromClaims(claims: AuthUser): Promise<AppUser> {
    const email = claims.email ?? claims.preferredUsername ?? '';
    const displayName = buildDisplayName(claims);
    const avatarUrl = pickAvatar(claims);

    const user = await this.prisma.user.upsert({
      where: { keycloakSub: claims.sub },
      update: { email, displayName, avatarUrl },
      create: {
        keycloakSub: claims.sub,
        email,
        displayName,
        avatarUrl,
        settings: { create: {} },
      },
      select: {
        id: true,
        keycloakSub: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    return user;
  }

  async getSettings(userId: number) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: { theme: true, containerSize: true, lastProjectId: true },
    });
  }

  async updateSettings(
    userId: number,
    patch: {
      theme?: string;
      containerSize?: string;
      lastProjectId?: number | null;
    },
  ) {
    await this.ensureUserExists(userId);
    return this.prisma.userSettings.upsert({
      where: { userId },
      update: patch,
      create: {
        userId,
        theme: patch.theme,
        containerSize: patch.containerSize,
        lastProjectId: patch.lastProjectId ?? null,
      },
      select: { theme: true, containerSize: true, lastProjectId: true },
    });
  }

  private async ensureUserExists(userId: number): Promise<void> {
    const exists = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`User ${userId} not found`);
  }
}
