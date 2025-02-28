import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import WebResponse, { Paging } from '../../models/web.model';
import { RegisterAuthRequest } from './dto/register-auth.dto';
import { UserResponse } from '../../models/user.model';
import { LocalAuthGuard } from './guards/local.guard';
import { LoginAuthRequest } from './dto/login-auth.dto';
import { Request, Response } from 'express';
import { GoogleAuthGuard } from './guards/google.guard';
import { LoggerService } from '../../common/logger.service';

@Controller('auth')
export class AuthController {
  constructor(
    private loggerService: LoggerService,
    private authService: AuthService,
  ) {}

  private toAuthResponse<T>(data: T, statusCode: number, paging?: Paging): WebResponse<T> {
    return {
      data,
      statusCode,
      timestamp: new Date().toString(),
      ...(paging ? { paging } : {}),
    };
  }

  @Post('register')
  @HttpCode(201)
  async register(@Body() request: RegisterAuthRequest): Promise<WebResponse<UserResponse>> {
    try {
      const result = await this.authService.register(request);
      this.loggerService.info('AUTH', 'controller', 'Registration new user success', {
        user_id: result.id,
        response_status: 201
      });
      return this.toAuthResponse(result, 201);
    } catch (error) {
      this.loggerService.error('AUTH', 'controller', 'Registration failed', {
        error: error.message,
        stack: error.stack,
        response_status: 500
      })
      throw error;
    }
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  async login(@Body() request: LoginAuthRequest, @Res({ passthrough: true }) res: Response): Promise<WebResponse<UserResponse>> {
    try {
      const result = await this.authService.login(request);

      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      const { accessToken, refreshToken, ...data } = result;

      this.loggerService.info('AUTH', 'controller', 'Login Success', {
        user_id: result.id,
        response_status: 200
      })

      return this.toAuthResponse(data, 200);
    } catch (error) {
      this.loggerService.error('AUTH', 'controller', 'Login failed', {
        error: error.message,
        stack: error.stack,
        response_status: 500
      })
      throw error;
    }
  }

  @Get('google/login')
  @UseGuards(GoogleAuthGuard)
  @HttpCode(302)
  async googleLogin() {
    return { message: 'Google Authentication - Redirecting...' };
  }

  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  @HttpCode(200)
  async googleAuthRedirect(@Req() req, @Res() res: Response): Promise<void> {
    try {
      const { user } = req;

      if (!user) {
        throw new UnauthorizedException('Google authentication failed');
      }

      const currentUser = await this.authService.findUserById(user.id);
      res.cookie('access_token', currentUser.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
    } catch (error) {
      this.loggerService.error('AUTH', 'controller', 'Failed to login with Google account', {
        error: error.message,
        stack: error.stack,
        response_status: 500
      })
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Post('new-token')
  @HttpCode(200)
  async newToken(@Req() req: Request, @Res() res: Response) {
    try {
      const refreshToken = req.cookies?.refresh_token;

      if (!refreshToken) {
        throw new UnauthorizedException('Refresh token not found');
      }

      const result = await this.authService.generateNewAccessToken(refreshToken);

      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      this.loggerService.info('AUTH', 'controller', 'Created new access token success', {
        response_status: 200
      })

      return res.json(this.toAuthResponse({ message: 'Created new token successfully' }, 200));
    } catch (error) {
      this.loggerService.error('AUTH', 'controller', 'Failed to generate new access token', {
        error: error.message,
        stack: error.stack,
        response_status: 500
      })
      throw error;
    }
  }
}
