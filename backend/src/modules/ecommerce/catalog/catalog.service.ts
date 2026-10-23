/**
 * @fileoverview CatalogService
 * Servicio de gestion y consulta del catalogo de productos y variantes para la tienda satelite.
 * Proporciona listado filtrado por tenant y categoria, y detalle exhaustivo de producto.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Servicio para consulta y exploracion del catalogo de e-commerce.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista productos activos filtrados opcionalmente por tenant o categoria.
   *
   * @param tenantId Identificador opcional del comercio (aislamiento multi-tenant)
   * @param category Categoria opcional del producto
   * @returns Lista de productos con sus variantes activas
   */
  async listProducts(tenantId?: string, category?: string) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(tenantId ? { tenantId } : {}),
        ...(category ? { category } : {}),
      },
      include: {
        variants: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: true,
        tenant: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} was not found.`);
    }

    return product;
  }
}
