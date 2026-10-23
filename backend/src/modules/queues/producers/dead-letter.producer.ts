/**
 * @fileoverview DeadLetterProducer
 * Productor responsable de enviar trabajos que han agotado todos sus intentos de reintento
 * a la cola de mensajes muertos (Dead Letter Queue - DLQ).
 * Permite registrar la traza del error, payload y numero de intentos para auditoria y reanudacion manual.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOB_NAMES } from '../../../common/constants/queues.constants';
import { DeadLetterJobPayload } from '../dto/dead-letter-job.payload';

/**
 * Servicio productor para la cola de cartas muertas (DLQ).
 */
@Injectable()
export class DeadLetterProducer {
  private readonly logger = new Logger(DeadLetterProducer.name);

  constructor(
    @InjectQueue(QUEUES.DEAD_LETTER)
    private readonly deadLetterQueue: Queue<DeadLetterJobPayload>,
  ) {}

  /**
   * Envia un trabajo fallido exhausto a la cola DLQ para que no se pierda informacion.
   *
   * @param payload Datos completos del trabajo fallido y el motivo del error
   */
  async sendToDeadLetterQueue(payload: DeadLetterJobPayload): Promise<void> {
    this.logger.warn(`Moving exhausted job from queue ${payload.originalQueue} (ID: ${payload.originalJobId}) to Dead Letter Queue.`);
    await this.deadLetterQueue.add(JOB_NAMES.HANDLE_FAILED_JOB, payload, {
      removeOnComplete: false,
      removeOnFail: false,
    });
  }
}
