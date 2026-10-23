/**
 * @fileoverview label.processor.spec.ts
 * Pruebas unitarias para LabelProcessor.
 * Valida la generacion asincrona de etiquetas de envio, interaccion con el adaptador de carrier,
 * almacenamiento en Supabase Storage, actualizacion en PostgreSQL y escalamiento a DLQ en caso de fallo.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Job } from 'bullmq';
import { CarrierCode, ShipmentStatus } from '@prisma/client';
import { LabelProcessor } from './label.processor';
import { PrismaService } from '../../../database/prisma.service';
import { CarrierService } from '../../logistics/carrier/carrier.service';
import { SupabaseStorageService } from '../../storage/supabase-storage.service';
import { DeadLetterProducer } from '../producers/dead-letter.producer';
import { LabelGenerationJobPayload } from '../dto/label-generation-job.payload';

describe('LabelProcessor', () => {
  let processor: LabelProcessor;
  let mockPrisma: any;
  let mockCarrierService: any;
  let mockStorageService: any;
  let mockEventEmitter: any;
  let mockDeadLetterProducer: any;

  const sampleShipment = {
    id: 'shipment-uuid-1',
    tenantId: 'tenant-abc',
    trackingNumber: 'MCK123456789',
    carrierCode: CarrierCode.MOCK,
    serviceCode: 'MOCK_STANDARD',
    orderId: 'order-1',
    labelUrl: null,
    zplUrl: null,
    status: ShipmentStatus.DRAFT,
  };

  beforeEach(async () => {
    mockPrisma = {
      shipment: {
        findUnique: jest.fn().mockResolvedValue(sampleShipment),
        update: jest.fn().mockResolvedValue({
          ...sampleShipment,
          labelUrl: 'https://storage.supabase.co/shipping-labels/tenant-abc/labels/MCK123456789.pdf',
          status: ShipmentStatus.LABEL_CREATED,
        }),
      },
    };

    const mockAdapter = {
      carrierCode: CarrierCode.MOCK,
      generateLabelDocument: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-content', 'utf-8')),
    };

    mockCarrierService = {
      getAdapter: jest.fn().mockReturnValue(mockAdapter),
    };

    mockStorageService = {
      uploadShippingLabel: jest.fn().mockResolvedValue({
        bucket: 'shipping-labels',
        path: 'tenant-abc/labels/MCK123456789.pdf',
        publicUrl: 'https://storage.supabase.co/shipping-labels/tenant-abc/labels/MCK123456789.pdf',
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
        LabelProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CarrierService, useValue: mockCarrierService },
        { provide: SupabaseStorageService, useValue: mockStorageService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: DeadLetterProducer, useValue: mockDeadLetterProducer },
      ],
    }).compile();

    processor = module.get<LabelProcessor>(LabelProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should generate label, upload to Supabase Storage, update database and emit event', async () => {
      const mockJob = {
        id: 'job-lbl-1',
        name: 'generate-shipping-label',
        data: {
          shipmentId: 'shipment-uuid-1',
          tenantId: 'tenant-abc',
          carrierCode: CarrierCode.MOCK,
          serviceCode: 'MOCK_STANDARD',
          format: 'PDF',
          orderId: 'order-1',
          requestedAt: new Date().toISOString(),
        } as LabelGenerationJobPayload,
        attemptsMade: 0,
        opts: { attempts: 5 },
      } as unknown as Job<LabelGenerationJobPayload>;

      const result = await processor.process(mockJob);

      expect(mockPrisma.shipment.findUnique).toHaveBeenCalledWith({
        where: { id: 'shipment-uuid-1' },
      });
      expect(mockStorageService.uploadShippingLabel).toHaveBeenCalledWith(
        'tenant-abc',
        'MCK123456789.pdf',
        expect.any(Buffer),
        'PDF',
      );
      expect(mockPrisma.shipment.update).toHaveBeenCalledWith({
        where: { id: 'shipment-uuid-1' },
        data: expect.objectContaining({
          status: ShipmentStatus.LABEL_CREATED,
        }),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'shipment.label.generated',
        expect.objectContaining({
          shipmentId: 'shipment-uuid-1',
          trackingNumber: 'MCK123456789',
        }),
      );
      expect(result.trackingNumber).toBe('MCK123456789');
      expect(result.labelUrl).toContain('MCK123456789.pdf');
    });

    it('should throw error when shipment is not found', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue(null);

      const mockJob = {
        id: 'job-lbl-notfound',
        name: 'generate-shipping-label',
        data: {
          shipmentId: 'non-existent-id',
          tenantId: 'tenant-abc',
          carrierCode: CarrierCode.MOCK,
          serviceCode: 'MOCK_STANDARD',
          format: 'PDF',
          requestedAt: new Date().toISOString(),
        } as LabelGenerationJobPayload,
        attemptsMade: 0,
        opts: { attempts: 5 },
      } as unknown as Job<LabelGenerationJobPayload>;

      await expect(processor.process(mockJob)).rejects.toThrow('Shipment with ID non-existent-id was not found');
    });

    it('should escalate to dead letter queue when retries are exhausted', async () => {
      mockPrisma.shipment.findUnique.mockRejectedValue(new Error('Persistent storage error'));

      const mockJob = {
        id: 'job-lbl-fail',
        name: 'generate-shipping-label',
        data: {
          shipmentId: 'shipment-uuid-1',
          tenantId: 'tenant-abc',
          carrierCode: CarrierCode.MOCK,
          serviceCode: 'MOCK_STANDARD',
          format: 'PDF',
          requestedAt: new Date().toISOString(),
        } as LabelGenerationJobPayload,
        attemptsMade: 4, // 5th attempt
        opts: { attempts: 5 },
      } as unknown as Job<LabelGenerationJobPayload>;

      await expect(processor.process(mockJob)).rejects.toThrow('Persistent storage error');
      expect(mockDeadLetterProducer.sendToDeadLetterQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          originalQueue: 'label-generation',
          originalJobId: 'job-lbl-fail',
          failedReason: 'Persistent storage error',
          attemptsMade: 5,
        }),
      );
    });
  });
});
