import { Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@/core/config';

interface PrometheusQueryResponse {
  status: string;
  error?: string;
  data?: {
    result?: Array<{ value?: [number, string] }>;
  };
}

// reachable+null = final answer (nothing matched); unreachable = ask again
// later, never record as a measured zero.
export type ScalarResult =
  | { reachable: true; value: number | null }
  | { reachable: false; value: null };

const UNREACHABLE: ScalarResult = { reachable: false, value: null };

@Injectable()
export class PrometheusClient {
  private readonly logger = new Logger(PrometheusClient.name);

  constructor(private readonly config: ConfigService) {}

  // getOptional, never get: ConfigService.get exits the process on a
  // missing key and PROMETHEUS_URL is legitimately absent.
  get enabled(): boolean {
    return Boolean(this.config.getOptional('PROMETHEUS_URL'));
  }

  async queryScalar(query: string): Promise<ScalarResult> {
    const prometheusUrl = this.config.getOptional('PROMETHEUS_URL');

    if (!prometheusUrl) {
      return UNREACHABLE;
    }

    const url = new URL(
      'api/v1/query',
      `${prometheusUrl.replace(/\/+$/, '')}/`,
    );
    url.searchParams.set('query', query);

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5_000),
      });

      if (!response.ok) {
        throw new Error(
          `Prometheus returned HTTP ${response.status} ${response.statusText}`,
        );
      }

      const payload = (await response.json()) as PrometheusQueryResponse;

      if (payload.status !== 'success') {
        throw new Error(payload.error ?? 'Prometheus query failed');
      }

      const rawValue = payload.data?.result?.[0]?.value?.[1];

      if (rawValue === undefined) {
        return { reachable: true, value: null };
      }

      const value = Number(rawValue);

      return {
        reachable: true,
        value: Number.isFinite(value) && value >= 0 ? value : null,
      };
    } catch (error) {
      this.logger.warn(
        `Prometheus query failed: ${(error as Error).message} — ${query}`,
      );
      return UNREACHABLE;
    }
  }
}
