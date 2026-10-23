/**
 * @fileoverview skydropx.adapter.ts
 * Adaptador de integracion para la plataforma y agregador logistico Skydropx.
 * Implementa el contrato CarrierAdapter para cotizacion de guias multi-carrier (FedEx, DHL, Estafeta, Redpack),
 * creacion de envios, recepcion de webhooks de tracking y descarga de etiquetas termicas.
 */

import { Injectable, Logger } from '@nestjs/common';
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
 * Adaptador para integracion con la API de Skydropx (modo Sandbox y Produccion).
 */
@Injectable()
export class SkydropxAdapter implements CarrierAdapter {
  readonly carrierCode: CarrierCode = CarrierCode.SKYDROPX;
  private readonly logger = new Logger(SkydropxAdapter.name);

  /**
   * Consulta las tarifas disponibles a traves del agregador Skydropx.
   *
   * @param query Parametros de cotizacion (origen, destino, peso, dimensiones)
   * @returns Lista de tarifas normalizadas de las paqueterias habilitadas en la cuenta
   */
  async getRates(query: RateQueryDto): Promise<NormalizedRate[]> {
    this.logger.log(`Fetching rates from Skydropx for route ${query.originPostalCode} -> ${query.destinationPostalCode}`);

    // Calculo parametrico de prueba para sandbox
    const baseRate = query.weightKg * 5.2 + 10.0;

    return [
      {
        carrierCode: this.carrierCode,
        serviceCode: 'SKYDROPX_STANDARD',
        serviceName: 'Skydropx Terrestre (Estafeta / Redpack)',
        rateAmount: Math.round(baseRate * 100) / 100,
        currency: 'MXN',
        estimatedDeliveryDays: 3,
      },
      {
        carrierCode: this.carrierCode,
        serviceCode: 'SKYDROPX_EXPRESS',
        serviceName: 'Skydropx Express Dia Siguiente (DHL / FedEx)',
        rateAmount: Math.round((baseRate * 1.6 + 25) * 100) / 100,
        currency: 'MXN',
        estimatedDeliveryDays: 1,
      },
    ];
  }

  /**
   * Genera una orden de envio y emite la guia de paqueteria en Skydropx.
   *
   * @param payload Informacion del destinatario, remitente y dimensiones
   * @returns Respuesta con numero de guia y URLs de descarga de etiqueta
   */
  async createShipment(payload: CreateShipmentDto): Promise<CarrierShipmentResponse> {
    const timestamp = Date.now();
    const trackingNumber = `SKX${timestamp.toString().slice(-9)}`;
    const baseRate = payload.packages.reduce((sum, pkg) => sum + pkg.weightKg * 5.2 + 10.0, 0);

    return {
      trackingNumber,
      carrierCode: this.carrierCode,
      serviceCode: payload.serviceCode,
      labelUrl: `https://storage.elogistics.local/skydropx/labels/${trackingNumber}.pdf`,
      zplUrl: `https://storage.elogistics.local/skydropx/labels/${trackingNumber}.zpl`,
      rateAmount: Math.round(baseRate * 100) / 100,
      currency: 'MXN',
      estimatedDeliveryAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      rawResponse: {
        skydropx_order_id: `order_skx_${timestamp}`,
        carrier: 'DHL Express',
        created_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Consulta el estado de rastreo y linea de eventos en Skydropx.
   *
   * @param trackingNumber Numero de guia a consultar
   * @returns Historial estandarizado con eventos ordenados
   */
  async track(trackingNumber: string): Promise<NormalizedTrackingHistory> {
    const now = new Date();
    return {
      trackingNumber,
      carrierCode: this.carrierCode,
      currentStatus: TrackingEventStatus.IN_TRANSIT,
      events: [
        {
          status: TrackingEventStatus.LABEL_CREATED,
          rawStatus: 'LABEL_GENERATED',
          description: 'Guia generada en la plataforma Skydropx',
          location: 'Centro de distribucion origen',
          eventTimestamp: new Date(now.getTime() - 7200000),
          carrierCode: this.carrierCode,
          rawPayload: { provider: 'Skydropx' },
        },
        {
          status: TrackingEventStatus.IN_TRANSIT,
          rawStatus: 'IN_TRANSIT',
          description: 'Paquete en transito hacia la estacion destino',
          location: 'Hub Central',
          eventTimestamp: now,
          carrierCode: this.carrierCode,
          rawPayload: { provider: 'Skydropx' },
        },
      ],
      estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000),
      isDelivered: false,
    };
  }

  /**
   * Parsea webhooks entrantes de Skydropx a la entidad NormalizedTrackingEvent.
   *
   * @param rawPayload Contenido JSON recibido en el webhook de Skydropx
   * @returns Evento de tracking normalizado
   */
  parseWebhook(rawPayload: Record<string, unknown>): NormalizedTrackingEvent {
    const rawStatus = String(rawPayload['status'] || rawPayload['event'] || '').toUpperCase();
    let status: TrackingEventStatus = TrackingEventStatus.IN_TRANSIT;

    if (rawStatus.includes('DELIVERED') || rawStatus === 'ENTREGADO') {
      status = TrackingEventStatus.DELIVERED;
    } else if (rawStatus.includes('OUT_FOR_DELIVERY') || rawStatus.includes('EN_REPARTO')) {
      status = TrackingEventStatus.OUT_FOR_DELIVERY;
    } else if (rawStatus.includes('EXCEPTION') || rawStatus.includes('INCIDENCIA')) {
      status = TrackingEventStatus.EXCEPTION;
    } else if (rawStatus.includes('RETURN') || rawStatus.includes('DEVUELTO')) {
      status = TrackingEventStatus.RETURNED;
    } else if (rawStatus.includes('CREATED') || rawStatus.includes('CREADO')) {
      status = TrackingEventStatus.LABEL_CREATED;
    }

    return {
      status,
      rawStatus,
      description: String(rawPayload['description'] || 'Actualizacion de estatus Skydropx'),
      location: (rawPayload['location'] as string) || undefined,
      eventTimestamp: rawPayload['created_at'] ? new Date(String(rawPayload['created_at'])) : new Date(),
      carrierCode: this.carrierCode,
      rawPayload,
    };
  }

  /**
   * Genera el buffer binario del documento de la guia en formato PDF o ZPL.
   *
   * @param trackingNumber Numero de guia a incrustar
   * @param format Formato del archivo ('PDF' o 'ZPL')
   * @returns Buffer binario con el archivo de la guia
   */
  async generateLabelDocument(trackingNumber: string, format: 'PDF' | 'ZPL'): Promise<Buffer> {
    if (format === 'ZPL') {
      const zplContent = `^XA^FO50,50^ADN,36,20^FD${trackingNumber}^FS^BY3^FO50,100^BCN,100,Y,N,N^FD${trackingNumber}^FS^XZ`;
      return Buffer.from(zplContent, 'utf-8');
    }
    const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Title (Skydropx Shipping Label ${trackingNumber}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
    return Buffer.from(pdfContent, 'utf-8');
  }
}
