/**
 * @fileoverview catalog.service.ts
 * Servicio de gestion y consulta del catalogo de productos y variantes para la tienda satelite.
 * Proporciona listado filtrado por tenant, categoria y busqueda de texto, detalle exhaustivo
 * por ID o por slug, y verificacion de disponibilidad de existencias.
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
   * Lista productos activos filtrados opcionalmente por tenant, categoria o termino de busqueda.
   *
   * @param tenantId Identificador opcional del comercio (aislamiento multi-tenant)
   * @param category Categoria opcional del producto
   * @param search Termino opcional para busqueda por titulo o descripcion
   * @returns Lista de productos con sus variantes activas
   */
  async listProducts(tenantId?: string, category?: string, search?: string) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        ...(tenantId ? { tenantId } : {}),
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        variants: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtiene el detalle de un producto por su identificador UUID.
   *
   * @param id Identificador UUID del producto
   * @returns Producto con sus variantes y datos basicos del tenant
   */
  async getProductById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: { where: { isActive: true } },
        tenant: {
          select: { id: true, name: true, slug: true, domain: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} was not found.`);
    }

    return product;
  }

  /**
   * Obtiene un producto por su slug y el slug del comercio emisor (para rutas amigables del storefront).
   *
   * @param tenantSlug Slug del comercio (ej. 'tienda-demo')
   * @param productSlug Slug del producto (ej. 'tenis-running-pro')
   * @returns Producto completo con variantes
   */
  async getProductBySlug(tenantSlug: string, productSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug '${tenantSlug}' was not found.`);
    }

    const product = await this.prisma.product.findUnique({
      where: {
        tenantId_slug: {
          tenantId: tenant.id,
          slug: productSlug,
        },
      },
      include: {
        variants: { where: { isActive: true } },
        tenant: {
          select: { id: true, name: true, slug: true, domain: true, brandingSettings: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with slug '${productSlug}' not found in store '${tenantSlug}'.`);
    }

    return product;
  }

  /**
   * Comprueba si una variante de producto cuenta con existencias suficientes para satisfacer una cantidad solicitada.
   *
   * @param variantId Identificador de la variante
   * @param quantity Cantidad deseada
   * @returns Objeto con bandera isAvailable y el stock actual
   */
  async checkStockAvailability(variantId: string, quantity: number): Promise<{ isAvailable: boolean; currentStock: number }> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant || !variant.isActive) {
      throw new NotFoundException(`Product variant ${variantId} is not available.`);
    }

    return {
      isAvailable: variant.inventoryQuantity >= quantity,
      currentStock: variant.inventoryQuantity,
    };
  }
}
