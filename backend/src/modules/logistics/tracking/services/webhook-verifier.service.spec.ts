/**
 * @fileoverview webhook-verifier.service.spec.ts
 * Pruebas unitarias para WebhookVerifierService.
 * Valida la resolucion de headers por carrier, generacion de firmas HMAC-SHA256,
 * verificacion criptografica segura y proteccion ante firmas invalidas o malformadas.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CarrierCode } from '@prisma/client';
import { WebhookVerifierService } from './webhook-verifier.service';

describe('WebhookVerifierService', () => {
  let service: WebhookVerifierService;
  const testSecret = 'secret_test_key_12345';

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue(testSecret),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookVerifierService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WebhookVerifierService>(WebhookVerifierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getExpectedSignatureHeader', () => {
    it('should return carrier-specific headers', () => {
      expect(service.getExpectedSignatureHeader(CarrierCode.SKYDROPX)).toBe('x-skydropx-signature');
      expect(service.getExpectedSignatureHeader(CarrierCode.SHIPPO)).toBe('x-shippo-signature');
      expect(service.getExpectedSignatureHeader(CarrierCode.FEDEX)).toBe('x-fedex-signature');
      expect(service.getExpectedSignatureHeader(CarrierCode.DHL)).toBe('x-dhl-signature');
      expect(service.getExpectedSignatureHeader(CarrierCode.MOCK)).toBe('x-carrier-signature');
    });
  });

  describe('verifySignature', () => {
    it('should return true for a valid HMAC-SHA256 signature', () => {
      const payload = { tracking_number: 'TRK100', status: 'IN_TRANSIT' };
      const validSignature = service.generateTestSignature(payload, testSecret);

      const isValid = service.verifySignature(CarrierCode.SKYDROPX, payload, validSignature);
      expect(isValid).toBe(true);
    });

    it('should return true when signature includes sha256= prefix', () => {
      const payload = { tracking_number: 'TRK100', status: 'DELIVERED' };
      const validSignature = `sha256=${service.generateTestSignature(payload, testSecret)}`;

      const isValid = service.verifySignature(CarrierCode.SKYDROPX, payload, validSignature);
      expect(isValid).toBe(true);
    });

    it('should return false for an altered payload', () => {
      const originalPayload = { tracking_number: 'TRK100', status: 'IN_TRANSIT' };
      const validSignature = service.generateTestSignature(originalPayload, testSecret);

      const alteredPayload = { tracking_number: 'TRK100', status: 'DELIVERED' };
      const isValid = service.verifySignature(CarrierCode.SKYDROPX, alteredPayload, validSignature);
      expect(isValid).toBe(false);
    });

    it('should return false for an invalid signature string', () => {
      const payload = { tracking_number: 'TRK100', status: 'IN_TRANSIT' };
      const invalidSignature = 'invalid_tampered_signature_hex_value';

      const isValid = service.verifySignature(CarrierCode.SKYDROPX, payload, invalidSignature);
      expect(isValid).toBe(false);
    });

    it('should return false when signature is missing or undefined', () => {
      const payload = { tracking_number: 'TRK100' };
      const isValid = service.verifySignature(CarrierCode.SKYDROPX, payload, undefined);
      expect(isValid).toBe(false);
    });
  });
});
