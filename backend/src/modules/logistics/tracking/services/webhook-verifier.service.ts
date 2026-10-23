/**
 * @fileoverview webhook-verifier.service.ts
 * Servicio de verificacion criptografica de firmas para webhooks entrantes de transportistas.
 * Aplica comparacion segura en tiempo constante (timingSafeEqual) para mitigar ataques de tiempo (timing attacks).
 * Permite validar firmas HMAC-SHA256 segun el transportista utilizando secretos configurados en CarrierAccount o en el sistema.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CarrierCode } from '@prisma/client';
import * as crypto from 'crypto';

/**
 * Servicio encargado de la seguridad y autenticacion de webhooks externos.
 */
@Injectable()
export class WebhookVerifierService {
  private readonly logger = new Logger(WebhookVerifierService.name);
  private readonly defaultSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultSecret =
      this.configService.get<string>('WEBHOOK_SECRET_DEFAULT') || 'dev_secret_key_123';
  }

  /**
   * Resuelve el nombre del encabezado HTTP esperado para la firma segun el transportista.
   *
   * @param carrierCode Codigo enum del transportista
   * @returns Nombre del encabezado HTTP
   */
  public getExpectedSignatureHeader(carrierCode: CarrierCode): string {
    switch (carrierCode) {
      case CarrierCode.SKYDROPX:
        return 'x-skydropx-signature';
      case CarrierCode.SHIPPO:
        return 'x-shippo-signature';
      case CarrierCode.FEDEX:
        return 'x-fedex-signature';
      case CarrierCode.DHL:
        return 'x-dhl-signature';
      default:
        return 'x-carrier-signature';
    }
  }

  /**
   * Verifica la validez de la firma digital HMAC-SHA256 recibida en el webhook.
   *
   * @param carrierCode Codigo enum del transportista emisor
   * @param payload Contenido JSON completo del webhook
   * @param signature Firma digital recibida en los headers
   * @param customSecret Secreto especifico de la cuenta de transportista (opcional)
   * @returns Verdadero si la firma coincide exactamente de forma segura
   */
  public verifySignature(
    carrierCode: CarrierCode,
    payload: Record<string, unknown>,
    signature?: string,
    customSecret?: string,
  ): boolean {
    if (!signature) {
      this.logger.warn(`Missing webhook signature header for carrier ${carrierCode}`);
      return false;
    }

    const secret = customSecret || this.defaultSecret;
    if (!secret) {
      this.logger.warn(`No signing secret available to verify webhook for carrier ${carrierCode}`);
      return false;
    }

    try {
      const serializedPayload = JSON.stringify(payload);
      const computedHash = crypto
        .createHmac('sha256', secret)
        .update(serializedPayload)
        .digest('hex');

      // Limpieza de prefijos comunes como 'sha256='
      const cleanSignature = signature.replace(/^sha256=/i, '').trim();

      const computedBuffer = Buffer.from(computedHash, 'utf-8');
      const signatureBuffer = Buffer.from(cleanSignature, 'utf-8');

      // Si las longitudes difieren, se rechaza inmediatamente sin comparar buffers
      if (computedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(computedBuffer, signatureBuffer);
    } catch (error) {
      this.logger.error(
        `Error during cryptographic signature verification for ${carrierCode}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  /**
   * Genera una firma HMAC de prueba para propositos de testing o integracion local.
   *
   * @param payload Contenido del webhook a firmar
   * @param secret Clave secreta con la que se firmara
   * @returns Cadena hexadecimal de la firma generada
   */
  public generateTestSignature(payload: Record<string, unknown>, secret?: string): string {
    const key = secret || this.defaultSecret;
    const serializedPayload = JSON.stringify(payload);
    return crypto.createHmac('sha256', key).update(serializedPayload).digest('hex');
  }
}
