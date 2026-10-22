import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CarrierService } from '../carrier/carrier.service';
import { CreateShipmentDto } from '../carrier/interfaces/carrier-adapter.interface';
import { LabelQueueProducer } from '../../queues/producers/label-queue.producer';

@Injectable()
export class ShipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carrierService: CarrierService,
    private readonly labelQueueProducer: LabelQueueProducer,
  ) {}

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
}
