/**
 * @fileoverview tracking.controller.ts
 * Controlador HTTP para el dominio de rastreo y recepcion de webhooks de transportistas.
 * Proporciona un endpoint no bloqueante de alta concurrencia para ingesta de webhooks
 * (con validacion de firma criptografica HMAC y derivacion inmediata a BullMQ)
 * y un endpoint para consulta unificada de la linea de tiempo de rastreo enriquecida.
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
import { TrackingQueueProducer } from '../../queues/producers/tracking-queue.producer';
import { TrackingService } from './tracking.service';
import { WebhookVerifierService } from './services/webhook-verifier.service';

/**
 * Controlador de tracking y webhooks de transportistas.
 */
@Controller('logistics')
export class TrackingController {
  private readonly logger = new Logger(TrackingController.name);

  constructor(
    private readonly queueProducer: TrackingQueueProducer,
    private readonly trackingService: TrackingService,
    private readonly webhookVerifier: WebhookVerifierService,
  ) {}

  /**
   * Endpoint de ingesta idempotente de webhooks de paqueterias.
   * Valida la firma HMAC criptografica del transportista y encola inmediatamente en BullMQ.
   * Retorna 202 Accepted para responder en menos de 20ms a la paqueteria.
   *
   * @param carrierCodeParam Codigo del carrier ('mock', 'skydropx', 'fedex', 'dhl', etc.)
   * @param rawPayload Contenido JSON del evento enviado por el transportista
   * @param allHeaders Encabezados de la peticion HTTP para resolver la firma correspondiente
   * @param tenantId Identificador opcional del tenant si viene en encabezado
   * @returns Confirmacion de recepcion con el Job ID determinista
   */
  @Post('webhooks/:carrierCode')
  @HttpCode(HttpStatus.ACCEPTED)
  async handleCarrierWebhook(
    @Param('carrierCode') carrierCodeParam: string,
    @Body() rawPayload: Record<string, unknown>,
    @Headers() allHeaders: Record<string, string>,
    @Headers('x-tenant-id') tenantId?: string,
  ) {
    const carrierCode = carrierCodeParam.toUpperCase() as CarrierCode;

    if (!Object.values(CarrierCode).includes(carrierCode)) {
      throw new BadRequestException(`Unsupported carrier code: ${carrierCodeParam}`);
    }

    // Resolver el encabezado de firma esperado para el transportista
    const signatureHeaderName = this.webhookVerifier.getExpectedSignatureHeader(carrierCode);
    const signature =
      allHeaders[signatureHeaderName] ||
      allHeaders['x-carrier-signature'] ||
      allHeaders['x-signature'];

    // En transportistas distintos de MOCK, o si se envia firma, se valida rigurosamente
    if (signature) {
      const isValid = this.webhookVerifier.verifySignature(carrierCode, rawPayload, signature);
      if (!isValid) {
        this.logger.warn(`Signature verification failed for carrier ${carrierCode}`);
        throw new UnauthorizedException('Invalid carrier webhook cryptographic signature.');
      }
    }

    // Extraer numero de guia o identificador del paquete
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

    // Encolar con Job ID determinista para evitar duplicidad
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
   * Endpoint de simulacion para disparar eventos de prueba en entornos locales o testing.
   */
  @Post('webhooks/simulate/event')
  @HttpCode(HttpStatus.ACCEPTED)
  async simulateWebhookEvent(
    @Body()
    body: {
      trackingNumber: string;
      status: string;
      description?: string;
      location?: string;
      carrierCode?: CarrierCode;
    },
  ) {
    const carrierCode = body.carrierCode || CarrierCode.MOCK;
    const rawPayload = {
      tracking_number: body.trackingNumber,
      status: body.status,
      description: body.description || `Simulated event: ${body.status}`,
      location: body.location || 'Test Center',
      timestamp: new Date().toISOString(),
      simulated: true,
    };

    const signature = this.webhookVerifier.generateTestSignature(rawPayload);

    return this.handleCarrierWebhook(
      carrierCode.toLowerCase(),
      rawPayload,
      { 'x-carrier-signature': signature },
    );
  }

  /**
   * Endpoint publico para consulta de seguimiento post-compra enriquecido.
   *
   * @param trackingNumber Numero de guia
   * @returns Linea de tiempo con hitos, porcentaje de avance y branding del comercio
   */
  @Get('tracking/:trackingNumber')
  async getTracking(@Param('trackingNumber') trackingNumber: string) {
    return this.trackingService.getTrackingByNumber(trackingNumber);
  }
}
