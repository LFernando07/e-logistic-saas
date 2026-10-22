import { Module } from '@nestjs/common';
import { CarrierService } from './carrier.service';
import { MockCarrierAdapter } from './adapters/mock-carrier.adapter';

@Module({
  providers: [CarrierService, MockCarrierAdapter],
  exports: [CarrierService, MockCarrierAdapter],
})
export class CarrierModule {}
