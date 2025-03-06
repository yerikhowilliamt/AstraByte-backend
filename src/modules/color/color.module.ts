import { Module } from '@nestjs/common';
import { ColorService } from './color.service';
import { ColorController } from './color.controller';
import { StoreModule } from '../store/store.module';

@Module({
  imports: [StoreModule],
  providers: [ColorService],
  controllers: [ColorController]
})
export class ColorModule {}
