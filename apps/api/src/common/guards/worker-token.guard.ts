import { timingSafeEqual } from 'node:crypto';

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { ConfigService } from '@/core/config/config.service';

const HEADER = 'x-worker-token';

/**
 * Validates the worker enrollment token sent as `X-Worker-Token`.
 * Uses `timingSafeEqual` when lengths match to reduce timing leaks.
 */
@Injectable()
export class WorkerTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const raw = req.headers[HEADER];
    const provided =
      typeof raw === 'string' ? raw : Array.isArray(raw) ? (raw[0] ?? '') : '';

    const expected = this.config.get('WORKER_REGISTRATION_TOKEN');
    const a = Buffer.from(provided, 'utf8');
    const b = Buffer.from(expected, 'utf8');

    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid worker token');
    }

    return true;
  }
}
