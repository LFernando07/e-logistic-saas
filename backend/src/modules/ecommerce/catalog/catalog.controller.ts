/**
 * @fileoverview catalog.controller.ts
 * Controlador HTTP para el catalogo de productos de e-commerce.
 * Expone endpoints REST para listado con filtros, detalle por ID, detalle por slug del comercio
 * y verificacion de disponibilidad de existencias para el carrito de compras.
 */

import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { CatalogService } from './catalog.service';

/**
 * Controlador REST para el catalogo de productos.
 * Soporta las rutas /ecommerce/products y /ecommerce/catalog para compatibilidad total.
 */
@Controller(['ecommerce/products', 'ecommerce/catalog'])
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  /**
   * Lista productos con filtros opcionales de tenant, categoria y busqueda por texto.
   */
  @Get()
  async getProducts(
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.catalogService.listProducts(tenantId, category, search);
  }

  /**
   * Consulta el detalle de un producto por su identificador UUID.
   */
  @Get(':id')
  async getProduct(@Param('id') id: string) {
    return this.catalogService.getProductById(id);
  }

  /**
   * Consulta un producto utilizando los slugs amigables de la tienda y del producto.
   */
  @Get('slug/:tenantSlug/:productSlug')
  async getProductBySlug(
    @Param('tenantSlug') tenantSlug: string,
    @Param('productSlug') productSlug: string,
  ) {
    return this.catalogService.getProductBySlug(tenantSlug, productSlug);
  }

  /**
   * Comprueba la disponibilidad de inventario para una variante de producto.
   */
  @Get('variants/:variantId/availability')
  async checkAvailability(
    @Param('variantId') variantId: string,
    @Query('quantity', new ParseIntPipe({ optional: true })) quantity?: number,
  ) {
    return this.catalogService.checkStockAvailability(variantId, quantity || 1);
  }
}
