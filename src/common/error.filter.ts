import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { ZodError } from 'zod';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const timestamp = new Date().toISOString();

    // Tangani validasi Zod
    if (exception instanceof ZodError) {
      const errors = exception.errors.map(err => ({ message: err.message, path: err.path.join('.') }));
      this.logger.warn(`Validation error: ${errors.map(e => e.message).join(', ')}`);
      return response.status(400).json({ success: false, errors, timestamp });
    }

    // Tangani error HTTP
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const responseBody = exception.getResponse();

      let message: string;
      if (typeof responseBody === 'string') {
        message = responseBody;
      } else if (typeof responseBody === 'object' && 'message' in responseBody) {
        const extractedMessage = (responseBody as { message?: string | string[] }).message;
        message = Array.isArray(extractedMessage) ? extractedMessage[0] : extractedMessage || 'Bad Request';
      } else {
        message = 'Bad Request';
      }

      this.logger.warn(`HTTP ${status}: ${message}`);
      return response.status(status).json({ success: false, errors: [{ message }], timestamp });
    }

    
    this.logger.error(`Internal Error: ${exception.message}`, exception.stack);
    response.status(500).json({
      success: false,
      errors: [{ message: 'Internal server error' }],
      timestamp,
    });
  }
}
