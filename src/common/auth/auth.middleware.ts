import {
  Inject,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private prismaService: PrismaService,
    private configService: ConfigService,
    private loggerService: LoggerService
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const accessToken = req.cookies?.access_token;
    const refreshToken = req.cookies?.refresh_token;
    this.loggerService.debug('AUTH', 'MIDDLEWARE', 'Tokens', {
      access_token: accessToken,
      refresh_token: refreshToken
    })

    this.loggerService.info('AUTH', 'MIDDLEWARE', 'Middleware executed')

    if (!accessToken || !refreshToken) {
      this.loggerService.warn('AUTH', 'MIDDLEWARE', 'Missing access or refresh token')
      throw new UnauthorizedException('Missing access or refresh token');
    }

    try {
      const payload = this.jwtService.verify(accessToken, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      const user = await this.prismaService.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        this.loggerService.warn('AUTH', 'MIDDLEWARE', 'User not found in database')
        throw new UnauthorizedException('User not found');
      }

      req.user = user;
      return next();
    } catch (error) {
      this.loggerService.error('AUTH', 'MIDDLEWARE', 'Invalid access token', {
          error: error.message,
          stack: error.stack,
      })
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
