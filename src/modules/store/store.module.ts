import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { StoreValidationService } from './store-validation.service';

@Module({
  providers: [StoreService, StoreValidationService],
  controllers: [StoreController],
  exports: [StoreValidationService]
})
export class StoreModule {}
