import { Injectable, Logger } from '@nestjs/common';
import { CarrierService } from '../carrier/carrier.service';
import { RateQueryDto, NormalizedRate } from '../carrier/interfaces/carrier-adapter.interface';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RateService {
  private readonly logger = new Logger(RateService.name);

  constructor(
    private readonly carrierService: CarrierService,
    private readonly prisma: PrismaService,
  ) {}

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
