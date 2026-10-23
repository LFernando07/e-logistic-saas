/**
 * @fileoverview label.processor.ts
 * Procesador y consumidor de trabajos de la cola BullMQ 'label-generation'.
 * Orquesta la creacion asincrona de documentos de guias (PDF/ZPL), su almacenamiento
 * en Supabase Storage (bucket 'shipping-labels') y la actualizacion persistente
 * de la URL de descarga en la entidad Shipment de PostgreSQL.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ShipmentStatus } from '@prisma/client';
import { QUEUES } from '../../../common/constants/queues.constants';
import { LabelGenerationJobPayload } from '../dto/label-generation-job.payload';
import { PrismaService } from '../../../database/prisma.service';
import { CarrierService } from '../../logistics/carrier/carrier.service';
import { SupabaseStorageService } from '../../storage/supabase-storage.service';
import { DeadLetterProducer } from '../producers/dead-letter.producer';

/**
 * Estructura del resultado emitido tras generar y subir la guia.
 */
export interface GeneratedLabelResult {
  shipmentId: string;
  trackingNumber: string;
  labelUrl: string;
  zplUrl?: string;
  format: 'PDF' | 'ZPL';
  tenantId: string;
  orderId?: string;
  generatedAt: string;
}

/**
 * Consumidor de trabajos en segundo plano para generacion de guias de envio.
 */
@Processor(QUEUES.LABEL_GENERATION)
export class LabelProcessor extends WorkerHost {
  private readonly logger = new Logger(LabelProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly carrierService: CarrierService,
    private readonly storageService: SupabaseStorageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly deadLetterProducer: DeadLetterProducer,
  ) {
    super();
  }

  /**
   * Procesa la generacion asincrona de etiquetas de envio para un shipment.
   * Invoca al transportista, sube el archivo a Supabase Storage y actualiza la base de datos.
   *
   * @param job Trabajo BullMQ con los datos de LabelGenerationJobPayload
   * @returns Resultado estructurado con la URL accesible de la guia
   */
  async process(job: Job<LabelGenerationJobPayload>): Promise<GeneratedLabelResult> {
    const { data, id, attemptsMade } = job;
    this.logger.log(`Processing label generation job ${id} (Attempt ${attemptsMade + 1}) for shipment ${data.shipmentId}`);

    try {
      const shipment = await this.prisma.shipment.findUnique({
        where: { id: data.shipmentId },
      });

      if (!shipment) {
        throw new Error(`Shipment with ID ${data.shipmentId} was not found in database.`);
      }

      const adapter = this.carrierService.getAdapter(data.carrierCode);
      const format = data.format || 'PDF';
      const extension = format === 'PDF' ? 'pdf' : 'zpl';
      const fileName = `${shipment.trackingNumber}.${extension}`;

      // 1. Obtener buffer del documento a traves del adaptador del carrier
      let fileBuffer: Buffer;
      if (adapter.generateLabelDocument) {
        fileBuffer = await adapter.generateLabelDocument(shipment.trackingNumber, format);
      } else {
        // Fallback generico
        fileBuffer = Buffer.from(`%PDF-1.4\n% Shipping Label for ${shipment.trackingNumber}\n%%EOF`, 'utf-8');
      }

      // 2. Subir archivo a Supabase Storage en el bucket 'shipping-labels'
      const uploadResult = await this.storageService.uploadShippingLabel(
        shipment.tenantId,
        fileName,
        fileBuffer,
        format,
      );

      const labelUrl = uploadResult.publicUrl || uploadResult.signedUrl || `https://storage.local/labels/${fileName}`;

      // 3. Actualizar registro del envio en PostgreSQL
      await this.prisma.shipment.update({
        where: { id: shipment.id },
        data: {
          labelUrl,
          zplUrl: format === 'ZPL' ? labelUrl : shipment.zplUrl,
          status: ShipmentStatus.LABEL_CREATED,
        },
      });

      const result: GeneratedLabelResult = {
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        labelUrl,
        zplUrl: format === 'ZPL' ? labelUrl : undefined,
        format,
        tenantId: shipment.tenantId,
        orderId: shipment.orderId || undefined,
        generatedAt: new Date().toISOString(),
      };

      this.logger.log(`Label successfully generated and stored for shipment ${shipment.trackingNumber}: ${labelUrl}`);

      // 4. Emitir evento interno para notificaciones downstream
      this.eventEmitter.emit('shipment.label.generated', result);

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to process label generation job ${id} for shipment ${data.shipmentId}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Si se agotaron los intentos, transferir a DLQ
      if (job.opts.attempts && attemptsMade + 1 >= job.opts.attempts) {
        await this.deadLetterProducer.sendToDeadLetterQueue({
          originalQueue: QUEUES.LABEL_GENERATION,
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
}
