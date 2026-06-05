import type { Host, HostLog, HostLogLevel } from '@dpmc/client';

type PrismaHost = {
  id: number;
  dataCenterId: number;
  hostname: string;
  ipAddress: string;
  osType: 'Linux' | 'Darwin' | 'Windows';
  osVersion: string;
  schedulingPriority: 'Low' | 'Medium' | 'High';
  status: 'Up' | 'Busy' | 'Off' | 'Maintenance';
  processingDir: string;
  cacheDir: string;
  nbCores: number;
  ram: bigint;
  disk: bigint;
  hasGpu: boolean;
  gpuCount: number;
  gpuModel: string | null;
  containerRuntime: 'Docker' | 'Apptainer' | 'None';
  lastHeartbeatAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HostLogRow = {
  id: number;
  hostId: number;
  jobId: number | null;
  level: HostLogLevel;
  message: string;
  loggedAt: Date;
  createdAt: Date;
};

export const toHostDto = (host: PrismaHost): Host => ({
  ...host,
  ram: host.ram.toString(),
  disk: host.disk.toString(),
});

export const toHostLogDto = (row: HostLogRow): HostLog => ({
  id: row.id,
  hostId: row.hostId,
  jobId: row.jobId,
  level: row.level,
  message: row.message,
  loggedAt: row.loggedAt,
  createdAt: row.createdAt,
});

export const hasAnyMetric = (m: {
  cpuLoad?: number;
  memUsage?: number;
  diskUsage?: number;
  ioBandwidth?: number;
  runningJobs?: number;
}): boolean =>
  m.cpuLoad !== undefined ||
  m.memUsage !== undefined ||
  m.diskUsage !== undefined ||
  m.ioBandwidth !== undefined ||
  m.runningJobs !== undefined;
