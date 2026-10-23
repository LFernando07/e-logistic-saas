/**
 * @fileoverview TrackingQueueProducer
 * Productor responsable de encolar webhooks de transportistas en la cola BullMQ 'carrier-webhooks'.
 * Implementa generacion determinista de identificadores de trabajo (Job ID) basada en hashing
 * SHA-256 para garantizar idempotencia y prevenir procesamiento duplicado por retransmisiones de red.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { QUEUES, JOB_NAMES, DEFAULT_JOB_OPTIONS } from '../../../common/constants/queues.constants';
import { CarrierWebhookJobPayload } from '../dto/carrier-webhook-job.payload';

/**
 * Servicio productor para la cola de webhooks de transportistas.
 */
@Injectable()
export class TrackingQueueProducer {
  private readonly logger = new Logger(TrackingQueueProducer.name);

  constructor(
    @InjectQueue(QUEUES.CARRIER_WEBHOOKS)
    private readonly carrierWebhooksQueue: Queue<CarrierWebhookJobPayload>,
  ) {}

  /**
   * Genera un identificador de trabajo determinista basado en el codigo del transportista,
   * numero de guia y un hash SHA-256 del contenido del payload (ordenando sus claves).
   * Esto previene que duplicados de red generen eventos duplicados en la base de datos.
   *
   * @param carrierCode Codigo unico del transportista (ej. 'MOCK', 'FEDEX', 'DHL')
   * @param trackingNumber Numero de guia o rastreo del paquete
   * @param rawPayload Contenido JSON recibido en el webhook
   * @returns Cadena con el Job ID determinista
   */
  public generateDeterministicJobId(
    carrierCode: string,
    trackingNumber: string,
    rawPayload: Record<string, unknown>,
  ): string {
    const serializedPayload = JSON.stringify(rawPayload, Object.keys(rawPayload).sort());
    const hash = crypto.createHash('sha256').update(serializedPayload).digest('hex').substring(0, 16);
    return `${carrierCode.toLowerCase()}-${trackingNumber}-${hash}`;
  }

  /**
   * Encola un payload de webhook entrante en BullMQ con su Job ID determinista y
   * la politica de reintentos exponenciales por defecto (5 intentos).
   *
   * @param payload Datos del webhook recibido
   * @returns Objeto con el identificador del trabajo (jobId) y bandera de encolamiento
   */
  async enqueueWebhookEvent(payload: CarrierWebhookJobPayload): Promise<{ jobId: string; isEnqueued: boolean }> {
    const deterministicJobId = this.generateDeterministicJobId(
      payload.carrierCode,
      payload.trackingNumber,
      payload.rawPayload,
    );

    this.logger.log(`Enqueueing webhook job: ${deterministicJobId} for tracking: ${payload.trackingNumber}`);

    try {
      const job = await this.carrierWebhooksQueue.add(
        JOB_NAMES.PROCESS_CARRIER_WEBHOOK,
        payload,
        {
          ...DEFAULT_JOB_OPTIONS,
          jobId: deterministicJobId,
        },
      );

      return {
        jobId: job.id ?? deterministicJobId,
        isEnqueued: true,
      };
    } catch (error) {
      this.logger.error(`Failed to enqueue job ${deterministicJobId}: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }
}
