/**
 * @fileoverview payment.controller.ts
 * Controlador HTTP para confirmación de pagos, sesiones de Stripe Checkout y webhooks.
 * Procesa la liquidación de transacciones y dispara el flujo logístico automático.
 */

import { Controller, Post, Body, Headers, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentService, ConfirmPaymentDto } from './payment.service';

/**
 * Controlador de confirmación de pagos y pasarela Stripe.
 */
@Controller('ecommerce/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Genera una sesión de Stripe Checkout para pagar una orden de compra.
   */
  @Post('stripe/checkout-session')
  @HttpCode(HttpStatus.OK)
  async createStripeCheckoutSession(@Body('orderId') orderId: string) {
    return this.paymentService.createStripeCheckoutSession(orderId);
  }

  /**
   * Endpoint receptor de Webhooks de Stripe.
   */
  @Post('stripe/webhook')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: any,
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody = req.rawBody || req.body;
    return this.paymentService.handleStripeWebhook(rawBody, signature);
  }

  /**
   * Confirma el pago de una orden (simulado o manual) y activa el despacho logístico.
   */
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentService.confirmPayment(dto);
  }
}
