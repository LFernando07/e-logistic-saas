import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { QUEUES, JOB_NAMES, DEFAULT_JOB_OPTIONS } from '../../../common/constants/queues.constants';
import { CarrierWebhookJobPayload } from '../dto/carrier-webhook-job.payload';

@Injectable()
export class TrackingQueueProducer {
  private readonly logger = new Logger(TrackingQueueProducer.name);

  constructor(
    @InjectQueue(QUEUES.CARRIER_WEBHOOKS)
    private readonly carrierWebhooksQueue: Queue<CarrierWebhookJobPayload>,
  ) {}

  /**
   * Generates a deterministic Job ID based on carrier code, tracking number, and payload hash.
   * Prevents duplicate execution from carrier network retransmissions.
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
   * Enqueues an incoming webhook payload into BullMQ with deterministic job ID.
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
