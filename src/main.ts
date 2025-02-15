import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT

  app.use(cookieParser());
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ZodValidationPipe())

  await app.listen(port);
  console.log(`Application running on port ${port}`)
}
bootstrap();
