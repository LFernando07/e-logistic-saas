/**
 * @fileoverview TrackingService
 * Servicio de consulta de historial de rastreo para envios en la base de datos PostgreSQL.
 * Retorna los datos unificados del envio, paquetes asociados, datos de branding del tenant y
 * todos los eventos de seguimiento ordenados cronologicamente de forma descendente.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Servicio para consulta de lineas de tiempo y detalles de envios.
 */
@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtiene la informacion integral de seguimiento de un paquete por su numero de guia.
   * Incluye la configuracion de branding del tenant emisor y todos los hitos del paquete.
   *
   * @param trackingNumber Numero de guia o rastreo del paquete
   * @returns Datos del envio con tenant, paquetes y trackingEvents
   */
  async getTrackingByNumber(trackingNumber: string) {
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

    return shipment;
  }
}
