/**
 * @fileoverview carrier.module.ts
 * Modulo que agrupa la configuracion y adaptadores del dominio de transportistas.
 * Exporta CarrierService para proveer resolucion polimorfica de paqueterias.
 */

import { Module } from '@nestjs/common';
import { CarrierService } from './carrier.service';
import { MockCarrierAdapter } from './adapters/mock-carrier.adapter';
import { SkydropxAdapter } from './adapters/skydropx.adapter';

/**
 * Modulo de gestion y adaptadores de paqueteria.
 */
@Module({
  providers: [CarrierService, MockCarrierAdapter, SkydropxAdapter],
  exports: [CarrierService, MockCarrierAdapter, SkydropxAdapter],
})
export class CarrierModule {}
