/**
 * @fileoverview ShipmentService
 * Servicio de gestion del ciclo de vida de los envios postales y de mensajeria.
 * Se encarga de interactuar con el CarrierService (patron Strategy) para crear la guia en la
 * paqueteria, persistir el Shipment y sus paquetes en PostgreSQL, y encolar la tarea asincrona
 * de generacion y subida de etiqueta en BullMQ.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CarrierService } from '../carrier/carrier.service';
import { CreateShipmentDto } from '../carrier/interfaces/carrier-adapter.interface';
import { LabelQueueProducer } from '../../queues/producers/label-queue.producer';

/**
 * Servicio de gestion y orquestacion de envios postales.
 */
@Injectable()
export class ShipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carrierService: CarrierService,
    private readonly labelQueueProducer: LabelQueueProducer,
  ) {}

  /**
   * Crea un envio utilizando el transportista correspondiente a traves de su adaptador.
   * Persiste el Shipment en la base de datos y encola el trabajo de generacion de guia en BullMQ.
   *
   * @param dto Informacion completa del envio (destinatario, remitente, paquetes, transportista)
   * @returns Entidad Shipment persistida con paquetes asociados
   */
  async createShipment(dto: CreateShipmentDto) {
    const adapter = this.carrierService.getAdapter(dto.carrierCode);
    const carrierResponse = await adapter.createShipment(dto);

    const shipment = await this.prisma.shipment.create({
      data: {
        tenantId: dto.tenantId,
        orderId: dto.orderId,
        carrierCode: dto.carrierCode,
        serviceCode: dto.serviceCode,
        trackingNumber: carrierResponse.trackingNumber,
        rateAmount: carrierResponse.rateAmount,
        currency: carrierResponse.currency,
        labelUrl: carrierResponse.labelUrl,
        zplUrl: carrierResponse.zplUrl,
        originAddress: dto.originAddress as object,
        destinationAddress: dto.destinationAddress as object,
        packages: {
          create: dto.packages.map((pkg) => ({
            weightKg: pkg.weightKg,
            lengthCm: pkg.lengthCm,
            widthCm: pkg.widthCm,
            heightCm: pkg.heightCm,
            packageType: pkg.packageType || 'BOX',
          })),
        },
      },
      include: {
        packages: true,
      },
    });

    // Enqueue async label generation / upload job to Supabase Storage
    await this.labelQueueProducer.enqueueLabelGeneration({
      shipmentId: shipment.id,
      tenantId: shipment.tenantId,
      carrierCode: shipment.carrierCode,
      serviceCode: shipment.serviceCode,
      format: 'PDF',
      orderId: shipment.orderId || undefined,
      requestedAt: new Date().toISOString(),
    });

    return shipment;
  }

  /**
   * Consulta un envio por su identificador unico incluyendo paquetes y eventos de tracking.
   * Lanza NotFoundException si el envio no existe.
   *
   * @param id Identificador UUID del envio
   * @returns Datos del envio con paquetes y eventos
   */
  async getShipmentById(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: { packages: true, trackingEvents: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found.`);
    }

    return shipment;
  }

  /**
   * Lista los envios registrados en el sistema, ordenados cronologicamente de forma descendente.
   * Permite filtrar opcionalmente por identificador del tenant/comercio.
   *
   * @param tenantId Identificador opcional del tenant
   * @returns Listado de envios con sus paquetes y eventos de rastreo
   */
  async listShipments(tenantId?: string) {
    return this.prisma.shipment.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        packages: true,
        trackingEvents: {
          orderBy: { eventTimestamp: 'desc' },
        },
      },
    });
  }
}
