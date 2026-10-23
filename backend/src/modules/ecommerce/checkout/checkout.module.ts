/**
 * @fileoverview checkout.module.ts
 * Modulo que orquesta el controlador y servicio de Checkout.
 * Importa RateModule del dominio logistico para permitir calculo de tarifas en tiempo real.
 */

import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { RateModule } from '../../logistics/rate/rate.module';

/**
 * Modulo de Checkout del e-commerce.
 */
@Module({
  imports: [RateModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
