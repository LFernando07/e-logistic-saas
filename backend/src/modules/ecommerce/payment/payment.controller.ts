/**
 * @fileoverview payment.controller.ts
 * Controlador HTTP para confirmacion de pagos y webhooks de pasarelas de pago.
 * Procesa la liquidacion de transacciones y dispara el flujo logistico automatico.
 */

import { Controller, Post, Body } from '@nestjs/common';
import { PaymentService, ConfirmPaymentDto } from './payment.service';

/**
 * Controlador de confirmacion de pagos de e-commerce.
 */
@Controller('ecommerce/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Confirma el pago de una orden y activa el despacho logistico automatico.
   *
   * @param dto Datos del pago (orderId, proveedor, transaccion)
   * @returns Resumen de la orden pagada y confirmacion
   */
  @Post('confirm')
  async confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentService.confirmPayment(dto);
  }
}
