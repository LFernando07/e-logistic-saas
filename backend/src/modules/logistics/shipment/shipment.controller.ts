import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { CreateShipmentDto } from '../carrier/interfaces/carrier-adapter.interface';

@Controller('logistics/shipments')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  @Post()
  async createShipment(@Body() dto: CreateShipmentDto) {
    return this.shipmentService.createShipment(dto);
  }

  @Get(':id')
  async getShipment(@Param('id') id: string) {
    return this.shipmentService.getShipmentById(id);
  }
}
