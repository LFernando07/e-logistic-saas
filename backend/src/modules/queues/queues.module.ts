import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUES } from '../../common/constants/queues.constants';
import { TrackingQueueProducer } from './producers/tracking-queue.producer';
import { LabelQueueProducer } from './producers/label-queue.producer';
import { NotificationQueueProducer } from './producers/notification-queue.producer';
import { DeadLetterProducer } from './producers/dead-letter.producer';
import { TrackingProcessor } from './processors/tracking.processor';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', '127.0.0.1'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
      }),
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
