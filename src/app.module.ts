import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ContactModule } from './modules/contact/contact.module';
import { AddressModule } from './modules/address/address.module';
import { StoreModule } from './modules/store/store.module';
import { BannerModule } from './modules/banner/banner.module';
import { ImageModule } from './modules/image/image.module';
import { CategoryModule } from './modules/category/category.module';
import { ColorModule } from './modules/color/color.module';
import { BrandModule } from './modules/brand/brand.module';

@Module({
  imports: [CommonModule, AuthModule, UserModule, ContactModule, AddressModule, StoreModule, BannerModule, ImageModule, CategoryModule, ColorModule, BrandModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
