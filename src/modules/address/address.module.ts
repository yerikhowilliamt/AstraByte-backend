import { Module } from '@nestjs/common';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [UserModule],
  providers: [AddressService],
  controllers: [AddressController]
})
export class AddressModule {}
