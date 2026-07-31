import { AppModule } from '@/app.module';
import { ErrorFilter } from '@/common/filters/error.filter';
import { PrismaExceptionFilter } from '@/common/filters/prisma.filter';
import { ConfigService, swaggerConfig } from '@/core';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Task-table imports upload several XML documents in one JSON body (the
  // multi-file ACS wizard); Express's 100kb default is too small. Keep in
  // sync with the 2MB-per-file cap in the import body schemas.
  app.useBodyParser('json', { limit: '16mb' });

  const protocol = config.get('API_PROTOCOL');
  const port = config.get('API_PORT');
  const host = config.get('API_HOST');
  const prefix = config.get('API_PREFIX');

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Worker-Token'],
    exposedHeaders: ['X-Total-Count'],
    credentials: true,
  });

  app.setGlobalPrefix(prefix);

  app.use(cookieParser());

  app.set('trust proxy', 1);

  // NestJS checks the last-registered filter first, so the catch-all
  // ErrorFilter is the fallback and PrismaExceptionFilter takes precedence for
  // Prisma known errors (e.g. unique-violation → 409 instead of a generic 500).
  app.useGlobalFilters(new ErrorFilter(), new PrismaExceptionFilter());

  app.enableShutdownHooks();

  if (!config.isProduction) {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.debug('Swagger documentation enabled at /api/docs');
  }

  await app.listen(port, host);

  logger.debug(`DPMC API running on ${protocol}://${host}:${port}/${prefix}`);
}

void bootstrap();
