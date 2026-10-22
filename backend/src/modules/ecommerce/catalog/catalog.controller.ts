import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('ecommerce/products')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  async getProducts(
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
  ) {
    return this.catalogService.listProducts(tenantId, category);
  }

  @Get(':id')
  async getProduct(@Param('id') id: string) {
    return this.catalogService.getProductById(id);
  }
}
