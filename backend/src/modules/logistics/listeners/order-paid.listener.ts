/**
 * @fileoverview OrderPaidListener
 * Escucha de eventos interna basada en EventEmitter2 para desacoplar el dominio de E-Commerce del Logistico.
 * Reacciona al evento 'order.paid' para generar de forma automatica y desatendida el envio postal
 * calculando el peso acumulado de los articulos y direccion de entrega.
 */

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ShipmentService } from '../shipment/shipment.service';
import { CarrierCode } from '@prisma/client';

/**
 * Payload emitido en el evento 'order.paid'.
 */
export interface OrderPaidEvent {
  id: string;
  tenantId: string;
  orderNumber: string;
  shippingAddress: any;
  items: Array<{
    title: string;
    quantity: number;
    weightGrams: number;
  }>;
}

/**
 * Listener reactivo que orquesta el despacho logistico al confirmarse un pago.
 */
@Injectable()
export class OrderPaidListener {
  private readonly logger = new Logger(OrderPaidListener.name);

  constructor(private readonly shipmentService: ShipmentService) {}

  /**
   * Manejador ejecutado al dispararse el evento interno 'order.paid'.
   * Calcula el peso acumulado en kilogramos y crea el envio mediante ShipmentService.
   *
   * @param order Datos de la orden pagada
   */
  @OnEvent('order.paid')
  async handleOrderPaid(order: OrderPaidEvent): Promise<void> {
    this.logger.log(`Received order.paid event for Order #${order.orderNumber}. Dispatching logistics generation.`);

    try {
      const totalWeightKg =
        order.items.reduce((sum, item) => sum + (item.weightGrams || 500) * item.quantity, 0) / 1000;

      await this.shipmentService.createShipment({
        tenantId: order.tenantId,
        orderId: order.id,
        carrierCode: CarrierCode.MOCK,
        serviceCode: 'MOCK_STANDARD',
        originAddress: {
          name: 'Main Logistics Warehouse',
          street1: '123 Logistics Blvd',
          city: 'Austin',
          state: 'TX',
          postalCode: '78701',
          country: 'US',
        },
        destinationAddress: {
          name: order.shippingAddress?.name || 'Customer',
          street1: order.shippingAddress?.street1 || '456 Customer Ave',
          city: order.shippingAddress?.city || 'Dallas',
          state: order.shippingAddress?.state || 'TX',
          postalCode: order.shippingAddress?.postalCode || '75201',
          country: order.shippingAddress?.country || 'US',
        },
        packages: [
          {
            weightKg: Math.max(totalWeightKg, 0.5),
            lengthCm: 25,
            widthCm: 20,
            heightCm: 15,
            packageType: 'BOX',
          },
        ],
      });

      this.logger.log(`Automated shipment successfully created for Order #${order.orderNumber}.`);
    } catch (error) {
      this.logger.error(
        `Failed to generate automatic shipment for Order #${order.orderNumber}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
