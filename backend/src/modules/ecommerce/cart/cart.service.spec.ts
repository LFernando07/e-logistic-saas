import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CartService } from './cart.service';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../notifications/email.service';

describe('CartService', () => {
  let service: CartService;
  let mockPrisma: any;
  let mockEmailService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockPrisma = {
      abandonedCart: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    mockEmailService = {
      sendAbandonedCartEmail: jest.fn().mockResolvedValue({ success: true }),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3001'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordAbandonedCart', () => {
    it('should save abandoned cart and send recovery email', async () => {
      mockPrisma.abandonedCart.create.mockResolvedValue({
        id: 'cart-uuid-1',
        email: 'test@ejemplo.com',
        customerName: 'Carlos',
        totalAmount: 1500,
        recoveryToken: 'tok123',
      });

      const result = await service.recordAbandonedCart({
        tenantId: 'tenant-1',
        email: 'test@ejemplo.com',
        customerName: 'Carlos',
        items: [{ name: 'Teclado Mecanico', quantity: 1, unitPrice: 1500 }],
        totalAmount: 1500,
      });

      expect(result.success).toBe(true);
      expect(result.recoveryToken).toBeDefined();
      expect(mockEmailService.sendAbandonedCartEmail).toHaveBeenCalled();
    });
  });

  describe('recoverCart', () => {
    it('should recover cart by token and mark isRecovered', async () => {
      mockPrisma.abandonedCart.findUnique.mockResolvedValue({
        id: 'cart-uuid-1',
        recoveryToken: 'tok123',
        email: 'test@ejemplo.com',
        customerName: 'Carlos',
        items: [{ name: 'Teclado Mecanico', quantity: 1, unitPrice: 1500 }],
        totalAmount: 1500,
        isRecovered: false,
      });

      mockPrisma.abandonedCart.update.mockResolvedValue({
        id: 'cart-uuid-1',
        isRecovered: true,
      });

      const result = await service.recoverCart('tok123');
      expect(result.success).toBe(true);
      expect(result.email).toBe('test@ejemplo.com');
      expect(mockPrisma.abandonedCart.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException if token does not exist', async () => {
      mockPrisma.abandonedCart.findUnique.mockResolvedValue(null);

      await expect(service.recoverCart('invalid-tok')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
