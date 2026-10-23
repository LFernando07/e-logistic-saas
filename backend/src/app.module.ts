/**
 * @fileoverview AppModule
 * Modulo raiz de la aplicacion backend.
 * Importa y combina los modulos fundamentales de infraestructura (ConfigModule, EventEmitterModule,
 * PrismaModule, QueuesModule) y los modulos de dominio de negocio (LogisticsModule, EcommerceModule).
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { configuration } from './config/env.config';
import { PrismaModule } from './database/prisma.module';
import { QueuesModule } from './modules/queues/queues.module';
import { StorageModule } from './modules/storage/storage.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuthModule } from './modules/auth/auth.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { EcommerceModule } from './modules/ecommerce/ecommerce.module';

/**
 * Modulo raiz del backend monolito modular.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    PrismaModule,
    StorageModule,
    NotificationsModule,
    AuthModule,
    QueuesModule,
    LogisticsModule,
    EcommerceModule,
  ],
})
export class AppModule {}
