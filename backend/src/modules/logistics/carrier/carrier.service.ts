import { Injectable, NotFoundException } from '@nestjs/common';
import { CarrierCode } from '@prisma/client';
import { CarrierAdapter } from './interfaces/carrier-adapter.interface';
import { MockCarrierAdapter } from './adapters/mock-carrier.adapter';

@Injectable()
export class CarrierService {
  private readonly adapters = new Map<CarrierCode, CarrierAdapter>();

  constructor(private readonly mockAdapter: MockCarrierAdapter) {
    this.registerAdapter(mockAdapter);
  }

  public registerAdapter(adapter: CarrierAdapter): void {
    this.adapters.set(adapter.carrierCode, adapter);
  }

  public getAdapter(carrierCode: CarrierCode): CarrierAdapter {
    const adapter = this.adapters.get(carrierCode);
    if (!adapter) {
      throw new NotFoundException(`Carrier adapter for ${carrierCode} is not registered or supported.`);
    }
    return adapter;
  }

  public getSupportedCarriers(): CarrierCode[] {
    return Array.from(this.adapters.keys());
  }
}
