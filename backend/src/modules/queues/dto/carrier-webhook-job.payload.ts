import { CarrierCode } from '@prisma/client';

export interface CarrierWebhookJobPayload {
  eventId: string;
  carrierCode: CarrierCode;
  trackingNumber: string;
  rawPayload: Record<string, unknown>;
  receivedAt: string;
  tenantId?: string;
  signatureHeader?: string;
}
