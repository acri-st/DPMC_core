import { forwardRef, Global, Module } from '@nestjs/common';

import { UserModule } from '@/modules/user/user.module';
import { MonitoringGateway } from './monitoring.gateway';
import { WsSessionGuard } from './ws-session.guard';

@Global()
@Module({
  imports: [forwardRef(() => UserModule)],
  providers: [MonitoringGateway, WsSessionGuard],
  exports: [MonitoringGateway, WsSessionGuard],
})
export class MonitoringModule {}
