import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ZodError } from 'zod';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const timestamp = new Date().toISOString();

    const errors = this.formatErrors(exception);

    return response.status(400).json({
      success: false,
      errors,
      timestamp,
    });
  }

  private formatErrors(exception: any): { field?: string; message: string }[] {
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception);
    } else if (exception instanceof ZodError) {
      return this.handleZodError(exception);
    }

    this.logger.error('Unexpected error:', exception);

    return [{ message: 'Internal server error' }];
  }

  private handleHttpException(
    exception: HttpException,
  ): { field?: string; message: string }[] {
    const responseBody = exception.getResponse();
    this.logger.warn('HttpException detected');

    if (typeof responseBody === 'object' && 'errors' in responseBody) {
      return (responseBody.errors as any[]).map((err) => ({
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
