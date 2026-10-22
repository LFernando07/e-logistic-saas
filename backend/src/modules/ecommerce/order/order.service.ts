import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrderById(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { variant: true } },
        payments: true,
        shipment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found.`);
    }

    return order;
  }

  async listOrdersByTenant(tenantId: string) {
    return this.prisma.order.findMany({
      where: { tenantId },
      include: {
        items: true,
        shipment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
