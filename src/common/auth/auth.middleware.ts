import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private prismaService: PrismaService,
    private configService: ConfigService
  ) { }
  
  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

    console.log(`AUTH MIDDLEWARE | Token received: ${token ? 'Yes' : 'No'}`);

    if (!token) {
      console.log('AUTH MIDDLEWARE | No token provided, proceeding as guest');
      throw new UnauthorizedException('No token provided')
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET')
      });

      console.log(`AUTH MIDDLEWARE | Token verified. User ID: ${payload.userId}`);

      const user = await this.prismaService.user.findUnique({
        where: { id: payload.userId }
      });

      if (!user) {
        console.log('AUTH MIDDLEWARE | User not found in database');
        throw new UnauthorizedException('User not found')
      }

      console.log(`AUTH MIDDLEWARE | User authenticated: ${user.email}`);
      req.user = user;

      next()
    } catch (error) {
      console.log(`AUTH MIDDLEWARE | JWT Verification Failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}
