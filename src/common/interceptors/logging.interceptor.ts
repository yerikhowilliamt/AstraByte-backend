import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const requestId = `req-${randomUUID()}`;
    
    const user = request.user || { id: 'anonymous' };
    const { method, url } = request;

    this.logger.info(`REQUEST RECIVED: ${method} ${url}`, {
      layer: '[INTERCEPTOR]',
      request_id: requestId,
      user_id: user.i
    });

    const now = Date.now();

    return next.handle().pipe(
      tap((response) => {
        const duration = Date.now() - now;

        this.logger.info(`REQUEST COMPLETED: ${method} ${url}`, {
          layer: '[interceptor]',
          request_id: requestId,
          user_id: user.id,
          duration: `${duration}ms`,
        });

        return response;
      }),
    );
  }
}
