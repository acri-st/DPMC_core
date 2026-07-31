import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';
import type { AuditLogAction, AuditLogActorType } from '@dpmc/prisma';

import { AuditLogService } from '@/modules/audit-log';

const ACTION_BY_METHOD: Record<string, AuditLogAction> = {
  POST: 'Create',
  PUT: 'Update',
  PATCH: 'Update',
  DELETE: 'Delete',
};

// Routes whose POST is a state change on an existing aggregate rather than the
// creation of a new one.
const TRANSITION_SEGMENTS = new Set([
  'trigger',
  'cancel',
  'pause',
  'resume',
  'commit',
  'set-default',
  'heartbeat',
]);

/**
 * Records write operations in the audit trail (EOCP-E12-04).
 *
 * Reads are not recorded: the trail exists to answer "who changed what", and
 * logging every GET would bury that under traffic. Failures are not recorded
 * either — the interceptor only sees the success path, and a rejected request
 * changed nothing.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditLog: AuditLogService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();

    const req = ctx.switchToHttp().getRequest<Request>();
    const action = resolveAction(req);
    if (!action) return next.handle();

    return next.handle().pipe(
      tap((body) => {
        const { type, id } = resolveAggregate(req, body);
        void this.auditLog.record({
          ...resolveActor(req),
          action,
          aggregateType: type,
          aggregateId: id,
          metadata: { method: req.method, path: req.originalUrl },
        });
      }),
    );
  }
}

function segments(req: Request): string[] {
  return req.originalUrl.split('?')[0].split('/').filter(Boolean);
}

function resolveAction(req: Request): AuditLogAction | null {
  const method = req.method.toUpperCase();
  const base = ACTION_BY_METHOD[method];
  if (!base) return null;
  const last = segments(req).at(-1) ?? '';
  if (method === 'POST' && TRANSITION_SEGMENTS.has(last)) {
    return 'StatusTransition';
  }
  return base;
}

function resolveActor(req: Request): {
  actorId: string | null;
  actorType: AuditLogActorType;
} {
  if (req.user?.sub) return { actorId: req.user.sub, actorType: 'User' };
  // Workers and the dispatcher authenticate with the shared registration token
  // rather than a session.
  if (req.headers['x-worker-token']) {
    return { actorId: null, actorType: 'Worker' };
  }
  return { actorId: null, actorType: 'System' };
}

function resolveAggregate(
  req: Request,
  body: unknown,
): { type: string; id: string } {
  const parts = segments(req);
  // Strip the global API prefix so the aggregate is the resource, not "api".
  const resource = parts[0] === 'api' ? parts.slice(1) : parts;
  const type = resource[0] ?? 'unknown';

  const fromParams = (req.params as Record<string, string> | undefined) ?? {};
  const paramId = fromParams.id ?? Object.values(fromParams)[0];
  const responseId = (body as { data?: { id?: unknown } } | undefined)?.data?.id;

  return { type, id: String(paramId ?? responseId ?? 'unknown') };
}
