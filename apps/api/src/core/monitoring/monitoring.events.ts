/**
 * In-process event names emitted via EventEmitter2 and forwarded by the
 * MonitoringGateway as Socket.IO broadcasts. Names are dot-separated to allow
 * wildcard subscriptions (`job.status.*`).
 */
export const EVENTS = {
  JOB_STATUS_CHANGED: 'job.status.changed',
  BATCH_STATUS_CHANGED: 'batch.status.changed',
  TASK_STATUS_CHANGED: 'task.status.changed',
  HOST_HEARTBEAT: 'host.heartbeat',
  HOST_LOG_CREATED: 'host.log.created',
} as const;

export type JobStatusChangedPayload = {
  jobId: number;
  batchId: number;
  productionChainId: number | null;
  status: string;
  hostId: number | null;
  startedAt: string | null;
  endedAt: string | null;
};

export type BatchStatusChangedPayload = {
  batchId: number;
  productionChainId: number | null;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
};

export type TaskStatusChangedPayload = {
  taskId: number;
  projectId: number;
  status: string;
  completedAt: string | null;
};

export type HostHeartbeatPayload = {
  hostId: number;
  isAvailable: boolean;
  lastHeartbeatAt: string;
};

export type HostLogCreatedPayload = {
  hostId: number;
  logs: ReadonlyArray<{
    id: number;
    jobId: number | null;
    level: 'Debug' | 'Info' | 'Warning' | 'Error' | 'Critical';
    message: string;
    loggedAt: string;
    createdAt: string;
  }>;
};

/**
 * Socket.IO room naming. Use these helpers everywhere instead of building
 * room strings ad-hoc.
 */
export const Rooms = {
  batch: (batchId: number) => `batch:${batchId}`,
  chain: (chainId: number) => `chain:${chainId}`,
  host: (hostId: number) => `host:${hostId}`,
  task: (taskId: number) => `task:${taskId}`,
  allBatches: () => 'batches',
  allHosts: () => 'hosts',
  allTasks: () => 'tasks',
} as const;
