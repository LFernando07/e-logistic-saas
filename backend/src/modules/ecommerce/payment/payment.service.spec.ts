/**
 * @fileoverview payment.service.spec.ts
 * Pruebas unitarias para PaymentService.
 * Valida la confirmacion atomica de pagos, transicion de estados de la orden,
 * prevencion de pagos duplicados y disparo del evento 'order.paid' para activacion logistica.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PaymentProvider, PaymentStatus, OrderStatus } from '@prisma/client';
import { PaymentService } from './payment.service';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../notifications/email.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockPrisma: any;
  let mockEventEmitter: any;

  const mockOrder = {
    id: 'ord-123',
    tenantId: 'tenant-1',
    orderNumber: 'ORD-998877',
    totalAmount: 195.0,
    currency: 'USD',
    paymentStatus: PaymentStatus.PENDING,
    status: OrderStatus.PENDING,
    items: [],
  };

  beforeEach(async () => {
    mockPrisma = {
      order: {
        findUnique: jest.fn().mockResolvedValue(mockOrder),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            ...mockOrder,
            paymentStatus: data.paymentStatus,
            status: data.status,
          }),
        ),
      },
      payment: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'pay-uuid-1',
            ...data,
          }),
        ),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockPrisma);
      }),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:3001';
        return undefined;
      }),
    };

    const mockEmailService = {
      sendOrderReceiptEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('confirmPayment', () => {
    it('should create payment, update order to PAID and emit order.paid event', async () => {
      const result = await service.confirmPayment({
        orderId: 'ord-123',
        provider: PaymentProvider.SIMULATED,
        transactionId: 'tx_demo_100',
      });

      expect(result.success).toBe(true);
      expect(result.orderId).toBe('ord-123');
      expect(result.status).toBe(PaymentStatus.PAID);
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'ord-123',
            status: PaymentStatus.PAID,
          }),
        }),
      );
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord-123' },
          data: expect.objectContaining({
            paymentStatus: PaymentStatus.PAID,
            status: OrderStatus.PROCESSING,
          }),
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('order.paid', expect.any(Object));
    });

    it('should throw BadRequestException if order is already paid', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        paymentStatus: PaymentStatus.PAID,
      });

      await expect(
        service.confirmPayment({
          orderId: 'ord-123',
          provider: PaymentProvider.SIMULATED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if order does not exist', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.confirmPayment({
          orderId: 'non-existent',
          provider: PaymentProvider.SIMULATED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
