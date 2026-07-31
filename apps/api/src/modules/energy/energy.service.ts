import { Injectable, Logger } from '@nestjs/common';

import { ConfigService } from '@/core/config';

import { PrometheusClient } from './prometheus.client';

// cadvisor = pod-interface counters (superset, catches dpmc_io self-fetch);
// staged = what the worker moved (blind to self-fetch); none = reports 0.
export type TransferSource = 'cadvisor' | 'staged' | 'none';

export interface EnergyBreakdown {
  // Null = never sampled (job under the 5s poll); the view then falls back
  // to avgPower × duration, which a stored 0 would block.
  cpuWh: number | null;
  gpuWh: number;
  ingressBytes: number | null;
  egressBytes: number | null;
  transferSource: TransferSource;
  // False = a source that should have answered did not; retry, don't persist.
  complete: boolean;
}

export interface MeasurableJob {
  id: number;
  startedAt: Date | null;
  endedAt: Date | null;
  metrics: unknown;
  host: { tdpW: number | null; nbCores: number } | null;
}

const SECONDS_PER_HOUR = 3600;

@Injectable()
export class EnergyService {
  private readonly logger = new Logger(EnergyService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prometheus: PrometheusClient,
  ) {}

  async measure(job: MeasurableJob): Promise<EnergyBreakdown> {
    const durationSeconds = this.durationSeconds(job);
    const cpuSeconds = this.reportedCpuSeconds(job.metrics);

    const cpuWh =
      cpuSeconds === null
        ? null
        : (cpuSeconds * this.wattsPerCore(job.host)) / SECONDS_PER_HOUR;

    const staged = this.stagedVolumes(job.metrics);

    if (!this.prometheus.enabled) {
      return {
        cpuWh,
        gpuWh: 0,
        ...staged,
        complete: true,
      };
    }

    // Cover the whole pod lifetime plus a margin: the recording rules start
    // producing samples only once kube-state-metrics has published the pod's
    // labels, which lags pod creation by up to a scrape interval.
    const lookbackSeconds = this.lookbackSeconds(job);
    const selector = `{dpmc_job_id="${job.id}"}`;

    const [rx, tx, gpuWatts] = await Promise.all([
      // max_over_time, not increase(): these counters are created with the job
      // pod and destroyed with it, so their maximum IS the job total. increase()
      // would extrapolate at both window edges and inflate short jobs.
      this.prometheus.queryScalar(
        `max_over_time(dpmc:job_network_receive_bytes:total${selector}[${lookbackSeconds}s])`,
      ),
      this.prometheus.queryScalar(
        `max_over_time(dpmc:job_network_transmit_bytes:total${selector}[${lookbackSeconds}s])`,
      ),
      // Watts is a gauge; integrate it over the run.
      this.prometheus.queryScalar(
        `avg_over_time(dpmc:job_gpu_power_watts${selector}[${lookbackSeconds}s])`,
      ),
    ]);

    // Additive, not competing: staged data moves over the WORKER's interface
    // into the shared volume, dpmc_io self-fetch over the job pod's own eth0.
    // Each source sees only its segment.
    const cadvisorAnswered = rx.value !== null || tx.value !== null;

    return {
      cpuWh,
      gpuWh:
        gpuWatts.value === null
          ? 0
          : (gpuWatts.value * durationSeconds) / SECONDS_PER_HOUR,
      ingressBytes:
        cadvisorAnswered || staged.ingressBytes !== null
          ? (staged.ingressBytes ?? 0) + (rx.value ?? 0)
          : null,
      egressBytes:
        cadvisorAnswered || staged.egressBytes !== null
          ? (staged.egressBytes ?? 0) + (tx.value ?? 0)
          : null,
      transferSource: cadvisorAnswered ? 'cadvisor' : staged.transferSource,
      complete: rx.reachable && tx.reachable && gpuWatts.reachable,
    };
  }

  private wattsPerCore(host: MeasurableJob['host']): number {
    if (host?.tdpW && host.nbCores > 0) {
      return host.tdpW / host.nbCores;
    }
    return this.config.get('ENERGY_W_PER_CORE');
  }

  private stagedVolumes(metrics: unknown): {
    ingressBytes: number | null;
    egressBytes: number | null;
    transferSource: TransferSource;
  } {
    const ingressBytes = this.numericMetric(metrics, 'stageInBytes');
    const egressBytes = this.numericMetric(metrics, 'stageOutBytes');

    if (ingressBytes === null && egressBytes === null) {
      return { ingressBytes: null, egressBytes: null, transferSource: 'none' };
    }

    return { ingressBytes, egressBytes, transferSource: 'staged' };
  }

  private reportedCpuSeconds(metrics: unknown): number | null {
    return this.numericMetric(metrics, 'cpuSeconds');
  }

  // Accepts numbers and numeric strings (byte counts overflow JSON numbers).
  // Null = key absent, distinct from a reported zero.
  private numericMetric(metrics: unknown, key: string): number | null {
    if (!metrics || typeof metrics !== 'object') {
      return null;
    }

    const raw = (metrics as Record<string, unknown>)[key];

    if (typeof raw === 'number') {
      return Number.isFinite(raw) && raw >= 0 ? raw : null;
    }

    if (typeof raw === 'string' && raw !== '') {
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }

    return null;
  }

  private durationSeconds(job: MeasurableJob): number {
    if (!job.startedAt || !job.endedAt) {
      return 0;
    }
    return Math.max(
      0,
      (job.endedAt.getTime() - job.startedAt.getTime()) / 1000,
    );
  }

  private lookbackSeconds(job: MeasurableJob): number {
    const since = job.startedAt ?? job.endedAt;
    const elapsed = since ? (Date.now() - since.getTime()) / 1000 : 0;
    return Math.max(300, Math.ceil(elapsed) + 120);
  }
}
