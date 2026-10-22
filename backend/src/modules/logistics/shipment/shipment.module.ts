import { Module } from '@nestjs/common';
import { ShipmentController } from './shipment.controller';
import { ShipmentService } from './shipment.service';
import { CarrierModule } from '../carrier/carrier.module';
import { QueuesModule } from '../../queues/queues.module';

@Module({
  imports: [CarrierModule, QueuesModule],
  controllers: [ShipmentController],
  providers: [ShipmentService],
  exports: [ShipmentService],
})
export class ShipmentModule {}
