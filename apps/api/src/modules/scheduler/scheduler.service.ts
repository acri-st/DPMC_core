import { Injectable } from '@nestjs/common';
import type { ApiService } from '@dpmc/client';

const STALE_THRESHOLD_MS = 45_000;

@Injectable()
export class SchedulerService {
  private lastHeartbeatAt: Date | null = null;

  async heartbeat(_body: unknown): Promise<{ ok: true }> {
    this.lastHeartbeatAt = new Date();
    return { ok: true };
  }

  async status(): Promise<null> {
    return null;
  }

  getStatus(): ApiService {
    const connected =
      this.lastHeartbeatAt !== null &&
      Date.now() - this.lastHeartbeatAt.getTime() < STALE_THRESHOLD_MS;
    return { name: 'dispatcher', status: connected ? 'OK' : 'KO' };
  }
}
