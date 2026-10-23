import { CarrierCode, TrackingEventStatus } from '@prisma/client';

export interface RateQueryDto {
  originPostalCode: string;
  originCountry: string;
  destinationPostalCode: string;
  destinationCountry: string;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  declaredValue?: number;
}

export interface NormalizedRate {
  carrierCode: CarrierCode;
  serviceCode: string;
  serviceName: string;
  rateAmount: number;
  currency: string;
  estimatedDeliveryDays?: number;
  carrierAccountId?: string;
}

export interface CreateShipmentDto {
  tenantId: string;
  carrierCode: CarrierCode;
  serviceCode: string;
  orderId?: string;
  originAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  destinationAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };
  packages: Array<{
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    packageType?: string;
  }>;
}

export interface CarrierShipmentResponse {
  trackingNumber: string;
  carrierCode: CarrierCode;
  serviceCode: string;
  labelUrl: string;
  zplUrl?: string;
  rateAmount: number;
  currency: string;
  estimatedDeliveryAt?: Date;
  rawResponse: Record<string, unknown>;
}

export interface NormalizedTrackingEvent {
  status: TrackingEventStatus;
  rawStatus: string;
  description: string;
  location?: string;
  eventTimestamp: Date;
  carrierCode: CarrierCode;
  rawPayload: Record<string, unknown>;
}

export interface NormalizedTrackingHistory {
  trackingNumber: string;
  carrierCode: CarrierCode;
  currentStatus: TrackingEventStatus;
  events: NormalizedTrackingEvent[];
  estimatedDelivery?: Date;
  isDelivered: boolean;
}

export interface CarrierAdapter {
  readonly carrierCode: CarrierCode;
  getRates(query: RateQueryDto): Promise<NormalizedRate[]>;
  createShipment(payload: CreateShipmentDto): Promise<CarrierShipmentResponse>;
  track(trackingNumber: string): Promise<NormalizedTrackingHistory>;
  parseWebhook(rawPayload: Record<string, unknown>): NormalizedTrackingEvent;

  /**
   * Genera el buffer binario del documento de la guia de envio (PDF o ZPL).
   *
   * @param trackingNumber Numero de guia generado
   * @param format Formato del archivo ('PDF' o 'ZPL')
   * @returns Buffer binario con los datos del documento
   */
  generateLabelDocument?(trackingNumber: string, format: 'PDF' | 'ZPL'): Promise<Buffer>;
}
