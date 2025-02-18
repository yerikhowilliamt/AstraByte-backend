import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
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
import { GoogleAuthGuard } from './guards/google.guard';

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
    const logData = {
      action: 'CREATE',
      timestamp: new Date().toISOString(),
    };
    try {
      const result = await this.authService.register(request);

      this.logger.info('User create successfully', {
        ...logData,
        user_id: result.id,
      });
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
    const logData = {
      action: 'POST',
      timestamp: new Date().toISOString(),
    };
    try {
      const result = await this.authService.login(request);

      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 Menit
      });

      const { accessToken, ...data } = result;

      this.logger.info('User login successfully', {
        ...logData,
        user_id: result.id,
        access_token: result.accessToken,
      });

      return this.toAuthResponse(data, 200);
    } catch (error) {
      this.logger.error('Login failed', error);
      throw error;
    }
  }

  @Get('google/login')
  @UseGuards(GoogleAuthGuard)
  @HttpCode(302)
  async googleLogin() {
    return {
      message: 'Google Authentication - Redirecting...',
    };
  }

  @Get('google/redirect')
  @HttpCode(302)
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res: Response): Promise<void> {
    try {
      const { user } = req;

      if (!user) {
        throw new UnauthorizedException('Google authentication failed');
      }

      const userId = user.id;
      const currentUser = await this.authService.findUserById(userId);
      const accessToken = currentUser.accessToken;

      res
        .cookie('access_token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 15 * 60 * 1000, // 15 menit
        })
        .redirect('http://localhost:3000');
    } catch (error) {
      this.logger.error(
        `Failed to login with google account: ${error.message}`,
      );
      throw new UnauthorizedException('Authentication failed');
    }
  }

  @Post('new-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async newAccessToken(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const logData = {
      action: 'CREATE',
      timestamp: new Date().toISOString(),
    };

    try {
      const user = req.user as User;
      const result = await this.authService.generateNewAccessToken(
        user.id,
        req.body.refreshToken,
      );

      this.logger.info('Create new access token successfully', {
        ...logData,
        user_id: user.id,
        new_token: result.accessToken,
      });

      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 menit
      });
    } catch (error) {
      this.logger.error(
        `Failed to generate new access token: ${error.message}`,
      );
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(200)
  logout(
    @Res({ passthrough: true }) res: Response,
  ): WebResponse<{ message: string; success: boolean }> {
    const logData = {
      action: 'DELETE',
      timestamp: new Date().toISOString(),
    };
    try {
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      this.logger.info('User logout successfully', {
        ...logData,
      });

      return this.toAuthResponse(
        {
          message: 'Logout successful',
          success: true,
        },
        200,
      );
    } catch (error) {
      this.logger.error(`Failed to logout: ${error}`);
      throw error;
    }
  }
}
