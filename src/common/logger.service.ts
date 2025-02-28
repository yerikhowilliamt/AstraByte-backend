import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggerService {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private logger: Logger) { }

  info(
    service: string,
    layer: string,
    message: string,
    details?: object,
  ) {
    if (layer === 'service') {
      this.logger.log('info', message, {
        layer: `[${service} SERVICE]`,
        request_id: `req-${ randomUUID() }`,
        ...details,
      });
    } else if (layer === 'controller') {
      this.logger.log('info', message, {
        layer: `[${service} CONTROLLER]`,
        request_id: `req-${ randomUUID() }`,
        ...details,
      })
    } else {
      this.logger.log('info', message, {
        layer: `[${service}]`,
        request_id: `req-${ randomUUID() }`,
        ...details,
      })
    }
  }

  warn(
    service: string,
    layer: string,
    message: string,
    details?: object,
  ) {
    if (layer === 'service') {
      this.logger.log('warn', message, {
        layer: `[${service} SERVICE]`,
        request_id: `req-${randomUUID()}`,
        ...details,
      });
    } else if (layer === 'controller') {
      this.logger.log('warn', message, {
        layer: `[${service} CONTROLLER]`,
        request_id: `req-${randomUUID()}`,
        ...details,
      })
    } else {
      this.logger.log('warn', message, {
        layer: `[${service}]`,
        request_id: `req-${randomUUID()}`,
        ...details,
      })
    }
  }

  error(
    service: string,
    layer: string,
    message: string,
    details?: object,
  ) {
    if (layer === 'service') {
      this.logger.log('error', message, {
        layer: `[${service} SERVICE]`,
        request_id: `req-${randomUUID()}`,
        ...details,
      });
    } else if (layer === 'controller') {
      this.logger.log('error', message, {
        layer: `[${service} CONTROLLER]`,
        request_id: `req-${randomUUID()}`,
        ...details,
      })
    } else {
      this.logger.log('error', message, {
        layer: `[${service}]`,
        request_id: `req-${randomUUID()}`,
        ...details,
      })
    }
  }

  debug(
    service: string,
    layer: string,
    message: string,
    details?: object,
  ) {
    if (layer === 'service') {
      this.logger.log('debug', message, {
        layer: `[${service} SERVICE]`,
        request_id: `req-${randomUUID()}`,
        ...details,
      });
    } else if (layer === 'controller') {
      this.logger.log('debug', message, {
        layer: `[${service} CONTROLLER]`,
        request_id: `req-${randomUUID()}`,
        ...details,
      })
    } else {
      this.logger.log('debug', message, {
        layer: `[${service}]`,
        request_id: `req-${randomUUID()}`,
        ...details,
      })
    }
  }
}
