import { Module } from '@nestjs/common';
import { BrandService } from './brand.service';
import { BrandController } from './brand.controller';
import { StoreModule } from '../store/store.module';

@Module({
  imports: [StoreModule],
  providers: [BrandService],
  controllers: [BrandController]
})
export class BrandModule {}
