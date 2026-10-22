import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { CarrierCode } from '@prisma/client';
import { TrackingQueueProducer } from './tracking-queue.producer';
import { QUEUES, JOB_NAMES, DEFAULT_JOB_OPTIONS } from '../../../common/constants/queues.constants';

describe('TrackingQueueProducer', () => {
  let producer: TrackingQueueProducer;
  let mockQueue: { add: jest.Mock };

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockImplementation((name, data, opts) => Promise.resolve({ id: opts.jobId })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingQueueProducer,
        {
          provide: getQueueToken(QUEUES.CARRIER_WEBHOOKS),
          useValue: mockQueue,
        },
      ],
    }).compile();

    producer = module.get<TrackingQueueProducer>(TrackingQueueProducer);
  });

  it('should be defined', () => {
    expect(producer).toBeDefined();
  });

  describe('generateDeterministicJobId', () => {
    it('should generate identical job ID for identical payload regardless of key insertion order', () => {
      const payloadA = { status: 'IN_TRANSIT', timestamp: '2026-10-22T10:00:00Z', note: 'test' };
      const payloadB = { note: 'test', status: 'IN_TRANSIT', timestamp: '2026-10-22T10:00:00Z' };

      const jobIdA = producer.generateDeterministicJobId('MOCK', 'TRK123456789', payloadA);
      const jobIdB = producer.generateDeterministicJobId('MOCK', 'TRK123456789', payloadB);

      expect(jobIdA).toBe(jobIdB);
      expect(jobIdA).toContain('mock-TRK123456789-');
    });

    it('should generate different job IDs for different payloads', () => {
      const payloadA = { status: 'IN_TRANSIT', timestamp: '2026-10-22T10:00:00Z' };
      const payloadB = { status: 'DELIVERED', timestamp: '2026-10-22T12:00:00Z' };

      const jobIdA = producer.generateDeterministicJobId('MOCK', 'TRK123456789', payloadA);
      const jobIdB = producer.generateDeterministicJobId('MOCK', 'TRK123456789', payloadB);

      expect(jobIdA).not.toBe(jobIdB);
    });
  });

  describe('enqueueWebhookEvent', () => {
    it('should add job to carrier-webhooks queue with exponential backoff options and deterministic jobId', async () => {
      const webhookPayload = {
        eventId: 'evt-1',
        carrierCode: CarrierCode.MOCK,
        trackingNumber: 'TRK998877',
        rawPayload: { status: 'IN_TRANSIT' },
        receivedAt: new Date().toISOString(),
      };

      const result = await producer.enqueueWebhookEvent(webhookPayload);

      expect(result.isEnqueued).toBe(true);
      expect(result.jobId).toContain('mock-TRK998877-');
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.PROCESS_CARRIER_WEBHOOK,
        webhookPayload,
        expect.objectContaining({
          jobId: result.jobId,
          attempts: DEFAULT_JOB_OPTIONS.attempts,
          backoff: DEFAULT_JOB_OPTIONS.backoff,
        }),
      );
    });
  });
});
