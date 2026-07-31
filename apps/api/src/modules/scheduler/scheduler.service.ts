import { Injectable } from '@nestjs/common';
import type { ApiService } from '@dpmc/client';
import { ConfigService } from '@/core/config';

@Injectable()
export class SchedulerService {
  private lastHeartbeatAt: Date | null = null;

  constructor(private readonly config: ConfigService) {}

  async heartbeat(_body: unknown): Promise<{ ok: true }> {
    this.lastHeartbeatAt = new Date();
    return { ok: true };
  }

  async status(): Promise<null> {
    return null;
  }

  getStatus(): ApiService {
    const staleThresholdMs =
      this.config.get('SCHEDULER_STALE_THRESHOLD_S') * 1000;
    const connected =
      this.lastHeartbeatAt !== null &&
      Date.now() - this.lastHeartbeatAt.getTime() < staleThresholdMs;
    return { name: 'dispatcher', status: connected ? 'OK' : 'KO' };
  }
}
