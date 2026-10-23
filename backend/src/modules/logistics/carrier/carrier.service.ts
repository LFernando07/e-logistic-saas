/**
 * @fileoverview CarrierService
 * Servicio central del patron Strategy para la resolucion dinamica de adaptadores de paqueteria.
 * Mantiene un registro interno de adaptadores (`CarrierAdapter`) indexados por `CarrierCode`
 * permitiendo cotizar, generar guias y rastrear de forma polimorfica sin acoplamiento a transportistas concretos.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { CarrierCode } from '@prisma/client';
import { CarrierAdapter } from './interfaces/carrier-adapter.interface';
import { MockCarrierAdapter } from './adapters/mock-carrier.adapter';
import { SkydropxAdapter } from './adapters/skydropx.adapter';

/**
 * Gestor y resolutor de estrategias de paqueterias integradas.
 */
@Injectable()
export class CarrierService {
  private readonly adapters = new Map<CarrierCode, CarrierAdapter>();

  constructor(
    private readonly mockAdapter: MockCarrierAdapter,
    private readonly skydropxAdapter: SkydropxAdapter,
  ) {
    this.registerAdapter(mockAdapter);
    this.registerAdapter(skydropxAdapter);
  }

  /**
   * Registra un adaptador de transportista en el mapa de estrategias.
   *
   * @param adapter Instancia que implementa la interfaz CarrierAdapter
   */
  public registerAdapter(adapter: CarrierAdapter): void {
    this.adapters.set(adapter.carrierCode, adapter);
  }

  /**
   * Obtiene la instancia del adaptador correspondiente al transportista solicitado.
   * Lanza NotFoundException si el transportista no esta soportado o registrado.
   *
   * @param carrierCode Codigo enum del transportista (ej. CarrierCode.MOCK, CarrierCode.FEDEX)
   * @returns Adaptador correspondiente
   */
  public getAdapter(carrierCode: CarrierCode): CarrierAdapter {
    const adapter = this.adapters.get(carrierCode);
    if (!adapter) {
      throw new NotFoundException(`Carrier adapter for ${carrierCode} is not registered or supported.`);
    }
    return adapter;
  }

  /**
   * Retorna el listado de codigos de transportistas actualmente disponibles en el sistema.
   *
   * @returns Arreglo de CarrierCode soportados
   */
  public getSupportedCarriers(): CarrierCode[] {
    return Array.from(this.adapters.keys());
  }
}
