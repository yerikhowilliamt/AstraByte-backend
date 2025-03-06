import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { LoggerService } from '../../common/logger.service';
import { ColorService } from '../color/color.service';
import { handleErrorService } from '../../common/handle-error.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/role.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { Auth } from '../../common/auth/auth.decorator';
import { CreateColorRequest } from './dto/create-color.dto';
import WebResponse, { response } from '../../models/web.model';
import { ColorResponse } from '../../models/color.model';
import { User } from '@prisma/client';
import { UpdateColorRequest } from './dto/update-color.dto';

@Controller('stores/:storeId/colors')
export class ColorController {
  constructor(
    private loggerService: LoggerService,
    private colorService: ColorService,
    private handleErrorService: handleErrorService,
  ) { }
  
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() request: CreateColorRequest,
  ): Promise<WebResponse<ColorResponse>> {
    this.loggerService.info(
      'COLOR',
      'controller',
      'Creating new color initiated',
      {
        user_id: user.id,
        store_id: storeId,
        name: request.name,
        value: request.value
      },
    );

    try {
      const result = await this.colorService.create(user, storeId, request);
      this.loggerService.info(
        'COLOR',
        'controller',
        'Color created successfully',
        {
          id: result.id,
          user_id: user.id,
          store_id: result.storeId,
          response_status: 201,
        },
      );
      return response(result, 201);
    } catch (error) {
      this.handleErrorService.controller(error, 'COLOR');
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async list(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ): Promise<WebResponse<ColorResponse[]>> {
    this.loggerService.info(
      'COLOR',
      'controller',
      'Fetching colors initiated',
      {
        user_id: user.id,
        store_id: storeId,
        limit: limit,
        page: page,
      },
    );
    try {
      const result = await this.colorService.list(user, storeId, limit, page);
      const colorIds = result.data.map((color) => color.id).join(',');

      this.loggerService.info(
        'COLOR',
        'controller',
        'Colors fetched successfully',
        {
          ids: colorIds,
          user_id: user.id,
          store_id: storeId,
          data: result.paging.size,
          response_status: 200,
        },
      );

      return response(result.data, 200, result.paging);
    } catch (error) {
      this.handleErrorService.controller(error, 'COLOR');
    }
  }

  @Get(':colorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async get(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('colorId', ParseIntPipe) colorId: number,
  ): Promise<WebResponse<ColorResponse>> {
    this.loggerService.info(
      'COLOR',
      'controller',
      'Fetching color initiated',
      {
        id: colorId,
        user_id: user.id,
        store_id: storeId,
      },
    );
    try {
      const result = await this.colorService.get(user, storeId, colorId);

      this.loggerService.info(
        'COLOR',
        'controller',
        'Color fetched successfully',
        {
          id: result.id,
          user_id: user.id,
          response_status: 200,
        },
      );

      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'COLOR');
    }
  }

  @Put(':colorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('colorId', ParseIntPipe) colorId: number,
    @Body() request: UpdateColorRequest,
  ): Promise<WebResponse<ColorResponse>> {
    this.loggerService.info(
      'COLOR',
      'controller',
      'Updating color initiated',
      {
        id: colorId,
        user_id: user.id,
        name: request.name,
      },
    );
    try {
      const result = await this.colorService.update(user, storeId, colorId, request);

      this.loggerService.info(
        'COLOR',
        'controller',
        'Color updated successfully',
        {
          id: result.id,
          user_id: user.id,
          response_status: 200,
        },
      );

      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'COLOR');
    }
  }

  @Delete(':colorId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(
    @Auth() user: User,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Param('colorId', ParseIntPipe) colorId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    this.loggerService.info(
      'COLOR',
      'controller',
      'Deleting color initiated',
      {
        id: colorId,
        user_id: user.id,
      },
    );
    try {
      const result = await this.colorService.delete(
        user,
        storeId,
        colorId,
      );
      this.loggerService.info(
        'COLOR',
        'controller',
        'Color deleted successfully',
        {
          id: colorId,
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
      this.handleErrorService.controller(error, 'COLOR');
    }
  }
}
