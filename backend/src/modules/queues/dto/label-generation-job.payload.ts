import { CarrierCode } from '@prisma/client';

export interface LabelGenerationJobPayload {
  shipmentId: string;
  tenantId: string;
  carrierCode: CarrierCode;
  serviceCode: string;
  format: 'PDF' | 'ZPL';
  orderId?: string;
  requestedAt: string;
}
