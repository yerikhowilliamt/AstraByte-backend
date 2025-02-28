import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Patch,
  Res,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { UserService } from './user.service';
import WebResponse, { Paging } from '../../models/web.model';
import { Auth } from '../../common/auth/auth.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { User } from '@prisma/client';
import { UserResponse } from '../../models/user.model';
import { UpdateUserRequest } from './dto/update-user.dto';
import { Response } from 'express';

@Controller('users/current')
export class UserController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private userService: UserService,
  ) {}

  private toUserResponse<T>(
    data: T,
    statusCode: number,
    paging?: Paging,
  ): WebResponse<T> {
    return {
      data,
      statusCode,
      timestamp: new Date().toISOString(),
      ...(paging && { paging }),
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async get(@Auth() user: User): Promise<WebResponse<UserResponse>> {
    const logData = {
      action: 'GET',
      timestamp: new Date().toString(),
    };

    this.logger.info(`USER CONTROLLER | GET user_email: ${user.email}`);
    try {
      const result = await this.userService.get(user);

      this.logger.info('Retrive user successfully', {
        ...logData,
        user_id: result.id,
      });
      return this.toUserResponse(result, 200);
    } catch (error) {
      this.logger.error(`Failed to retrive user data: ${error.message}`, {
        ...logData,
        user_id: user.id,
      });
      throw error;
    }
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async update(
    @Auth() user: User,
    @Body() request: UpdateUserRequest,
  ): Promise<WebResponse<UserResponse>> {
    const logData = {
      action: 'UPDATE',
      timestamp: new Date().toISOString(),
    };

    this.logger.info(
      `USER CONTROLLER | UPDATE user: ${user.email}, request: ${JSON.stringify(request)}`,
    );
    try {
      const result = await this.userService.update(user, request);

      this.logger.info('Update user successfully', {
        ...logData,
        user_id: result.id,
      });
      return this.toUserResponse(result, 200);
    } catch (error) {
      this.logger.error(`Failed to update user data: ${error.message}`, {
        ...logData,
        user_id: user.id,
      });
      throw error;
    }
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async logout(
    @Auth() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WebResponse<{ message: string; success: boolean }>> {
    const logData = {
      user_id: user.id,
      action: 'LOGOUT',
      timestamp: new Date().toString(),
    };

    try {
      this.logger.info(
        `USER CONTROLLER | LOGOUT user: ${JSON.stringify(user.id)}`,
      );

      this.setClearCookies(res);

      const result = await this.userService.logout(user);

      this.logger.info(result.message, {
        ...logData,
      });

      return this.toUserResponse(
        {
          message: result.message,
          success: result.success,
        },
        200,
      );
    } catch (error) {
      throw error;
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
