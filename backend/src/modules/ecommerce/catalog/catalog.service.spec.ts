/**
 * @fileoverview catalog.service.spec.ts
 * Pruebas unitarias para CatalogService.
 * Valida la consulta de productos con filtros de categoria y busqueda, recuperacion por slug
 * amigable de comercio, y verificacion de existencias de variantes.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../../../database/prisma.service';

describe('CatalogService', () => {
  let service: CatalogService;
  let mockPrisma: any;

  const mockProduct = {
    id: 'prod-100',
    tenantId: 'tenant-1',
    title: 'Tenis Running Pro',
    slug: 'tenis-running-pro',
    description: 'Calzado deportivo',
    category: 'Calzado',
    isActive: true,
    variants: [
      { id: 'var-1', sku: 'RUN-40', inventoryQuantity: 10, isActive: true },
      { id: 'var-2', sku: 'RUN-42', inventoryQuantity: 0, isActive: true },
    ],
    tenant: { id: 'tenant-1', name: 'Nova Store', slug: 'nova-store' },
  };

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findMany: jest.fn().mockResolvedValue([mockProduct]),
        findUnique: jest.fn().mockResolvedValue(mockProduct),
      },
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1', slug: 'nova-store' }),
      },
      productVariant: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'var-1') {
            return Promise.resolve({ id: 'var-1', inventoryQuantity: 10, isActive: true });
          }
          if (where.id === 'var-2') {
            return Promise.resolve({ id: 'var-2', inventoryQuantity: 0, isActive: true });
          }
          return Promise.resolve(null);
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CatalogService>(CatalogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listProducts', () => {
    it('should query products filtered by tenant, category, and search term', async () => {
      const products = await service.listProducts('tenant-1', 'Calzado', 'Running');
      expect(products.length).toBe(1);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            category: 'Calzado',
          }),
        }),
      );
    });
  });

  describe('getProductById', () => {
    it('should return product when found', async () => {
      const product = await service.getProductById('prod-100');
      expect(product.id).toBe('prod-100');
    });

    it('should throw NotFoundException when product is not found', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.getProductById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getProductBySlug', () => {
    it('should find product using tenant slug and product slug', async () => {
      const product = await service.getProductBySlug('nova-store', 'tenis-running-pro');
      expect(product.slug).toBe('tenis-running-pro');
      expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: 'nova-store' },
      });
    });

    it('should throw NotFoundException if tenant slug does not exist', async () => {
      mockPrisma.tenant.findUnique.mockResolvedValue(null);
      await expect(service.getProductBySlug('invalid-store', 'item')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkStockAvailability', () => {
    it('should return isAvailable true when stock is sufficient', async () => {
      const result = await service.checkStockAvailability('var-1', 5);
      expect(result.isAvailable).toBe(true);
      expect(result.currentStock).toBe(10);
    });

    it('should return isAvailable false when requested quantity exceeds stock', async () => {
      const result = await service.checkStockAvailability('var-1', 15);
      expect(result.isAvailable).toBe(false);
      expect(result.currentStock).toBe(10);
    });

    it('should throw NotFoundException when variant is not found', async () => {
      await expect(service.checkStockAvailability('var-non-existent', 1)).rejects.toThrow(NotFoundException);
    });
  });
});
