/**
 * @fileoverview supabase-storage.service.spec.ts
 * Pruebas unitarias para SupabaseStorageService.
 * Verifica la inicializacion del servicio, generacion de URLs, subida de archivos en modo
 * fallback y organizacion de rutas multi-tenant en el bucket 'shipping-labels'.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SupabaseStorageService, SHIPPING_LABELS_BUCKET } from './supabase-storage.service';

describe('SupabaseStorageService', () => {
  let service: SupabaseStorageService;
  let mockConfigService: { get: jest.Mock };

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockReturnValue(undefined), // Modo fallback para testing
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseStorageService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SupabaseStorageService>(SupabaseStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadShippingLabel', () => {
    it('should upload shipping label with tenant isolated path structure', async () => {
      const buffer = Buffer.from('test-label-content', 'utf-8');
      const result = await service.uploadShippingLabel('tenant-100', 'MCK998877.pdf', buffer, 'PDF');

      expect(result.bucket).toBe(SHIPPING_LABELS_BUCKET);
      expect(result.path).toBe('tenant-100/labels/MCK998877.pdf');
      expect(result.publicUrl).toBeDefined();
      expect(result.publicUrl).toContain('tenant-100/labels/MCK998877.pdf');
    });

    it('should support ZPL format label upload', async () => {
      const zplBuffer = Buffer.from('^XA^FO50,50^FDTest^FS^XZ', 'utf-8');
      const result = await service.uploadShippingLabel('tenant-200', 'MCK554433.zpl', zplBuffer, 'ZPL');

      expect(result.bucket).toBe(SHIPPING_LABELS_BUCKET);
      expect(result.path).toBe('tenant-200/labels/MCK554433.zpl');
      expect(result.publicUrl).toBeDefined();
    });
  });

  describe('getSignedUrl', () => {
    it('should return a signed URL string', async () => {
      const signedUrl = await service.getSignedUrl(SHIPPING_LABELS_BUCKET, 'tenant-1/labels/sample.pdf', 1800);
      expect(signedUrl).toBeDefined();
      expect(typeof signedUrl).toBe('string');
      expect(signedUrl).toContain('tenant-1/labels/sample.pdf');
    });
  });
});
