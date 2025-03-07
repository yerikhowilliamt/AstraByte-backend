import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BrandService } from './brand.service';
import { LoggerService } from '../../common/logger.service';
import { handleErrorService } from '../../common/handle-error.service';
import { BrandResponse } from '../../models/brand.model';
import { CreateBrandRequest } from './dto/create-brand.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { Auth } from '../../common/auth/auth.decorator';
import { User } from '@prisma/client';
import WebResponse, { response } from '../../models/web.model';
import { UpdateBrandRequest } from './dto/update-brand.dto';

@Controller('stores/:storeId/brands')
export class BrandController {
  constructor(
    private loggerService: LoggerService,
    private brandService: BrandService,
    private handleErrorService: handleErrorService,
  ) {}

  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() request: CreateBrandRequest,
  ): Promise<WebResponse<BrandResponse>> {
    this.loggerService.info(
      'BRAND',
      'controller',
      'Creating new brand initiated',
      {
        user_id: user.id,
      },
    );

    try {
      const result = await this.brandService.create(user, storeId, request);
      this.loggerService.info(
        'BRAND',
        'controller',
        'Brand created successfully',
        {
          id: result.id,
          user_id: user.id,
          store_id: result.storeId,
          response_status: 201,
        },
      );

      return response(result, 201);
    } catch (error) {
      this.handleErrorService.controller(error, 'BRAND');
    }
  }

  @Get()
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async list(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ): Promise<WebResponse<BrandResponse[]>> {
    this.loggerService.info(
      'BRAND',
      'controller',
      'Fetching brands initiated',
      {
        user_id: user.id,
        limit: limit,
        page: page,
      },
    );

    try {
      const result = await this.brandService.list(user, storeId, limit, page);
      const brandIds = result.data.map((brand) => brand.id).join(',');

      this.loggerService.info(
        'BRAND',
        'controller',
        'Brands fetched successfully',
        {
          ids: brandIds,
          user_id: user.id,
          store_id: storeId,
          data: result.paging.size,
          response_status: 200,
        },
      );

      return response(result.data, 200, result.paging);
    } catch (error) {
      this.handleErrorService.controller(error, 'BRAND');
    }
  }

  @Get(':brandId')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async get(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('brandId', ParseIntPipe) brandId: number,
  ): Promise<WebResponse<BrandResponse>> {
    this.loggerService.info('BRAND', 'controller', 'Fetching brand initiated', {
      id: brandId,
      user_id: user.id,
      store_id: storeId,
    });

    try {
      const result = await this.brandService.get(user, storeId, brandId);

      this.loggerService.info(
        'BRAND',
        'controller',
        'Brand fetched successfully',
        {
          id: result.id,
          user_id: user.id,
          response_status: 200,
        },
      );

      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'BRAND');
    }
  }

  @Put(':brandId')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('brandId', ParseIntPipe) brandId: number,
    @Body() request: UpdateBrandRequest,
  ): Promise<WebResponse<BrandResponse>> {
    this.loggerService.info('BRAND', 'controller', 'Updating brand initiated', {
      id: brandId,
      user_id: user.id,
    });

    try {
      const result = await this.brandService.update(
        user,
        storeId,
        brandId,
        request,
      );

      this.loggerService.info(
        'BRAND',
        'controller',
        'Brand updated successfully',
        {
          id: result.id,
          user_id: user.id,
          response_status: 200,
        },
      );

      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'BRAND');
    }
  }

  @Delete(':brandId')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('brandId', ParseIntPipe) brandId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    this.loggerService.info('BRAND', 'controller', 'Updating brand initiated', {
      id: brandId,
      user_id: user.id,
    });

    try {
      const result = await this.brandService.delete(user, storeId, brandId);

      this.loggerService.info(
        'BRAND',
        'controller',
        'Brand updated successfully',
        {
          id: brandId,
          user_id: user.id,
          response_status: 200,
        },
      );

      return response(
        {
          message: result.message,
          success: result.success,
        },
        200,
      );
    } catch (error) {
      this.handleErrorService.controller(error, 'BRAND');
    }
  }
}
