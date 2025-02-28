import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export const Auth = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const token =
      request.cookies?.access_token ||
      request.headers?.authorization?.split(' ')[1];

    if (!token) {
      return null;
    }

    try {
      const jwtService = new JwtService();
      const decoded = jwtService.decode(token) as { id: number; email: string };

      if (!decoded || !decoded.email) {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  },
);
