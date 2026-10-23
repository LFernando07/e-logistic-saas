/**
 * @fileoverview tracking.service.ts
 * Servicio de consulta de historial de rastreo para envios en la base de datos PostgreSQL.
 * Retorna los datos unificados del envio, paquetes asociados, datos de branding del tenant y
 * todos los eventos de seguimiento ordenados cronologicamente de forma descendente, enriqueciendo
 * la respuesta con hitos de progreso porcentuales y estado del paquete.
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ShipmentStatus, TrackingEventStatus } from '@prisma/client';

/**
 * Estructura de un hito o paso de la linea de tiempo de entrega.
 */
export interface TrackingMilestone {
  step: number;
  key: TrackingEventStatus;
  label: string;
  isCompleted: boolean;
  isCurrent: boolean;
  completedAt?: Date;
}

/**
 * Respuesta enriquecida de seguimiento para el portal publico post-compra.
 */
export interface EnrichedTrackingResponse {
  shipmentId: string;
  trackingNumber: string;
  carrierCode: string;
  serviceCode: string;
  currentStatus: ShipmentStatus;
  statusLabel: string;
  progressPercentage: number;
  isDelivered: boolean;
  hasException: boolean;
  hasReturned: boolean;
  estimatedDeliveryAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  labelUrl?: string;
  origin: {
    city?: string;
    state?: string;
    country?: string;
  };
  destination: {
    name?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  packagesCount: number;
  totalWeightKg: number;
  milestones: TrackingMilestone[];
  events: Array<{
    id: string;
    status: TrackingEventStatus;
    rawStatus: string;
    description: string;
    location?: string;
    eventTimestamp: Date;
    carrierCode: string;
  }>;
  merchant: {
    name: string;
    slug: string;
    domain?: string;
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
  };
}

/**
 * Servicio para consulta de lineas de tiempo y detalles de envios.
 */
@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene la informacion integral de seguimiento de un paquete por su numero de guia,
   * calculando el avance de hitos, progreso porcentual y datos de personalizacion del comercio.
   *
   * @param trackingNumber Numero de guia o rastreo del paquete
   * @returns Datos formateados para el portal publico de tracking
   */
  async getTrackingByNumber(trackingNumber: string): Promise<EnrichedTrackingResponse> {
    const shipment = await this.prisma.shipment.findUnique({
      where: { trackingNumber },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            domain: true,
            brandingSettings: true,
          },
        },
        packages: true,
        trackingEvents: {
          orderBy: { eventTimestamp: 'desc' },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment with tracking number ${trackingNumber} was not found.`);
    }

    const branding = (shipment.tenant.brandingSettings as Record<string, any>) || {};
    const origin = (shipment.originAddress as Record<string, any>) || {};
    const destination = (shipment.destinationAddress as Record<string, any>) || {};

    const totalWeightKg = shipment.packages.reduce((acc, pkg) => acc + Number(pkg.weightKg), 0);
    const milestones = this.calculateMilestones(shipment.status, shipment.trackingEvents);
    const progressPercentage = this.calculateProgressPercentage(shipment.status);

    return {
      shipmentId: shipment.id,
      trackingNumber: shipment.trackingNumber,
      carrierCode: shipment.carrierCode,
      serviceCode: shipment.serviceCode,
      currentStatus: shipment.status,
      statusLabel: this.getStatusHumanLabel(shipment.status),
      progressPercentage,
      isDelivered: shipment.status === ShipmentStatus.DELIVERED,
      hasException: shipment.status === ShipmentStatus.EXCEPTION,
      hasReturned: shipment.status === ShipmentStatus.RETURNED,
      estimatedDeliveryAt: shipment.estimatedDeliveryAt || undefined,
      shippedAt: shipment.shippedAt || undefined,
      deliveredAt: shipment.deliveredAt || undefined,
      labelUrl: shipment.labelUrl || undefined,
      origin: {
        city: origin.city,
        state: origin.state,
        country: origin.country,
      },
      destination: {
        name: destination.name,
        city: destination.city,
        state: destination.state,
        postalCode: destination.postalCode,
        country: destination.country,
      },
      packagesCount: shipment.packages.length,
      totalWeightKg: Math.round(totalWeightKg * 100) / 100,
      milestones,
      events: shipment.trackingEvents.map((evt) => ({
        id: evt.id,
        status: evt.status,
        rawStatus: evt.rawStatus,
        description: evt.description,
        location: evt.location || undefined,
        eventTimestamp: evt.eventTimestamp,
        carrierCode: evt.carrierCode,
      })),
      merchant: {
        name: shipment.tenant.name,
        slug: shipment.tenant.slug,
        domain: shipment.tenant.domain || undefined,
        logoUrl: branding.logoUrl || undefined,
        primaryColor: branding.primaryColor || '#0284c7',
        accentColor: branding.accentColor || '#0369a1',
      },
    };
  }

  /**
   * Calcula los cuatro hitos principales del proceso de entrega.
   *
   * @param currentStatus Estado actual del envio
   * @param events Lista de eventos registrados para extraer marcas temporales
   * @returns Arreglo con los 4 hitos normalizados
   */
  public calculateMilestones(
    currentStatus: ShipmentStatus,
    events: Array<{ status: TrackingEventStatus; eventTimestamp: Date }>,
  ): TrackingMilestone[] {
    const statusOrder: TrackingEventStatus[] = [
      TrackingEventStatus.LABEL_CREATED,
      TrackingEventStatus.IN_TRANSIT,
      TrackingEventStatus.OUT_FOR_DELIVERY,
      TrackingEventStatus.DELIVERED,
    ];

    const currentIdx = this.getStatusMilestoneIndex(currentStatus);

    return statusOrder.map((statusKey, idx) => {
      const matchingEvent = events.find((e) => e.status === statusKey);
      const isCompleted = currentIdx >= idx;
      const isCurrent = currentIdx === idx;

      return {
        step: idx + 1,
        key: statusKey,
        label: this.getMilestoneLabel(statusKey),
        isCompleted,
        isCurrent,
        completedAt: matchingEvent?.eventTimestamp,
      };
    });
  }

  /**
   * Calcula el porcentaje de avance (0% a 100%) segun el estado actual.
   *
   * @param status Estado del envio
   * @returns Porcentaje de progreso
   */
  public calculateProgressPercentage(status: ShipmentStatus): number {
    switch (status) {
      case ShipmentStatus.DRAFT:
        return 10;
      case ShipmentStatus.LABEL_CREATED:
        return 25;
      case ShipmentStatus.PICKED_UP:
        return 40;
      case ShipmentStatus.IN_TRANSIT:
        return 65;
      case ShipmentStatus.OUT_FOR_DELIVERY:
        return 85;
      case ShipmentStatus.DELIVERED:
        return 100;
      case ShipmentStatus.EXCEPTION:
      case ShipmentStatus.RETURNED:
      case ShipmentStatus.CANCELLED:
        return 50;
      default:
        return 20;
    }
  }

  /**
   * Retorna el indice del hito correspondiente al estado actual (0 a 3).
   */
  private getStatusMilestoneIndex(status: ShipmentStatus): number {
    switch (status) {
      case ShipmentStatus.DRAFT:
      case ShipmentStatus.LABEL_CREATED:
        return 0;
      case ShipmentStatus.PICKED_UP:
      case ShipmentStatus.IN_TRANSIT:
        return 1;
      case ShipmentStatus.OUT_FOR_DELIVERY:
        return 2;
      case ShipmentStatus.DELIVERED:
        return 3;
      default:
        return 0;
    }
  }

  private getMilestoneLabel(status: TrackingEventStatus): string {
    switch (status) {
      case TrackingEventStatus.LABEL_CREATED:
        return 'Guia Generada';
      case TrackingEventStatus.IN_TRANSIT:
        return 'En Transito';
      case TrackingEventStatus.OUT_FOR_DELIVERY:
        return 'En Reparto';
      case TrackingEventStatus.DELIVERED:
        return 'Entregado';
      case TrackingEventStatus.EXCEPTION:
        return 'Incidencia';
      case TrackingEventStatus.RETURNED:
        return 'Devolucion';
      default:
        return 'Procesando';
    }
  }

  private getStatusHumanLabel(status: ShipmentStatus): string {
    switch (status) {
      case ShipmentStatus.DRAFT:
        return 'Borrador';
      case ShipmentStatus.LABEL_CREATED:
        return 'Guia generada';
      case ShipmentStatus.PICKED_UP:
        return 'Recolectado por mensajeria';
      case ShipmentStatus.IN_TRANSIT:
        return 'En camino a destino';
      case ShipmentStatus.OUT_FOR_DELIVERY:
        return 'En ruta de entrega final';
      case ShipmentStatus.DELIVERED:
        return 'Paquete entregado con exito';
      case ShipmentStatus.EXCEPTION:
        return 'Retraso o excepcion en transito';
      case ShipmentStatus.RETURNED:
        return 'Paquete devuelto al remitente';
      case ShipmentStatus.CANCELLED:
        return 'Envio cancelado';
      default:
        return 'Estado actualizado';
    }
  }
}
