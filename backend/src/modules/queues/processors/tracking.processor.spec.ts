import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { CarrierCode, TrackingEventStatus } from '@prisma/client';
import { TrackingProcessor } from './tracking.processor';
import { DeadLetterProducer } from '../producers/dead-letter.producer';
import { PrismaService } from '../../../database/prisma.service';
import { CarrierWebhookJobPayload } from '../dto/carrier-webhook-job.payload';

describe('TrackingProcessor', () => {
  let processor: TrackingProcessor;
  let mockPrisma: any;
  let mockEventEmitter: any;
  let mockDeadLetterProducer: any;

  beforeEach(async () => {
    mockPrisma = {
      shipment: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      trackingEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    mockDeadLetterProducer = {
      sendToDeadLetterQueue: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: DeadLetterProducer, useValue: mockDeadLetterProducer },
      ],
    }).compile();

    processor = module.get<TrackingProcessor>(TrackingProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('mapToCanonicalStatus', () => {
    it('should map DELIVERED variants correctly', () => {
      expect(processor.mapToCanonicalStatus({ status: 'DELIVERED' })).toBe(TrackingEventStatus.DELIVERED);
      expect(processor.mapToCanonicalStatus({ status: 'DL' })).toBe(TrackingEventStatus.DELIVERED);
    });

    it('should map OUT_FOR_DELIVERY variants correctly', () => {
      expect(processor.mapToCanonicalStatus({ status: 'OUT_FOR_DELIVERY' })).toBe(TrackingEventStatus.OUT_FOR_DELIVERY);
      expect(processor.mapToCanonicalStatus({ status: 'with_courier' })).toBe(TrackingEventStatus.OUT_FOR_DELIVERY);
    });

    it('should map IN_TRANSIT variants correctly', () => {
      expect(processor.mapToCanonicalStatus({ status: 'IN_TRANSIT' })).toBe(TrackingEventStatus.IN_TRANSIT);
      expect(processor.mapToCanonicalStatus({ status: 'DEPARTED_FACILITY' })).toBe(TrackingEventStatus.IN_TRANSIT);
    });

    it('should map EXCEPTION variants correctly', () => {
      expect(processor.mapToCanonicalStatus({ status: 'EXCEPTION' })).toBe(TrackingEventStatus.EXCEPTION);
      expect(processor.mapToCanonicalStatus({ status: 'weather_delay' })).toBe(TrackingEventStatus.EXCEPTION);
    });

    it('should map RETURNED variants correctly', () => {
      expect(processor.mapToCanonicalStatus({ status: 'RETURN_TO_SENDER' })).toBe(TrackingEventStatus.RETURNED);
    });

    it('should default to LABEL_CREATED for unknown or initial statuses', () => {
      expect(processor.mapToCanonicalStatus({ status: 'manifest_received' })).toBe(TrackingEventStatus.LABEL_CREATED);
    });
  });

  describe('process', () => {
    it('should normalize event, emit internal event, and return processed result', async () => {
      const mockJob = {
        id: 'job-123',
        name: 'process-carrier-webhook',
        data: {
          eventId: 'evt-100',
          carrierCode: CarrierCode.MOCK,
          trackingNumber: 'TRK-ABC-123',
          rawPayload: {
            status: 'OUT_FOR_DELIVERY',
            description: 'Driver is approaching destination',
            location: 'Monterrey, MX',
            timestamp: '2026-10-22T14:30:00Z',
          },
          receivedAt: '2026-10-22T14:31:00Z',
        } as CarrierWebhookJobPayload,
        attemptsMade: 0,
        opts: { attempts: 5 },
      } as unknown as Job<CarrierWebhookJobPayload>;

      const result = await processor.process(mockJob);

      expect(result.trackingNumber).toBe('TRK-ABC-123');
      expect(result.normalizedStatus).toBe(TrackingEventStatus.OUT_FOR_DELIVERY);
      expect(result.location).toBe('Monterrey, MX');
      expect(result.isDelivered).toBe(false);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('tracking.event.processed', result);
    });

    it('should dispatch to dead letter queue if job fails on its final retry attempt', async () => {
      mockPrisma.shipment.findUnique.mockRejectedValue(new Error('Database connectivity failure'));

      const mockJob = {
        id: 'job-err-1',
        name: 'process-carrier-webhook',
        data: {
          eventId: 'evt-err',
          carrierCode: CarrierCode.MOCK,
          trackingNumber: 'TRK-FAIL-1',
          rawPayload: { status: 'IN_TRANSIT' },
          receivedAt: new Date().toISOString(),
        } as CarrierWebhookJobPayload,
        attemptsMade: 4, // 5th attempt
        opts: { attempts: 5 },
      } as unknown as Job<CarrierWebhookJobPayload>;

      await expect(processor.process(mockJob)).rejects.toThrow('Database connectivity failure');
      expect(mockDeadLetterProducer.sendToDeadLetterQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          originalQueue: 'carrier-webhooks',
          originalJobId: 'job-err-1',
          failedReason: 'Database connectivity failure',
          attemptsMade: 5,
        }),
      );
    });
  });
});
