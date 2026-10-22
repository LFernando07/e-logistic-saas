import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

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
