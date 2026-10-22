import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

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
