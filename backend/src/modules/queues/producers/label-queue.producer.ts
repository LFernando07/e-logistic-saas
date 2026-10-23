/**
 * @fileoverview LabelQueueProducer
 * Productor responsable de encolar solicitudes de generacion y almacenamiento asincrono de etiquetas
 * de envio en la cola BullMQ 'label-generation'.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOB_NAMES, DEFAULT_JOB_OPTIONS } from '../../../common/constants/queues.constants';
import { LabelGenerationJobPayload } from '../dto/label-generation-job.payload';

/**
 * Servicio productor para la generacion asincrona de guias de paqueteria.
 */
@Injectable()
export class LabelQueueProducer {
  private readonly logger = new Logger(LabelQueueProducer.name);

  constructor(
    @InjectQueue(QUEUES.LABEL_GENERATION)
    private readonly labelQueue: Queue<LabelGenerationJobPayload>,
  ) {}

  /**
   * Encola una tarea de generacion de guia para un envio determinado.
   *
   * @param payload Informacion del envio, carrier, tenant y formato deseado (PDF/ZPL)
   * @returns Identificador del trabajo encolado en BullMQ
   */
  async enqueueLabelGeneration(payload: LabelGenerationJobPayload): Promise<string> {
    const jobId = `label-${payload.shipmentId}-${Date.now()}`;
    this.logger.log(`Enqueueing label generation for shipment ${payload.shipmentId} with Job ID ${jobId}`);

    const job = await this.labelQueue.add(JOB_NAMES.GENERATE_SHIPPING_LABEL, payload, {
      ...DEFAULT_JOB_OPTIONS,
      jobId,
    });

    return job.id ?? jobId;
  }
}
