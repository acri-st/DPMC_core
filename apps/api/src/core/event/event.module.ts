import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

/**
 * Wraps `@nestjs/event-emitter` with project-wide config (wildcard listeners
 * enabled, verbose newListener events disabled). Make this the only place
 * `EventEmitterModule.forRoot(...)` is invoked.
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      verboseMemoryLeak: false,
    }),
  ],
  exports: [EventEmitterModule],
})
export class EventModule {}
