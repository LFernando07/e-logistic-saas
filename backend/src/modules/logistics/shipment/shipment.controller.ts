import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { CreateShipmentDto } from '../carrier/interfaces/carrier-adapter.interface';

/**
 * Controlador de gestion de envios.
 * Expone endpoints REST para creacion de envios, listado y consulta por ID.
 */
@Controller('logistics/shipments')
export class ShipmentController {
  constructor(private readonly shipmentService: ShipmentService) {}

  /**
   * Lista todos los envios registrados, con filtro opcional por tenantId.
   */
  @Get()
  async getShipments(@Query('tenantId') tenantId?: string) {
    return this.shipmentService.listShipments(tenantId);
  }

  @Post()
  async createShipment(@Body() dto: CreateShipmentDto) {
    return this.shipmentService.createShipment(dto);
  }

  @Get(':id')
  async getShipment(@Param('id') id: string) {
    return this.shipmentService.getShipmentById(id);
  }
}
