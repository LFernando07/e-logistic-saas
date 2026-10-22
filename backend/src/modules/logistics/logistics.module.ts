import { Module } from '@nestjs/common';
import { CarrierModule } from './carrier/carrier.module';
import { TrackingModule } from './tracking/tracking.module';
import { ShipmentModule } from './shipment/shipment.module';
import { RateModule } from './rate/rate.module';
import { OrderPaidListener } from './listeners/order-paid.listener';

@Module({
  imports: [CarrierModule, TrackingModule, ShipmentModule, RateModule],
  providers: [OrderPaidListener],
  exports: [CarrierModule, TrackingModule, ShipmentModule, RateModule],
})
export class LogisticsModule {}
