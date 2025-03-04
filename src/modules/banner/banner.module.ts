import { Module } from '@nestjs/common';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { StoreModule } from '../store/store.module';
import { ImageModule } from '../image/image.module';

@Module({
  imports: [StoreModule, ImageModule],
  providers: [BannerService],
  controllers: [BannerController]
})
export class BannerModule {}
