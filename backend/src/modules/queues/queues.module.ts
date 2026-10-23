/**
 * @fileoverview QueuesModule
 * Modulo central de infraestructura asincrona con BullMQ y Redis.
 * Configura la conexion TCP persistente (con soporte TLS para Upstash) y
 * registra todas las colas de trabajo, productores y procesadores del sistema.
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUES } from '../../common/constants/queues.constants';
import { TrackingQueueProducer } from './producers/tracking-queue.producer';
import { LabelQueueProducer } from './producers/label-queue.producer';
import { NotificationQueueProducer } from './producers/notification-queue.producer';
import { DeadLetterProducer } from './producers/dead-letter.producer';
import { TrackingProcessor } from './processors/tracking.processor';

/**
 * Modulo que orquesta las colas de mensajeria asincrona del sistema logistico.
 * Exporta los productores para permitir que otros modulos encolen tareas
 * desacopladas (webhooks, generacion de guias, notificaciones y DLQ).
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      /**
       * Fabrica dinamica de configuracion para la conexion a Redis.
       * Soporta conexiones directas con cadena URI (REDIS_URL con rediss:// para TLS)
       * o desglosadas por host/puerto/password con deteccion automatica para Upstash.
       *
       * @param config Servicio de configuracion inyectado
       * @returns Opciones de configuracion para BullMQ y el cliente ioredis
       */
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            connection: {
              url: redisUrl,
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
              tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
            },
          };
        }

        const host = config.get<string>('REDIS_HOST', '127.0.0.1');
        const isUpstash = host.includes('upstash.io');

        return {
          connection: {
            host,
            port: config.get<number>('REDIS_PORT', 6379),
            password: config.get<string>('REDIS_PASSWORD') || undefined,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            tls: isUpstash ? { rejectUnauthorized: false } : undefined,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUES.CARRIER_WEBHOOKS },
      { name: QUEUES.LABEL_GENERATION },
      { name: QUEUES.NOTIFICATIONS },
      { name: QUEUES.DEAD_LETTER },
    ),
  ],
  providers: [
    TrackingQueueProducer,
    LabelQueueProducer,
    NotificationQueueProducer,
    DeadLetterProducer,
    TrackingProcessor,
  ],
  exports: [
    BullModule,
    TrackingQueueProducer,
    LabelQueueProducer,
    NotificationQueueProducer,
    DeadLetterProducer,
  ],
})
export class QueuesModule {}
