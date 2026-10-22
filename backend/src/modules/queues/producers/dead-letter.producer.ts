import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOB_NAMES } from '../../../common/constants/queues.constants';
import { DeadLetterJobPayload } from '../dto/dead-letter-job.payload';

@Injectable()
export class DeadLetterProducer {
  private readonly logger = new Logger(DeadLetterProducer.name);

  constructor(
    @InjectQueue(QUEUES.DEAD_LETTER)
    private readonly deadLetterQueue: Queue<DeadLetterJobPayload>,
  ) {}

  async sendToDeadLetterQueue(payload: DeadLetterJobPayload): Promise<void> {
    this.logger.warn(`Moving exhausted job from queue ${payload.originalQueue} (ID: ${payload.originalJobId}) to Dead Letter Queue.`);
    await this.deadLetterQueue.add(JOB_NAMES.HANDLE_FAILED_JOB, payload, {
      removeOnComplete: false,
      removeOnFail: false,
    });
  }
}
