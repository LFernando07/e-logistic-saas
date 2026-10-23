/**
 * @fileoverview OrderService
 * Servicio de administracion y consulta de ordenes de compra para el modulo de e-commerce.
 * Permite consultar el detalle completo de una orden (con items, pagos y envio asignado)
 * y listar el historico de ordenes correspondiente a un comercio/tenant especifico.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Servicio de gestion de ordenes de compra.
 */
@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Consulta una orden de compra por su identificador unico UUID,
   * incluyendo sus lineas de articulos, registros de pago y envio asociado.
   *
   * @param id Identificador UUID de la orden
   * @returns Entidad de la orden con sus relaciones completas
   */
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
