import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoggerService } from './logger.service';
import { ZodError } from 'zod';

@Injectable()
export class handleErrorService {
  constructor(private loggerService: LoggerService) {}

  controller(error: Error, service: string): never {
    if (error instanceof UnauthorizedException) {
      this.loggerService.error(service, 'controller', 'Unautorized user', {
        error: error.message,
        response_status: 401,
      });

      throw error;
    }

    this.loggerService.error(service, 'controller', 'Internal server error', {
      error: error.message,
    });
    throw error;
  }

  service(
    error: Error,
    service: string,
    message: string,
    details?: object,
  ): never {
    this.loggerService.error(service, 'service', message, {
      ...details,
      error: error.message,
    });
    if (
      error instanceof ZodError ||
      error instanceof BadRequestException ||
      error instanceof NotFoundException
    ) {
      throw error;
    } else {
      this.loggerService.error(service, 'service', 'Internal server error', {
        error: error.message,

        response_status: 500,
      });
      throw new InternalServerErrorException(
        'An unexpected error occurred. Please try again.',
      );
    }
  }
}
