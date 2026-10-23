import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CarrierCode, TrackingEventStatus } from '@prisma/client';
import { CarrierService } from './carrier.service';
import { MockCarrierAdapter } from './adapters/mock-carrier.adapter';
import { SkydropxAdapter } from './adapters/skydropx.adapter';

describe('CarrierService & Carrier Adapters', () => {
  let carrierService: CarrierService;
  let mockAdapter: MockCarrierAdapter;
  let skydropxAdapter: SkydropxAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CarrierService, MockCarrierAdapter, SkydropxAdapter],
    }).compile();

    carrierService = module.get<CarrierService>(CarrierService);
    mockAdapter = module.get<MockCarrierAdapter>(MockCarrierAdapter);
    skydropxAdapter = module.get<SkydropxAdapter>(SkydropxAdapter);
  });

  it('should be defined', () => {
    expect(carrierService).toBeDefined();
    expect(mockAdapter).toBeDefined();
    expect(skydropxAdapter).toBeDefined();
  });

  it('should resolve registered carrier adapter for MOCK', () => {
    const adapter = carrierService.getAdapter(CarrierCode.MOCK);
    expect(adapter).toBe(mockAdapter);
    expect(adapter.carrierCode).toBe(CarrierCode.MOCK);
  });

  it('should resolve registered carrier adapter for SKYDROPX', () => {
    const adapter = carrierService.getAdapter(CarrierCode.SKYDROPX);
    expect(adapter).toBe(skydropxAdapter);
    expect(adapter.carrierCode).toBe(CarrierCode.SKYDROPX);
  });

  it('should throw NotFoundException when adapter is not registered', () => {
    expect(() => carrierService.getAdapter(CarrierCode.DHL)).toThrow(NotFoundException);
  });

  describe('MockCarrierAdapter operations', () => {
    it('should quote rates according to package weight', async () => {
      const rates = await mockAdapter.getRates({
        originPostalCode: '64000',
        originCountry: 'MX',
        destinationPostalCode: '06600',
        destinationCountry: 'MX',
        weightKg: 2.5,
      });

      expect(rates.length).toBe(2);
      expect(rates[0].carrierCode).toBe(CarrierCode.MOCK);
      expect(rates[0].serviceCode).toBe('MOCK_STANDARD');
      expect(rates[0].rateAmount).toBeGreaterThan(0);
      expect(rates[1].serviceCode).toBe('MOCK_EXPRESS');
    });

    it('should create mock shipment with tracking number and labels', async () => {
      const shipment = await mockAdapter.createShipment({
        tenantId: 'tenant-1',
        carrierCode: CarrierCode.MOCK,
        serviceCode: 'MOCK_STANDARD',
        originAddress: {
          name: 'Origin Test',
          street1: '123 Main St',
          city: 'Monterrey',
          state: 'NL',
          postalCode: '64000',
          country: 'MX',
        },
        destinationAddress: {
          name: 'Dest Test',
          street1: '456 Second St',
          city: 'CDMX',
          state: 'CDMX',
          postalCode: '06600',
          country: 'MX',
        },
        packages: [{ weightKg: 1.5, lengthCm: 20, widthCm: 15, heightCm: 10 }],
      });

      expect(shipment.trackingNumber).toMatch(/^MCK\d+$/);
      expect(shipment.labelUrl).toContain(shipment.trackingNumber);
      expect(shipment.rateAmount).toBeGreaterThan(0);
    });

    it('should return tracking timeline with current status', async () => {
      const tracking = await mockAdapter.track('MCK123456789');
      expect(tracking.trackingNumber).toBe('MCK123456789');
      expect(tracking.carrierCode).toBe(CarrierCode.MOCK);
      expect(tracking.events.length).toBeGreaterThan(0);
      expect(tracking.currentStatus).toBe(TrackingEventStatus.IN_TRANSIT);
    });
  });
});
