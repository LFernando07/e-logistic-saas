/**
 * @fileoverview TrackingProcessor
 * Consumidor y procesador de eventos de la cola BullMQ 'carrier-webhooks'.
 * Transforma eventos crudos de multiples transportistas en un formato canonico unificado,
 * persiste los eventos en PostgreSQL via Prisma, actualiza el estado del envio y emite
 * eventos internos para notificaciones. En caso de fallas repetidas, redirige el trabajo a DLQ.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TrackingEventStatus } from '@prisma/client';
import { QUEUES } from '../../../common/constants/queues.constants';
import { CarrierWebhookJobPayload } from '../dto/carrier-webhook-job.payload';
import { DeadLetterProducer } from '../producers/dead-letter.producer';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Estructura de resultado estandarizada emitida tras procesar con exito un evento de rastreo.
 */
export interface ProcessedTrackingResult {
  jobId: string;
  trackingNumber: string;
  normalizedStatus: TrackingEventStatus;
  description: string;
  timestamp: string;
  location?: string;
  isDelivered: boolean;
}

/**
 * Procesador de fondo para trabajos en la cola de webhooks de transportistas.
 */
@Processor(QUEUES.CARRIER_WEBHOOKS)
export class TrackingProcessor extends WorkerHost {
  private readonly logger = new Logger(TrackingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly deadLetterProducer: DeadLetterProducer,
  ) {
    super();
  }

  /**
   * Metodo principal ejecutado por BullMQ al consumir un trabajo de la cola.
   * Normaliza el estado, persiste en la base de datos de forma transaccional y
   * emite el evento 'tracking.event.processed'. Si se agotan los reintentos,
   * envia el trabajo al Dead Letter Queue (DLQ).
   *
   * @param job Instancia del trabajo en BullMQ conteniendo el payload del webhook
   * @returns Resultado procesado con el estado normalizado
   */
  async process(job: Job<CarrierWebhookJobPayload>): Promise<ProcessedTrackingResult> {
    const { data, id, attemptsMade } = job;
    this.logger.log(`Processing tracking webhook job ${id} (Attempt ${attemptsMade + 1}) for tracking ${data.trackingNumber}`);

    try {
      const normalizedStatus = this.mapToCanonicalStatus(data.rawPayload);
      const description = this.extractDescription(data.rawPayload);
      const location = this.extractLocation(data.rawPayload);
      const eventTimestamp = new Date(this.extractTimestamp(data.rawPayload) || data.receivedAt);

      // Persist TrackingEvent and update Shipment status if shipment exists
      const existingShipment = await this.prisma.shipment.findUnique({
        where: { trackingNumber: data.trackingNumber },
      });

      if (existingShipment) {
        await this.prisma.$transaction(async (tx) => {
          await tx.trackingEvent.create({
            data: {
              shipmentId: existingShipment.id,
              status: normalizedStatus,
              rawStatus: String(data.rawPayload['status'] || 'UNKNOWN'),
              description,
              location,
              eventTimestamp,
              carrierCode: data.carrierCode,
              rawPayload: data.rawPayload as object,
            },
          });

          await tx.shipment.update({
            where: { id: existingShipment.id },
            data: {
              status: normalizedStatus as any,
              deliveredAt: normalizedStatus === TrackingEventStatus.DELIVERED ? eventTimestamp : existingShipment.deliveredAt,
            },
          });
        });
      }

      const result: ProcessedTrackingResult = {
        jobId: String(id),
        trackingNumber: data.trackingNumber,
        normalizedStatus,
        description,
        timestamp: eventTimestamp.toISOString(),
        location,
        isDelivered: normalizedStatus === TrackingEventStatus.DELIVERED,
      };

      // Emit event for downstream consumers (e.g. notifications, store updates)
      this.eventEmitter.emit('tracking.event.processed', result);

      return result;
    } catch (error) {
      this.logger.error(
        `Error processing job ${id} for tracking ${data.trackingNumber}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // If job has reached maximum attempts (4 made, this is 5th), send to DLQ
      if (job.opts.attempts && attemptsMade + 1 >= job.opts.attempts) {
        await this.deadLetterProducer.sendToDeadLetterQueue({
          originalQueue: QUEUES.CARRIER_WEBHOOKS,
          originalJobId: job.id,
          originalJobName: job.name,
          payload: data,
          failedReason: (error as Error).message,
          stackTrace: (error as Error).stack,
          attemptsMade: attemptsMade + 1,
          failedAt: new Date().toISOString(),
        });
      }

      throw error;
    }
  }

  /**
   * Mapea de forma canonica los codigos o cadenas de estado heterogeneos de transportistas
   * a los estados unificados del enum TrackingEventStatus del sistema.
   *
   * @param rawPayload Objeto payload original enviado por el transportista
   * @returns Estado normalizado (LABEL_CREATED, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, EXCEPTION, RETURNED)
   */
  public mapToCanonicalStatus(rawPayload: Record<string, unknown>): TrackingEventStatus {
    const rawStatus = String(rawPayload['status'] || rawPayload['event_type'] || '').toUpperCase();

    if (rawStatus.includes('DELIVERED') || rawStatus === 'DL') {
      return TrackingEventStatus.DELIVERED;
    }
    if (rawStatus.includes('OUT_FOR_DELIVERY') || rawStatus.includes('WITH_COURIER') || rawStatus === 'OF') {
      return TrackingEventStatus.OUT_FOR_DELIVERY;
    }
    if (rawStatus.includes('IN_TRANSIT') || rawStatus.includes('TRANSIT') || rawStatus.includes('DEPARTED') || rawStatus === 'IT') {
      return TrackingEventStatus.IN_TRANSIT;
    }
    if (rawStatus.includes('EXCEPTION') || rawStatus.includes('DELAY') || rawStatus.includes('FAILED_ATTEMPT') || rawStatus === 'EX') {
      return TrackingEventStatus.EXCEPTION;
    }
    if (rawStatus.includes('RETURN') || rawStatus.includes('UNDELIVERABLE') || rawStatus === 'RT') {
      return TrackingEventStatus.RETURNED;
    }

    return TrackingEventStatus.LABEL_CREATED;
  }

  /**
   * Extrae la descripcion legible del evento a partir de claves comunes del payload.
   *
   * @param rawPayload Objeto payload del transportista
   * @returns Cadena descriptiva del evento
   */
  public extractDescription(rawPayload: Record<string, unknown>): string {
    return (
      (rawPayload['description'] as string) ||
      (rawPayload['message'] as string) ||
      (rawPayload['status_details'] as string) ||
      'Tracking status updated'
    );
  }

  /**
   * Extrae la ubicacion geografica del evento si viene provista en el payload.
   *
   * @param rawPayload Objeto payload del transportista
   * @returns Ubicacion formateada o undefined
   */
  public extractLocation(rawPayload: Record<string, unknown>): string | undefined {
    if (typeof rawPayload['location'] === 'string') {
      return rawPayload['location'];
    }
    if (rawPayload['city'] && rawPayload['country']) {
      return `${rawPayload['city']}, ${rawPayload['country']}`;
    }
    return undefined;
  }

  /**
   * Extrae y normaliza la marca temporal del evento ocurrida en la red del transportista.
   *
   * @param rawPayload Objeto payload del transportista
   * @returns Cadena ISO de fecha o undefined
   */
  public extractTimestamp(rawPayload: Record<string, unknown>): string | undefined {
    return (
      (rawPayload['timestamp'] as string) ||
      (rawPayload['event_timestamp'] as string) ||
      (rawPayload['datetime'] as string) ||
      undefined
    );
  }
}
