import { forwardRef, Global, Module } from '@nestjs/common';

import { RolesGuard, SessionGuard } from '@/common/guards';
import { UserModule } from '@/modules/user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';

@Global()
@Module({
  imports: [forwardRef(() => UserModule)],
  controllers: [AuthController],
  providers: [AuthService, SessionService, SessionGuard, RolesGuard],
  exports: [AuthService, SessionService, SessionGuard, RolesGuard, UserModule],
})
export class AuthModule {}
