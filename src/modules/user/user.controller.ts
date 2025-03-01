import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';

import { UserService } from './user.service';
import WebResponse, { response } from '../../models/web.model';
import { Auth } from '../../common/auth/auth.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { User } from '@prisma/client';
import { UserResponse } from '../../models/user.model';
import { UpdateUserRequest } from './dto/update-user.dto';
import { Response } from 'express';
import { LoggerService } from '../../common/logger.service';
import { handleErrorService } from '../../common/handle-error.service';

@Controller('users/current')
export class UserController {
  constructor(
    private loggerService: LoggerService,
    private userService: UserService,
    private handleErrorService: handleErrorService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async get(@Auth() user: User): Promise<WebResponse<UserResponse>> {
    this.loggerService.info('USER', 'controller', 'Fetching user initiated', {
      user_id: user.id,
    });
    try {
      const result = await this.userService.get(user);

      this.loggerService.info(
        'USER',
        'controller',
        'User fetched successfully',
        {
          user_id: result.id,
        },
      );
      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'USER');
    }
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async update(
    @Auth() user: User,
    @Body() request: UpdateUserRequest,
  ): Promise<WebResponse<UserResponse>> {
    this.loggerService.info('USER', 'controller', 'Updating user initiated', {
      user_id: user.id,
    });
    try {
      const result = await this.userService.update(user, request);

      this.loggerService.info(
        'USER',
        'controller',
        'User updated successfully',
        {
          user_id: result.id,
        },
      );
      return response(result, 200);
    } catch (error) {
      this.handleErrorService.controller(error, 'USER');
    }
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async logout(
    @Auth() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    this.loggerService.info('USER', 'controller', 'Deleting user intiated', {
      user_id: user.id,
    });
    try {
      this.setClearCookies(res);

      const result = await this.userService.logout(user);

      this.loggerService.info(
        'USER',
        'controller',
        'User deleted successfully',
        {
          user_id: user.id,
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
      this.handleErrorService.controller(error, 'USER');
    }
  }

  setClearCookies(res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
  }
}
