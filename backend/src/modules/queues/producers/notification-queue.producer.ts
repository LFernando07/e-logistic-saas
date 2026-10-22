import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES, JOB_NAMES, DEFAULT_JOB_OPTIONS } from '../../../common/constants/queues.constants';
import { NotificationJobPayload } from '../dto/notification-job.payload';

@Injectable()
export class NotificationQueueProducer {
  private readonly logger = new Logger(NotificationQueueProducer.name);

  constructor(
    @InjectQueue(QUEUES.NOTIFICATIONS)
    private readonly notificationQueue: Queue<NotificationJobPayload>,
  ) {}

  async enqueueNotification(payload: NotificationJobPayload): Promise<string> {
    const jobId = `notif-${payload.notificationId}-${Date.now()}`;
    this.logger.log(`Enqueueing notification for recipient ${payload.recipient} (Type: ${payload.eventType}) with Job ID ${jobId}`);

    const job = await this.notificationQueue.add(JOB_NAMES.DISPATCH_NOTIFICATION, payload, {
      ...DEFAULT_JOB_OPTIONS,
      jobId,
    });

    return job.id ?? jobId;
  }
}
