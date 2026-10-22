import { Module } from '@nestjs/common';
import { RateController } from './rate.controller';
import { RateService } from './rate.service';
import { CarrierModule } from '../carrier/carrier.module';

@Module({
  imports: [CarrierModule],
  controllers: [RateController],
  providers: [RateService],
  exports: [RateService],
})
export class RateModule {}
