import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AuthMiddleware } from './auth/auth.middleware';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { ValidationService } from './validation.service';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ErrorFilter } from './error.filter';
import { JwtModule } from '@nestjs/jwt';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { LoggerService } from './logger.service';
import { handleErrorService } from './handle-error.service';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryProvider } from '../config/cloudinary.config';

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          // level: 'debug',
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              return `[${timestamp}] ${level}: ${message} ${JSON.stringify(meta)}`;
            }),
          ),
        }),
      ],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
    }),
  ],
  providers: [
    PrismaService,
    ValidationService,
    {
      provide: APP_FILTER,
      useClass: ErrorFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    LoggerService,
    handleErrorService,
    CloudinaryProvider,
    CloudinaryService,
  ],
  exports: [
    PrismaService,
    ValidationService,
    LoggerService,
    handleErrorService,
    CloudinaryService,
  ],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: '/api/auth/login', method: RequestMethod.POST },
        { path: '/api/auth/register', method: RequestMethod.POST },
      )
      .forRoutes({ path: '/api/*path', method: RequestMethod.ALL });
  }
}
