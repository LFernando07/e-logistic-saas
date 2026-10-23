/**
 * @fileoverview tracking.controller.spec.ts
 * Pruebas unitarias para TrackingController.
 * Valida la ingesta de webhooks, verificacion de firmas, validacion de esquemas de entrada,
 * codigos de estado HTTP 202, 400, 401 y endpoint de consulta publica de rastreo.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CarrierCode } from '@prisma/client';
import { TrackingController } from './tracking.controller';
import { TrackingService } from './tracking.service';
import { TrackingQueueProducer } from '../../queues/producers/tracking-queue.producer';
import { WebhookVerifierService } from './services/webhook-verifier.service';

describe('TrackingController', () => {
  let controller: TrackingController;
  let mockQueueProducer: any;
  let mockTrackingService: any;
  let mockWebhookVerifier: any;

  beforeEach(async () => {
    mockQueueProducer = {
      enqueueWebhookEvent: jest.fn().mockResolvedValue({
        jobId: 'mock-TRK123-abc',
        isEnqueued: true,
      }),
    };

    mockTrackingService = {
      getTrackingByNumber: jest.fn().mockResolvedValue({
        trackingNumber: 'TRK123',
        currentStatus: 'IN_TRANSIT',
        milestones: [],
      }),
    };

    mockWebhookVerifier = {
      getExpectedSignatureHeader: jest.fn().mockReturnValue('x-carrier-signature'),
      verifySignature: jest.fn().mockReturnValue(true),
      generateTestSignature: jest.fn().mockReturnValue('valid_test_signature'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrackingController],
      providers: [
        { provide: TrackingQueueProducer, useValue: mockQueueProducer },
        { provide: TrackingService, useValue: mockTrackingService },
        { provide: WebhookVerifierService, useValue: mockWebhookVerifier },
      ],
    }).compile();

    controller = module.get<TrackingController>(TrackingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleCarrierWebhook', () => {
    it('should accept webhook and return 202 with jobId', async () => {
      const payload = {
        tracking_number: 'TRK123',
        status: 'IN_TRANSIT',
        description: 'Package in transit',
      };

      const result = await controller.handleCarrierWebhook(
        'mock',
        payload,
        { 'x-carrier-signature': 'valid_sig' },
      );

      expect(result.accepted).toBe(true);
      expect(result.jobId).toBe('mock-TRK123-abc');
      expect(result.trackingNumber).toBe('TRK123');
      expect(mockQueueProducer.enqueueWebhookEvent).toHaveBeenCalled();
    });

    it('should throw BadRequestException for unsupported carrier code', async () => {
      await expect(
        controller.handleCarrierWebhook('UNKNOWN_CARRIER', { tracking_number: 'TRK123' }, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when tracking number is missing', async () => {
      await expect(
        controller.handleCarrierWebhook('mock', { status: 'DELIVERED' }, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when HMAC signature is invalid', async () => {
      mockWebhookVerifier.verifySignature.mockReturnValue(false);

      const payload = { tracking_number: 'TRK123', status: 'IN_TRANSIT' };

      await expect(
        controller.handleCarrierWebhook(
          'skydropx',
          payload,
          { 'x-carrier-signature': 'invalid_sig' },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getTracking', () => {
    it('should delegate tracking query to TrackingService', async () => {
      const result = await controller.getTracking('TRK123');
      expect(mockTrackingService.getTrackingByNumber).toHaveBeenCalledWith('TRK123');
      expect(result.trackingNumber).toBe('TRK123');
    });
  });

  describe('simulateWebhookEvent', () => {
    it('should generate test signature and enqueue simulated event', async () => {
      const result = await controller.simulateWebhookEvent({
        trackingNumber: 'SIM123',
        status: 'OUT_FOR_DELIVERY',
        carrierCode: CarrierCode.MOCK,
      });

      expect(result.accepted).toBe(true);
      expect(mockWebhookVerifier.generateTestSignature).toHaveBeenCalled();
      expect(mockQueueProducer.enqueueWebhookEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          trackingNumber: 'SIM123',
        }),
      );
    });
  });
});
