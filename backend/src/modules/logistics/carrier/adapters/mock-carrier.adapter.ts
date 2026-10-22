import { Injectable } from '@nestjs/common';
import { CarrierCode, TrackingEventStatus } from '@prisma/client';
import {
  CarrierAdapter,
  RateQueryDto,
  NormalizedRate,
  CreateShipmentDto,
  CarrierShipmentResponse,
  NormalizedTrackingHistory,
  NormalizedTrackingEvent,
} from '../interfaces/carrier-adapter.interface';

@Injectable()
export class MockCarrierAdapter implements CarrierAdapter {
  readonly carrierCode: CarrierCode = CarrierCode.MOCK;

  async getRates(query: RateQueryDto): Promise<NormalizedRate[]> {
    const baseRate = query.weightKg * 4.5 + 8.0;

    return [
      {
        carrierCode: this.carrierCode,
        serviceCode: 'MOCK_STANDARD',
        serviceName: 'Mock Standard Ground',
        rateAmount: Math.round(baseRate * 100) / 100,
        currency: 'USD',
        estimatedDeliveryDays: 4,
      },
      {
        carrierCode: this.carrierCode,
        serviceCode: 'MOCK_EXPRESS',
        serviceName: 'Mock Next Day Express',
        rateAmount: Math.round((baseRate * 1.8 + 12) * 100) / 100,
        currency: 'USD',
        estimatedDeliveryDays: 1,
      },
    ];
  }

  async createShipment(payload: CreateShipmentDto): Promise<CarrierShipmentResponse> {
    const timestamp = Date.now();
    const trackingNumber = `MCK${timestamp.toString().slice(-9)}`;
    const baseRate = payload.packages.reduce((sum, pkg) => sum + pkg.weightKg * 4.5 + 8.0, 0);

    return {
      trackingNumber,
      carrierCode: this.carrierCode,
      serviceCode: payload.serviceCode,
      labelUrl: `https://storage.elogistics.local/labels/${trackingNumber}.pdf`,
      zplUrl: `https://storage.elogistics.local/labels/${trackingNumber}.zpl`,
      rateAmount: Math.round(baseRate * 100) / 100,
      currency: 'USD',
      estimatedDeliveryAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      rawResponse: {
        mock_id: `mock_shipment_${timestamp}`,
        created_at: new Date().toISOString(),
        packages_count: payload.packages.length,
      },
    };
  }

  async track(trackingNumber: string): Promise<NormalizedTrackingHistory> {
    const now = new Date();
    const pastHour = new Date(now.getTime() - 3600000);

    const events: NormalizedTrackingEvent[] = [
      {
        status: TrackingEventStatus.LABEL_CREATED,
        rawStatus: 'CREATED',
        description: 'Shipping label created electronically',
        location: 'Origin Facility',
        eventTimestamp: pastHour,
        carrierCode: this.carrierCode,
        rawPayload: { code: '100' },
      },
      {
        status: TrackingEventStatus.IN_TRANSIT,
        rawStatus: 'IN_TRANSIT',
        description: 'Package in transit to delivery facility',
        location: 'Hub Center',
        eventTimestamp: now,
        carrierCode: this.carrierCode,
        rawPayload: { code: '200' },
      },
    ];

    return {
      trackingNumber,
      carrierCode: this.carrierCode,
      currentStatus: TrackingEventStatus.IN_TRANSIT,
      events,
      estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      isDelivered: false,
    };
  }

  parseWebhook(rawPayload: Record<string, unknown>): NormalizedTrackingEvent {
    const rawStatus = String(rawPayload['status'] || 'IN_TRANSIT').toUpperCase();
    let status: TrackingEventStatus = TrackingEventStatus.IN_TRANSIT;

    if (rawStatus.includes('DELIVERED')) {
      status = TrackingEventStatus.DELIVERED;
    } else if (rawStatus.includes('OUT_FOR_DELIVERY')) {
      status = TrackingEventStatus.OUT_FOR_DELIVERY;
    } else if (rawStatus.includes('EXCEPTION')) {
      status = TrackingEventStatus.EXCEPTION;
    } else if (rawStatus.includes('RETURN')) {
      status = TrackingEventStatus.RETURNED;
    } else if (rawStatus.includes('LABEL_CREATED')) {
      status = TrackingEventStatus.LABEL_CREATED;
    }

    return {
      status,
      rawStatus,
      description: String(rawPayload['description'] || 'Status updated via mock carrier webhook'),
      location: (rawPayload['location'] as string) || undefined,
      eventTimestamp: rawPayload['timestamp'] ? new Date(String(rawPayload['timestamp'])) : new Date(),
      carrierCode: this.carrierCode,
      rawPayload,
    };
  }
}
