import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          console.log('Cookies:', request.cookies); // 🔹 Debug log
          if (!request?.cookies?.access_token) {
            console.error('No token found in cookies');
            throw new UnauthorizedException('No token found in cookies');
          }
          console.log('Token founded:', request.cookies.access_token); // 🔹 Log token
          return request.cookies.access_token;
        },
      ]), // 🚀 Hapus koma ekstra di sini
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: any) {
    console.log('Payload dari JWT:', payload);
    return { payload };
  }
}
