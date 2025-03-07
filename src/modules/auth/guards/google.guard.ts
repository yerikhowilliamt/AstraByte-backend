import {
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor() {
    super();
  }

  async canActivate(context: ExecutionContext) {
    try {
      const activate = (await super.canActivate(context)) as boolean;
      console.log('GoogleAuthGuard: Activation successful');
      return activate;
    } catch (error) {
      console.error('Error in GoogleAuthGuard:', error.message);
      throw new InternalServerErrorException(error.message);
    }
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      console.error('GoogleAuthGuard: Error or no user found:', err || info);
      throw err || new UnauthorizedException('User not authenticated');
    }
    console.log('GoogleAuthGuard: User authenticated successfully:', user);
    return user;
  }
}
