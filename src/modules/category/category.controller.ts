import {
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
  UseGuards,
} from '@nestjs/common';
import { LoggerService } from 'src/common/logger.service';

import { handleErrorService } from 'src/common/handle-error.service';
import { CategoryService } from './category.service';
import { RolesGuard } from '../auth/guards/role.guard';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Auth } from 'src/common/auth/auth.decorator';
import { User } from '@prisma/client';
import { CreateCategoryRequest } from './dto/create-category.dto';
import WebResponse, { response } from 'src/models/web.model';
import { CategoryResponse } from 'src/models/category.model';
import { Roles } from 'src/common/auth/roles.decorator';
import { UpdateCategoryRequest } from './dto/update-category.dto';

@Controller('stores/:storeId/categories')
export class CategoryController {
  constructor(
    private loggerService: LoggerService,
    private categoryService: CategoryService,
    private handleErrorService: handleErrorService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() request: CreateCategoryRequest,
  ): Promise<WebResponse<CategoryResponse>> {
    this.loggerService.info(
      'CATEGORY',
      'controller',
      'Creating new category initiated',
      {
        user_id: user.id,
        store_id: storeId,
        name: request.name,
      },
    );
    try {
      const result = await this.categoryService.create(user, storeId, request);
      this.loggerService.info(
        'CATEGORY',
        'controller',
        'Category created successfully',
        {
          id: result.id,
          user_id: user.id,
          store_id: result.storeId,
          response_status: 201,
        },
      );
      return response(result, 201);
    } catch (error) {
      this.handleErrorService.controller(error, 'CATEGORY');
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async list(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<WebResponse<CategoryResponse[]>> {
    this.loggerService.info(
      'CATEGORY',
      'controller',
      'Fetching categories initiated',
      {
        user_id: user.id,
        store_id: storeId,
        limit: limit,
        page: page,
      },
    );
    try {
      const result = await this.categoryService.list(
        user,
        storeId,
        limit,
        page,
      );
      const categoryIds = result.data.map((category) => category.id).join(',');

      this.loggerService.info(
        'CATEGORY',
        'controller',
        'categories fetched successfully',
        {
          ids: categoryIds,
          user_id: user.id,
          store_id: storeId,
          data: result.paging.size,
          response_status: 200,
        },
      );

      return response(result.data, 200, result.paging);
    } catch (error) {
      this.handleErrorService.controller(error, 'CATEGORY');
    }
  }

  @Get(':categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async get(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<WebResponse<CategoryResponse>> {
    this.loggerService.info(
      'CATEGORY',
      'controller',
      'Fetching category initiated',
      {
        id: categoryId,
        user_id: user.id,
        store_id: storeId,
      },
    );
    try {
      const result = await this.categoryService.get(user, storeId, categoryId);

      this.loggerService.info(
        'CATEGORY',
        'controller',
        'category fetched successfully',
        {
          id: result.id,
          user_id: user.id,
          response_status: 200,
        },
      );

      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'CATEGORY');
    }
  }

  @Put(':categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() request: UpdateCategoryRequest,
  ): Promise<WebResponse<CategoryResponse>> {
    this.loggerService.info(
      'CATEGORY',
      'controller',
      'Updating category initiated',
      {
        id: categoryId,
        user_id: user.id,
        name: request.name,
      },
    );

    try {
      const result = await this.categoryService.update(
        user,
        storeId,
        categoryId,
        request,
      );

      this.loggerService.info(
        'CATEGORY',
        'controller',
        'Category updated successfully',
        {
          id: result.id,
          user_id: user.id,
          response_status: 200,
        },
      );

      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'CATEGORY');
    }
  }

  @Delete(':categoryId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    this.loggerService.info(
      'CATEGORY',
      'controller',
      'Updating category initiated',
      {
        id: categoryId,
        user_id: user.id,
      },
    );
    try {
      const result = await this.categoryService.delete(
        user,
        storeId,
        categoryId,
      );
      this.loggerService.info(
        'CATEGORY',
        'controller',
        'Category deleted successfully',
        {
          id: categoryId,
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
      this.handleErrorService.controller(error, 'CATEGORY');
    }
  }
}
