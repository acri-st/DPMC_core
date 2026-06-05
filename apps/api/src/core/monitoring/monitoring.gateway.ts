import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server } from 'socket.io';

import { ConfigService } from '@/core/config';
import {
  EVENTS,
  Rooms,
  type BatchStatusChangedPayload,
  type HostHeartbeatPayload,
  type HostLogCreatedPayload,
  type JobStatusChangedPayload,
  type TaskStatusChangedPayload,
} from './monitoring.events';
import { WsSessionGuard, type AuthenticatedSocket } from './ws-session.guard';

@WebSocketGateway({
  namespace: 'monitoring',
  cors: { credentials: true },
})
export class MonitoringGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MonitoringGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly wsGuard: WsSessionGuard,
    private readonly config: ConfigService,
  ) {
    this.config; // reserved for CORS origin lookup
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      await this.wsGuard.authenticate(client);
      this.logger.debug(
        `WS connect ${client.id} (user=${client.data.appUser.id})`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unauthorized';
      this.logger.warn(`WS reject ${client.id}: ${msg}`);
      client.emit('auth:error', { message: msg });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.logger.debug(`WS disconnect ${client.id}`);
  }

  // -- Subscription management --

  @UseGuards(WsSessionGuard)
  @SubscribeMessage('subscribe')
  async subscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      kind:
        | 'batch'
        | 'chain'
        | 'host'
        | 'task'
        | 'all-batches'
        | 'all-hosts'
        | 'all-tasks';
      id?: number;
    },
  ): Promise<{ ok: true; room: string } | { ok: false; reason: string }> {
    const room = this.resolveRoom(payload);
    if (!room) {
      return { ok: false, reason: 'Invalid subscription payload' };
    }
    await client.join(room);
    return { ok: true, room };
  }

  @UseGuards(WsSessionGuard)
  @SubscribeMessage('unsubscribe')
  async unsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    payload: {
      kind:
        | 'batch'
        | 'chain'
        | 'host'
        | 'task'
        | 'all-batches'
        | 'all-hosts'
        | 'all-tasks';
      id?: number;
    },
  ): Promise<{ ok: true; room: string } | { ok: false; reason: string }> {
    const room = this.resolveRoom(payload);
    if (!room) {
      return { ok: false, reason: 'Invalid subscription payload' };
    }
    await client.leave(room);
    return { ok: true, room };
  }

  // -- In-process event listeners (broadcast to rooms) --

  @OnEvent(EVENTS.JOB_STATUS_CHANGED)
  onJobStatusChanged(payload: JobStatusChangedPayload): void {
    this.server
      .to(Rooms.batch(payload.batchId))
      .emit(EVENTS.JOB_STATUS_CHANGED, payload);
    if (payload.productionChainId) {
      this.server
        .to(Rooms.chain(payload.productionChainId))
        .emit(EVENTS.JOB_STATUS_CHANGED, payload);
    }
  }

  @OnEvent(EVENTS.BATCH_STATUS_CHANGED)
  onBatchStatusChanged(payload: BatchStatusChangedPayload): void {
    this.server
      .to(Rooms.allBatches())
      .emit(EVENTS.BATCH_STATUS_CHANGED, payload);
    this.server
      .to(Rooms.batch(payload.batchId))
      .emit(EVENTS.BATCH_STATUS_CHANGED, payload);
    if (payload.productionChainId) {
      this.server
        .to(Rooms.chain(payload.productionChainId))
        .emit(EVENTS.BATCH_STATUS_CHANGED, payload);
    }
  }

  @OnEvent(EVENTS.HOST_HEARTBEAT)
  onHostHeartbeat(payload: HostHeartbeatPayload): void {
    this.server.to(Rooms.allHosts()).emit(EVENTS.HOST_HEARTBEAT, payload);
    this.server
      .to(Rooms.host(payload.hostId))
      .emit(EVENTS.HOST_HEARTBEAT, payload);
  }

  @OnEvent(EVENTS.HOST_LOG_CREATED)
  onHostLogCreated(payload: HostLogCreatedPayload): void {
    this.server
      .to(Rooms.host(payload.hostId))
      .emit(EVENTS.HOST_LOG_CREATED, payload);
  }

  @OnEvent(EVENTS.TASK_STATUS_CHANGED)
  onTaskStatusChanged(payload: TaskStatusChangedPayload): void {
    this.server.to(Rooms.allTasks()).emit(EVENTS.TASK_STATUS_CHANGED, payload);
    this.server
      .to(Rooms.task(payload.taskId))
      .emit(EVENTS.TASK_STATUS_CHANGED, payload);
  }

  // -- Helpers --

  private resolveRoom(payload: {
    kind:
      | 'batch'
      | 'chain'
      | 'host'
      | 'task'
      | 'all-batches'
      | 'all-hosts'
      | 'all-tasks';
    id?: number;
  }): string | null {
    switch (payload.kind) {
      case 'batch':
        return payload.id ? Rooms.batch(payload.id) : null;
      case 'chain':
        return payload.id ? Rooms.chain(payload.id) : null;
      case 'host':
        return payload.id ? Rooms.host(payload.id) : null;
      case 'task':
        return payload.id ? Rooms.task(payload.id) : null;
      case 'all-batches':
        return Rooms.allBatches();
      case 'all-hosts':
        return Rooms.allHosts();
      case 'all-tasks':
        return Rooms.allTasks();
      default:
        return null;
    }
  }
}
