import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ContactModule } from './modules/contact/contact.module';
import { AddressModule } from './modules/address/address.module';
import { StoreModule } from './modules/store/store.module';

@Module({
  imports: [CommonModule, AuthModule, UserModule, ContactModule, AddressModule, StoreModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
