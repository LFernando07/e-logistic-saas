/**
 * @fileoverview RateService
 * Servicio de cotizacion agregada y comparacion de tarifas de envio.
 * Itera sobre todos los transportistas soportados en paralelo, recolecta tarifas normalizadas
 * y las retorna ordenadas de menor a mayor precio para optimizar la toma de decisiones.
 */

import { Injectable, Logger } from '@nestjs/common';
import { CarrierService } from '../carrier/carrier.service';
import { RateQueryDto, NormalizedRate } from '../carrier/interfaces/carrier-adapter.interface';
import { PrismaService } from '../../../database/prisma.service';

/**
 * Servicio de calculo y agregacion de tarifas de envio multi-carrier.
 */
@Injectable()
export class RateService {
  private readonly logger = new Logger(RateService.name);

  constructor(
    private readonly carrierService: CarrierService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Consulta las tarifas en tiempo real de todos los carriers registrados de forma concurrente.
   * Filtra fallos individuales para no bloquear la respuesta general y ordena por precio ascendente.
   *
   * @param query Parametros de cotizacion (codigo postal origen, destino, peso, dimensiones)
   * @returns Lista de tarifas normalizadas ordenadas de menor a mayor costo
   */
  async calculateRates(query: RateQueryDto): Promise<NormalizedRate[]> {
    const supportedCarriers = this.carrierService.getSupportedCarriers();
    const ratePromises = supportedCarriers.map(async (carrierCode) => {
      try {
        const adapter = this.carrierService.getAdapter(carrierCode);
        return await adapter.getRates(query);
      } catch (error) {
        this.logger.warn(`Failed fetching rates from ${carrierCode}: ${(error as Error).message}`);
        return [];
      }
    });

    const results = await Promise.all(ratePromises);
    const flattenedRates = results.flat();

    // Sort by lowest price first
    return flattenedRates.sort((a, b) => a.rateAmount - b.rateAmount);
  }
}
