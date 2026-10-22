import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { configuration } from './config/env.config';
import { PrismaModule } from './database/prisma.module';
import { QueuesModule } from './modules/queues/queues.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { EcommerceModule } from './modules/ecommerce/ecommerce.module';

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
    QueuesModule,
    LogisticsModule,
    EcommerceModule,
  ],
})
export class AppModule {}
