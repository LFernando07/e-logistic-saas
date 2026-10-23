/**
 * @fileoverview Main Bootstrap Entrypoint
 * Punto de entrada de la aplicacion NestJS para el SaaS multi-carrier y e-commerce.
 * Configura pipes globales de validacion y transformacion, filtros globales de excepcion,
 * CORS para permitir acceso a los portales web y gestion de apagado ordenado (shutdown hooks).
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Inicializa y arranca el servidor HTTP de NestJS.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`Application started and listening on port ${port}`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', err);
  process.exit(1);
});
