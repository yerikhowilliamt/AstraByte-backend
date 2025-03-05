import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { StoreModule } from '../store/store.module';

@Module({
  imports: [StoreModule],
  providers: [CategoryService],
  controllers: [CategoryController]
})
export class CategoryModule {}
