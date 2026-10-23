/**
 * @fileoverview checkout.controller.ts
 * Controlador HTTP para el flujo de Checkout y cotizacion de envios en tiempo real.
 * Expone endpoints REST para cotizar tarifas de paqueteria para el carrito
 * y para procesar la orden con descuento atomico de inventario.
 */

import { Controller, Post, Body } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutDto, CalculateShippingRatesDto } from './dto/checkout.dto';

/**
 * Controlador de Checkout del e-commerce.
 */
@Controller('ecommerce/checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  /**
   * Endpoint para cotizar tarifas de paqueteria en tiempo real antes de finalizar la compra.
   */
  @Post('rates')
  async calculateRates(@Body() dto: CalculateShippingRatesDto) {
    return this.checkoutService.calculateCartShippingRates(dto);
  }

  /**
   * Endpoint para confirmar la orden de compra y reservar inventario.
   */
  @Post()
  async checkout(@Body() dto: CheckoutDto) {
    return this.checkoutService.processCheckout(dto);
  }
}
