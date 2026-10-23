/**
 * @fileoverview checkout.service.spec.ts
 * Pruebas unitarias para CheckoutService.
 * Valida la cotizacion de envios en tiempo real consumiendo RateService, la validacion
 * atomica de existencias, el descuento de stock, la creacion de la orden y la emision de eventos.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CarrierCode } from '@prisma/client';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../../../database/prisma.service';
import { RateService } from '../../logistics/rate/rate.service';
import { CheckoutDto, CalculateShippingRatesDto } from './dto/checkout.dto';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let mockPrisma: any;
  let mockRateService: any;
  let mockEventEmitter: any;

  const sampleVariant = {
    id: 'var-100',
    sku: 'RUN-40',
    title: 'Negro / 40',
    price: 90.0,
    inventoryQuantity: 10,
    weightGrams: 800,
    isActive: true,
    product: { title: 'Zapatilla Running' },
  };

  beforeEach(async () => {
    mockPrisma = {
      productVariant: {
        findMany: jest.fn().mockResolvedValue([sampleVariant]),
        update: jest.fn().mockResolvedValue(sampleVariant),
      },
      order: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'ord-uuid-1',
            orderNumber: data.orderNumber,
            totalAmount: data.totalAmount,
            currency: data.currency,
            status: data.status,
            paymentStatus: data.paymentStatus,
          }),
        ),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockRateService = {
      calculateRates: jest.fn().mockResolvedValue([
        {
          carrierCode: CarrierCode.MOCK,
          serviceCode: 'MOCK_STANDARD',
          serviceName: 'Mock Standard',
          rateAmount: 15.0,
          currency: 'USD',
        },
      ]),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RateService, useValue: mockRateService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<CheckoutService>(CheckoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateCartShippingRates', () => {
    it('should aggregate weights and query shipping rates from RateService', async () => {
      const dto: CalculateShippingRatesDto = {
        tenantId: 'tenant-1',
        destinationPostalCode: '06600',
        destinationCountry: 'MX',
        items: [{ variantId: 'var-100', quantity: 2 }],
      };

      const result = await service.calculateCartShippingRates(dto);

      expect(result.totalWeightKg).toBe(1.6); // 800g * 2 = 1.6kg
      expect(result.rates.length).toBe(1);
      expect(mockRateService.calculateRates).toHaveBeenCalledWith(
        expect.objectContaining({
          weightKg: 1.6,
          destinationPostalCode: '06600',
        }),
      );
    });

    it('should throw BadRequestException for empty cart items', async () => {
      await expect(
        service.calculateCartShippingRates({
          tenantId: 'tenant-1',
          destinationPostalCode: '06600',
          destinationCountry: 'MX',
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('processCheckout', () => {
    const validCheckoutDto: CheckoutDto = {
      tenantId: 'tenant-1',
      customerEmail: 'customer@example.com',
      shippingAddress: {
        name: 'Cliente Demo',
        street1: 'Av. Siempre Viva 123',
        city: 'CDMX',
        state: 'CDMX',
        postalCode: '06600',
        country: 'MX',
      },
      selectedShippingRate: {
        carrierCode: CarrierCode.MOCK,
        serviceCode: 'MOCK_STANDARD',
        rateAmount: 15.0,
        currency: 'USD',
      },
      items: [{ variantId: 'var-100', quantity: 2 }],
    };

    it('should deduct inventory, create order, and emit order.created', async () => {
      const result = await service.processCheckout(validCheckoutDto);

      expect(result.orderId).toBe('ord-uuid-1');
      expect(result.totalAmount).toBe(195.0); // (90 * 2) + 15 shipping = 195
      expect(mockPrisma.productVariant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'var-100' },
          data: { inventoryQuantity: { decrement: 2 } },
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('order.created', expect.any(Object));
    });

    it('should throw BadRequestException when requested stock exceeds availability', async () => {
      const excessiveCheckoutDto: CheckoutDto = {
        ...validCheckoutDto,
        items: [{ variantId: 'var-100', quantity: 999 }], // stock is 10
      };

      await expect(service.processCheckout(excessiveCheckoutDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
