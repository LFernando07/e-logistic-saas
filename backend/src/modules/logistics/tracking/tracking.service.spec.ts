/**
 * @fileoverview tracking.service.spec.ts
 * Pruebas unitarias para TrackingService.
 * Verifica la consulta enriquecida de envios, calculo de hitos de progreso,
 * determinacion de porcentajes de avance y extraccion de branding del comercio.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ShipmentStatus, TrackingEventStatus, CarrierCode } from '@prisma/client';
import { TrackingService } from './tracking.service';
import { PrismaService } from '../../../database/prisma.service';

describe('TrackingService', () => {
  let service: TrackingService;
  let mockPrisma: any;

  const mockShipmentData = {
    id: 'ship-123',
    trackingNumber: 'MCK778899',
    carrierCode: CarrierCode.MOCK,
    serviceCode: 'MOCK_STANDARD',
    status: ShipmentStatus.IN_TRANSIT,
    originAddress: { city: 'Monterrey', state: 'NL', country: 'MX' },
    destinationAddress: { name: 'Luis Fernando', city: 'Guadalajara', state: 'JAL', postalCode: '44100', country: 'MX' },
    labelUrl: 'https://storage.supabase.co/shipping-labels/t-1/labels/MCK778899.pdf',
    packages: [
      { id: 'pkg-1', weightKg: 2.5 },
      { id: 'pkg-2', weightKg: 1.5 },
    ],
    tenant: {
      id: 'tenant-1',
      name: 'Tienda Deportiva Elite',
      slug: 'deportiva-elite',
      domain: 'deportiva.com',
      brandingSettings: {
        logoUrl: 'https://deportiva.com/logo.png',
        primaryColor: '#1e40af',
        accentColor: '#3b82f6',
      },
    },
    trackingEvents: [
      {
        id: 'evt-2',
        status: TrackingEventStatus.IN_TRANSIT,
        rawStatus: 'IN_TRANSIT',
        description: 'Paquete en transito a destino',
        location: 'Centro Operativo Guadalajara',
        eventTimestamp: new Date('2026-10-23T08:00:00Z'),
        carrierCode: CarrierCode.MOCK,
      },
      {
        id: 'evt-1',
        status: TrackingEventStatus.LABEL_CREATED,
        rawStatus: 'CREATED',
        description: 'Guia generada',
        location: 'Monterrey',
        eventTimestamp: new Date('2026-10-22T10:00:00Z'),
        carrierCode: CarrierCode.MOCK,
      },
    ],
  };

  beforeEach(async () => {
    mockPrisma = {
      shipment: {
        findUnique: jest.fn().mockResolvedValue(mockShipmentData),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrackingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TrackingService>(TrackingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTrackingByNumber', () => {
    it('should return enriched tracking data with milestones, progress, and merchant branding', async () => {
      const response = await service.getTrackingByNumber('MCK778899');

      expect(response.trackingNumber).toBe('MCK778899');
      expect(response.currentStatus).toBe(ShipmentStatus.IN_TRANSIT);
      expect(response.totalWeightKg).toBe(4.0);
      expect(response.packagesCount).toBe(2);
      expect(response.progressPercentage).toBe(65);
      expect(response.isDelivered).toBe(false);

      // Verificacion de hitos (milestones)
      expect(response.milestones.length).toBe(4);
      expect(response.milestones[0].key).toBe(TrackingEventStatus.LABEL_CREATED);
      expect(response.milestones[0].isCompleted).toBe(true);
      expect(response.milestones[1].key).toBe(TrackingEventStatus.IN_TRANSIT);
      expect(response.milestones[1].isCurrent).toBe(true);
      expect(response.milestones[2].key).toBe(TrackingEventStatus.OUT_FOR_DELIVERY);
      expect(response.milestones[2].isCompleted).toBe(false);

      // Verificacion de branding del comercio
      expect(response.merchant.name).toBe('Tienda Deportiva Elite');
      expect(response.merchant.primaryColor).toBe('#1e40af');
      expect(response.merchant.logoUrl).toBe('https://deportiva.com/logo.png');
    });

    it('should throw NotFoundException when shipment does not exist', async () => {
      mockPrisma.shipment.findUnique.mockResolvedValue(null);

      await expect(service.getTrackingByNumber('NON_EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('calculateProgressPercentage', () => {
    it('should return 25 for LABEL_CREATED', () => {
      expect(service.calculateProgressPercentage(ShipmentStatus.LABEL_CREATED)).toBe(25);
    });

    it('should return 65 for IN_TRANSIT', () => {
      expect(service.calculateProgressPercentage(ShipmentStatus.IN_TRANSIT)).toBe(65);
    });

    it('should return 85 for OUT_FOR_DELIVERY', () => {
      expect(service.calculateProgressPercentage(ShipmentStatus.OUT_FOR_DELIVERY)).toBe(85);
    });

    it('should return 100 for DELIVERED', () => {
      expect(service.calculateProgressPercentage(ShipmentStatus.DELIVERED)).toBe(100);
    });
  });
});
