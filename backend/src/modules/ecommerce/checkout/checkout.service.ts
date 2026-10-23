/**
 * @fileoverview CheckoutService
 * Servicio de procesamiento transaccional de compras (Checkout).
 * Realiza verificacion atomica de existencias de variantes, reserva y decremento de inventario,
 * calculo de subtotales y costos de flete, emision del registro Order y emision del evento 'order.created'.
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../database/prisma.service';
import { CheckoutDto } from './dto/checkout.dto';
import { OrderStatus, PaymentStatus, FulfillmentStatus } from '@prisma/client';

/**
 * Servicio transaccional de checkout y reserva de inventario.
 */
@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Ejecuta el flujo completo de checkout dentro de una transaccion atomica de base de datos.
   * Valida existencias, descuenta inventario, crea la orden con sus articulos y emite el evento 'order.created'.
   *
   * @param dto Informacion del cliente, direccion de entrega, tarifa de envio seleccionada y articulos
   * @returns Resumen de la orden creada con su numero identificador y monto total
   */
  async processCheckout(dto: CheckoutDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Checkout must contain at least one item.');
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch and validate variants and inventory
      const variantIds = dto.items.map((i) => i.variantId);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds }, isActive: true },
        include: { product: true },
      });

      if (variants.length !== variantIds.length) {
        throw new BadRequestException('One or more selected product variants are invalid or unavailable.');
      }

      let subtotal = 0;
      const orderItemsData = [];

      for (const item of dto.items) {
        const variant = variants.find((v) => v.id === item.variantId);
        if (!variant) continue;

        if (variant.inventoryQuantity < item.quantity) {
          throw new BadRequestException(`Insufficient stock for product variant: ${variant.title}`);
        }

        // Deduct inventory
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { inventoryQuantity: { decrement: item.quantity } },
        });

        const unitPrice = Number(variant.price);
        const itemSubtotal = unitPrice * item.quantity;
        subtotal += itemSubtotal;

        orderItemsData.push({
          variantId: variant.id,
          sku: variant.sku,
          title: `${variant.product.title} - ${variant.title}`,
          quantity: item.quantity,
          unitPrice,
          subtotal: itemSubtotal,
          weightGrams: variant.weightGrams * item.quantity,
        });
      }

      const shippingFee = Number(dto.selectedShippingRate.rateAmount);
      const taxTotal = 0; // Configurable tax computation
      const totalAmount = subtotal + shippingFee + taxTotal;

      // 2. Create Order
      const order = await tx.order.create({
        data: {
          tenantId: dto.tenantId,
          orderNumber,
          customerEmail: dto.customerEmail,
          customerPhone: dto.customerPhone,
          shippingAddress: dto.shippingAddress as object,
          billingAddress: (dto.billingAddress || dto.shippingAddress) as object,
          currency: dto.selectedShippingRate.currency,
          subtotal,
          shippingFee,
          taxTotal,
          totalAmount,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          fulfillmentStatus: FulfillmentStatus.UNFULFILLED,
          notes: dto.notes,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      this.eventEmitter.emit('order.created', order);

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        currency: order.currency,
        status: order.status,
      };
    });
  }
}
