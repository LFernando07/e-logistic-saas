import { Controller, Get, Param, Query } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('ecommerce/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.orderService.getOrderById(id);
  }

  @Get()
  async getTenantOrders(@Query('tenantId') tenantId: string) {
    return this.orderService.listOrdersByTenant(tenantId);
  }
}
