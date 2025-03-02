import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { LoggerService } from '../../common/logger.service';
import { StoreService } from '../store/store.service';
import { handleErrorService } from '../../common/handle-error.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Auth } from '../../common/auth/auth.decorator';
import { User } from '@prisma/client';
import { CreateStoreRequest } from './dto/create-store.dto';
import WebResponse, { response } from '../../models/web.model';
import { StoreResponse } from '../../models/store.model';
import { UpdateStoreRequest } from './dto/update-store.dto';
import { RolesGuard } from '../auth/guards/role.guard';
import { Roles } from 'src/common/auth/roles.decorator';

@Controller('users/:userId/stores')
export class StoreController {
  constructor(
    private loggerService: LoggerService,
    private storeService: StoreService,
    private handleErrorService: handleErrorService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() request: CreateStoreRequest,
  ): Promise<WebResponse<StoreResponse>> {
    this.loggerService.debug(
      'STORE',
      'controller',
      'Creating new store initiated',
      {
        user_id: userId,
        name: request.name,
      },
    );

    this.loggerService.info(
      'STORE',
      'controller',
      'Creating new store initiated',
      {
        user_id: userId,
      },
    );

    try {
      this.checkAuthorization(userId, user);

      const result = await this.storeService.create(user, request);

      this.loggerService.info(
        'STORE',
        'controller',
        'Store created successfully',
        {
          user_id: result.userId,
          contact_id: result.id,
          response_status: 201,
        },
      );

      return response(result, 201);
    } catch (error) {
      this.handleErrorService.controller(error, 'STORE');
    }
  }

  @Get(':storeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async get(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('storeId', ParseIntPipe) storeId: number,
  ): Promise<WebResponse<StoreResponse>> {
    this.loggerService.info('STORE', 'controller', 'Fetching store initiated', {
      user_id: userId,
      store_id: storeId,
    });
    try {
      this.checkAuthorization(userId, user);

      const result = await this.storeService.get(user, storeId);

      this.loggerService.info(
        'STORE',
        'controller',
        'Store fetched successfully',
        {
          user_id: result.userId,
          store_id: result.id,
          response_status: 200,
        },
      );

      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'STORE');
    }
  }

  @Put(':storeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('storeId', ParseIntPipe) storeId: number,
    @Body() request: UpdateStoreRequest,
  ): Promise<WebResponse<StoreResponse>> {
    this.loggerService.debug(
      'STORE',
      'controller',
      'Updating store initiated',
      {
        user_id: userId,
        store_id: storeId,
        name: request.name,
      },
    );

    this.loggerService.info('STORE', 'controller', 'Updating store initiated', {
      user_id: userId,
      store_id: storeId,
    });
    try {
      this.checkAuthorization(userId, user);

      const result = await this.storeService.update(user, storeId, request);

      this.loggerService.info(
        'STORE',
        'controller',
        'Store updated successfully',
        {
          user_id: result.userId,
          store_id: result.id,
          response_status: 200,
        },
      );

      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'STORE');
    }
  }

  @Delete(':storeId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async delete(
    @Auth() user: User,
    @Param('userId', ParseIntPipe) userId: number,
    @Param('storeId', ParseIntPipe) storeId: number,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    this.loggerService.info('STORE', 'controller', 'Deleting store initiated', {
      user_id: userId,
      store_id: storeId,
    });
    try {
      this.checkAuthorization(userId, user);

      const result = await this.storeService.delete(user, storeId);

      this.loggerService.info(
        'STORE',
        'controller',
        'Store deleted successfully',
        {
          user_id: userId,
          store_id: storeId,
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
      this.handleErrorService.controller(error, 'STORE');
    }
  }

  private checkAuthorization(userId: number, user: User): void {
    if (user.id !== userId) {
      this.loggerService.info(
        'STORE',
        'controller',
        'Checking authorization initiated',
        {
          user_id: userId
        }
      );

      this.loggerService.debug(
        'STORE',
        'controller',
        'Chechking Authorization initiated',
        {
          user_id: userId,
          email: user.email,
        },
      );
      throw new UnauthorizedException(
        `You are not authorized to access this user's stores`,
      );
    }
  }
}
