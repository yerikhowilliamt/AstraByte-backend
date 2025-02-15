import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const Auth = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const token =
      request.cookies?.access_token ||
      request.headers?.authorization?.split(' ')[1];

    if (!token) {
      console.log('AUTH DECORATOR | No Token Found');
      return null;
    }

    try {
      const jwtService = new JwtService();
      const decoded = jwtService.decode(token) as { id: number; email: string };

      console.log('AUTH DECORATOR | Decoded Payload:', decoded);

      if (!decoded || !decoded.email) {
        console.log('AUTH DECORATOR | USER: No Email Found');
        return null;
      }

      return decoded;
    } catch (error) {
      console.error('AUTH DECORATOR | JWT Decode Error:', error);
      return null;
    }
  },
);
