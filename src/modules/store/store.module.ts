import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';

@Module({
  providers: [StoreService],
  controllers: [StoreController],
  exports: [StoreService]
})
export class StoreModule {}
