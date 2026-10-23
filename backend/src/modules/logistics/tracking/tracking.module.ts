/**
 * @fileoverview tracking.module.ts
 * Modulo que orquesta el controlador de webhooks, el servicio de verificacion de firmas
 * y el servicio de consulta enriquecida de tracking post-compra.
 */

import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { WebhookVerifierService } from './services/webhook-verifier.service';
import { QueuesModule } from '../../queues/queues.module';

/**
 * Modulo de seguimiento y webhooks de transportistas.
 */
@Module({
  imports: [QueuesModule],
  controllers: [TrackingController],
  providers: [TrackingService, WebhookVerifierService],
  exports: [TrackingService, WebhookVerifierService],
})
export class TrackingModule {}
