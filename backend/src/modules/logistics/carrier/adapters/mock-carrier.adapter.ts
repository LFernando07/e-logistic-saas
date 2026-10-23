/**
 * @fileoverview MockCarrierAdapter
 * Implementacion de prueba / sandbox que satisface el contrato CarrierAdapter.
 * Simula de forma determinista la cotizacion de tarifas, creacion de envios con URLs de etiquetas
 * y linea de tiempo de eventos de rastreo sin depender de APIs externas de pago o sandbox inestables.
 */

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

/**
 * Adaptador de simulacion para pruebas locales, testing e2e y staging.
 */
@Injectable()
export class MockCarrierAdapter implements CarrierAdapter {
  readonly carrierCode: CarrierCode = CarrierCode.MOCK;

  /**
   * Calcula tarifas simuladas estandar y express en base al peso de los paquetes.
   *
   * @param query Parametros de origen, destino y peso
   * @returns Arreglo de opciones de servicio con costos en USD
   */
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

  /**
   * Crea un envio simulado generando un numero de guia unico con prefijo 'MCK' y
   * URLs simuladas para las etiquetas PDF y ZPL.
   *
   * @param payload Informacion del destinatario, remitente y dimensiones de los paquetes
   * @returns Respuesta estructurada con numero de rastreo y metadatos
   */
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

  /**
   * Consulta el historial simulado de eventos para un numero de guia.
   *
   * @param trackingNumber Numero de guia a consultar
   * @returns Historial normalizado con eventos cronologicos y estado actual
   */
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

  /**
   * Parsea un payload crudo de webhook proveniente del transportista mock
   * y lo convierte en una entidad NormalizedTrackingEvent estandar.
   *
   * @param rawPayload Contenido JSON enviado en el webhook
   * @returns Evento de tracking normalizado
   */
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

  /**
   * Genera un buffer binario simulado para la etiqueta de envio en PDF o ZPL.
   *
   * @param trackingNumber Numero de guia a incrustar en el documento
   * @param format Formato del archivo ('PDF' o 'ZPL')
   * @returns Buffer binario con los datos del documento
   */
  async generateLabelDocument(trackingNumber: string, format: 'PDF' | 'ZPL'): Promise<Buffer> {
    if (format === 'ZPL') {
      const zplContent = `^XA^FO50,50^ADN,36,20^FD${trackingNumber}^FS^BY3^FO50,100^BCN,100,Y,N,N^FD${trackingNumber}^FS^XZ`;
      return Buffer.from(zplContent, 'utf-8');
    }
    const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (Shipping Label ${trackingNumber}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
    return Buffer.from(pdfContent, 'utf-8');
  }
}
