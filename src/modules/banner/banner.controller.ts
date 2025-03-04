import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LoggerService } from 'src/common/logger.service';
import { BannerService } from './banner.service';
import { handleErrorService } from 'src/common/handle-error.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { Roles } from 'src/common/auth/roles.decorator';
import WebResponse, { response } from 'src/models/web.model';
import { BannerResponse } from 'src/models/banner.model';
import { User } from '@prisma/client';
import { Auth } from 'src/common/auth/auth.decorator';
import { CreateBannerRequest } from './dto/create-banner.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoreValidationService } from '../store/store-validation.service';
import { UpdateBannerRequest } from './dto/update-banner.dto';

@Controller('stores/:storeId/banners')
export class BannerController {
  constructor(
    private loggerService: LoggerService,
    private storeValidationService: StoreValidationService,
    private bannerService: BannerService,
    private handleErrorService: handleErrorService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() request: CreateBannerRequest,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<WebResponse<BannerResponse>> {
    this.loggerService.debug(
      'BANNER',
      'controller',
      'Creating new banner initiated',
      {
        user_id: user.id,
        name: request.name,
      },
    );

    this.loggerService.info(
      'BANNER',
      'controller',
      'Creating new banner initiated',
      {
        user_id: user.id,
      },
    );

    try {
      const store = await this.storeValidationService.validateStore(storeId);

      const result = await this.bannerService.create(
        user,
        store.id,
        request,
        image,
      );

      return response(result, 201);
    } catch (error) {
      this.handleErrorService.controller(error, 'BANNER');
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async list(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('page', new DefaultValuePipe(1) , ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<WebResponse<BannerResponse[]>> {
    this.loggerService.info(
      'BANNER',
      'controller',
      'Fetching banners initiated',
      {
        user_id: user.id,
        limit: limit,
        page: page,
      },
    );

    try {
      const store = await this.storeValidationService.validateStore(storeId);
      const result = await this.bannerService.list(user, store.id, limit, page);
      const bannersId = result.data.map((banner) => banner.id).join(',');

      this.loggerService.info(
        'BANNER',
        'controller',
        'Banners fetched successfully',
        {
          user_id: user.id,
          banners_id: bannersId,
          data: result.paging.size,
          response_status: 200,
        },
      );

      return response(result.data, 200, result.paging);
    } catch (error) {
      this.handleErrorService.controller(error, 'BANNER');
    }
  }

  @Get(':bannerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async get(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('bannerId', ParseIntPipe) bannerId: number,
  ): Promise<WebResponse<BannerResponse>> {
    this.loggerService.info(
      'BANNER',
      'controller',
      'Fetching banner initiated',
      {
        user_id: user.id,
        banner_id: bannerId
      },
    );

    try {
      const store = await this.storeValidationService.validateStore(storeId);
      const result = await this.bannerService.get(user, store.id, bannerId);

      this.loggerService.info(
        'BANNER',
        'controller',
        'Banner fetched successfully',
        {
          user_id: user.id,
          banners_id: result.id,
          response_status: 200,
        },
      );

      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'BANNER');
    }
  }

  @Put(':bannerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('bannerId', ParseIntPipe) bannerId: number,
    @Body() request: UpdateBannerRequest,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<WebResponse<BannerResponse>> {
    this.loggerService.info(
      'BANNER',
      'controller',
      'Updating banner initiated',
      {
        user_id: user.id,
        banner_id: bannerId
      },
    );

    try {
      const store = await this.storeValidationService.validateStore(storeId);
      const result = await this.bannerService.update(user, store.id, bannerId, request, image);

      this.loggerService.info(
        'BANNER',
        'controller',
        'Banner updated successfully',
        {
          user_id: user.id,
          banners_id: result.id,
          response_status: 200,
        },
      );

      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'BANNER');
    }
  }

  @Delete(':bannerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('bannerId', ParseIntPipe) bannerId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    this.loggerService.info(
      'BANNER',
      'controller',
      'Updating banner initiated',
      {
        user_id: user.id,
        banner_id: bannerId
      },
    );

    try {
      const store = await this.storeValidationService.validateStore(storeId);
      const result = await this.bannerService.delete(user, store.id, bannerId);

      this.loggerService.info(
        'BANNER',
        'controller',
        'Banner updated successfully',
        {
          user_id: user.id,
          banners_id: bannerId,
          response_status: 200,
        },
      );

      return response({
        message: result.message,
        success: result.success
      }, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'BANNER');
    }
  }
}
