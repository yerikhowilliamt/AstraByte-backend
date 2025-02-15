import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [CommonModule, AuthModule, UserModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
