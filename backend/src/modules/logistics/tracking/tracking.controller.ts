/**
 * @fileoverview TrackingController
 * Controlador HTTP para el dominio de rastreo y recepcion de webhooks de transportistas.
 * Proporciona un endpoint no bloqueante de alta concurrencia para ingesta de webhooks
 * (con validacion de firma criptografica HMAC y derivacion inmediata a BullMQ)
 * y un endpoint para consulta unificada de la linea de tiempo de rastreo.
 */

import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { CarrierCode } from '@prisma/client';
import * as crypto from 'crypto';
import { TrackingQueueProducer } from '../../queues/producers/tracking-queue.producer';
import { TrackingService } from './tracking.service';

/**
 * Controlador de tracking y webhooks de transportistas.
 */
@Controller('logistics')
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(
    private readonly queueProducer: TrackingQueueProducer,
    private readonly trackingService: TrackingService,
  ) {}

  /**
   * Idempotent Carrier Webhook Ingestion Endpoint
   * Enqueues immediately to BullMQ for asynchronous, non-blocking ingestion.
   */
  @Post('webhooks/:carrierCode')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleCarrierWebhook(
    @Param('carrierCode') carrierCodeParam: string,
    @Body() rawPayload: Record<string, unknown>,
    @Headers('x-carrier-signature') signature?: string,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    const carrierCode = carrierCodeParam.toUpperCase() as CarrierCode;

    if (!Object.values(CarrierCode).includes(carrierCode)) {
      throw new BadRequestException(`Unsupported carrier code: ${carrierCodeParam}`);
    }

    // Verify HMAC signature if secret is present
    const webhookSecret = process.env.WEBHOOK_SECRET_DEFAULT;
    if (signature && webhookSecret) {
      const isValidSignature = this.verifyHmacSignature(rawPayload, signature, webhookSecret);
      if (!isValidSignature) {
        this.logger.warn(`Invalid HMAC signature for webhook from carrier ${carrierCode}`);
        throw new UnauthorizedException('Invalid carrier webhook signature.');
      }
    }

    const trackingNumber =
      (rawPayload['tracking_number'] as string) ||
      (rawPayload['trackingNumber'] as string) ||
      (rawPayload['id'] as string);

    if (!trackingNumber) {
      throw new BadRequestException('Webhook payload missing required tracking number identifier.');
    }

    const eventId =
      (rawPayload['event_id'] as string) ||
      (rawPayload['id'] as string) ||
      `${carrierCode.toLowerCase()}-${trackingNumber}-${Date.now()}`;

    const queueResult = await this.queueProducer.enqueueWebhookEvent({
      eventId,
      carrierCode,
      trackingNumber,
      rawPayload,
      receivedAt: new Date().toISOString(),
      tenantId,
      signatureHeader: signature,
    });

    return {
      accepted: true,
      jobId: queueResult.jobId,
      carrierCode,
      trackingNumber,
      message: 'Carrier webhook accepted and queued for processing.',
    };
  }

  /**
   * Unified tracking status query endpoint
   */
  @Get('tracking/:trackingNumber')
  async getTracking(@Param('trackingNumber') trackingNumber: string) {
    return this.trackingService.getTrackingByNumber(trackingNumber);
  }

  private verifyHmacSignature(payload: Record<string, unknown>, signature: string, secret: string): boolean {
    try {
      const serialized = JSON.stringify(payload);
      const computed = crypto.createHmac('sha256', secret).update(serialized).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}
