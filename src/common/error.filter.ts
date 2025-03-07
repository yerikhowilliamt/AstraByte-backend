import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { ZodError } from 'zod';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const timestamp = new Date().toISOString();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errors: { field?: string; message: string }[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      errors = this.handleHttpException(exception);
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      errors = this.handleZodError(exception);
    } else {
      this.logger.error('Unexpected error:', exception);
      errors = [{ message: 'Internal server error' }];
    }

    return response.status(status).json({
      success: false,
      errors,
      timestamp,
    });
  }

  private handleHttpException(
    exception: HttpException,
  ): { field?: string; message: string }[] {
    const responseBody = exception.getResponse();
    this.logger.warn('HttpException detected');

    if (typeof responseBody === 'object' && 'errors' in responseBody) {
      return (responseBody as any).errors.map((err: any) => ({
        field: err.path?.join('.') || 'unknown',
        message: err.message,
      }));
    }

    return [{ message: responseBody['message'] || 'Bad Request' }];
  }

  private handleZodError(
    exception: ZodError,
  ): { field: string; message: string }[] {
    this.logger.warn('ZodValidationException detected');
    return exception.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
  }
}
