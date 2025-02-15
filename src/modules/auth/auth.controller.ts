import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AuthService } from './auth.service';
import WebResponse, { Paging } from '../../models/web.model';
import { RegisterAuthRequest } from './dto/register-auth.dto';
import { UserResponse } from '../../models/user.model';
import { LocalAuthGuard } from './guards/local.guard';
import { LoginAuthRequest } from './dto/login-auth.dto';
import { Request, Response } from 'express';
import { JwtAuthGuard } from './guards/jwt.guard';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private authService: AuthService,
  ) {}

  private toAuthResponse<T>(
    data: T,
    statusCode: number,
    paging?: Paging,
  ): WebResponse<T> {
    return {
      data,
      statusCode,
      timestamp: new Date().toString(),
      ...(paging ? { paging } : {}),
    };
  }

  @Post('register')
  @HttpCode(201)
  async register(
    @Body() request: RegisterAuthRequest,
  ): Promise<WebResponse<UserResponse>> {
    try {
      const result = await this.authService.register(request);

      return this.toAuthResponse(result, 201);
    } catch (error) {
      this.logger.error('Registration failed', error);
      throw error;
    }
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  async login(
    @Body() request: LoginAuthRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<WebResponse<UserResponse>> {
    try {
      const result = await this.authService.login(request);

      res.cookie('access_token', result.accessToken, {
        httpOnly: true, // Mencegah akses dari JavaScript
        secure: process.env.NODE_ENV === 'production', // Hanya HTTPS di production
        sameSite: 'strict', // Mencegah CSRF
        maxAge: 15 * 60 * 1000, // 15 menit
      });

      const { accessToken, ...data } = result;

      return this.toAuthResponse(data, 200);
    } catch (error) {
      this.logger.error('Login failed', error);
      throw error;
    }
  }

  @Post('new-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async newAccessToken(@Req() req: Request): Promise<WebResponse<{ newToken: string }>> {
    try {
      const user = req.user as User;
      const result = await this.authService.generateNewAccessToken(
        user.id,
        req.body.refreshToken,
      );

      return this.toAuthResponse({newToken: result.accessToken}, 200);
    } catch (error) {
      this.logger.error(`Failed to generate new access token: ${error.message}`);
      throw error
    }
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response): WebResponse<{ message: string; success: boolean }> {
    try {
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      return this.toAuthResponse(
        {
          message: 'Logout successful',
          success: true,
        },
        200,
      );
    } catch (error) {
      this.logger.error(`Failed to logout: ${error}`)
      throw error
    }
  }
}
