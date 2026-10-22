import { Controller, Post, Body } from '@nestjs/common';
import { RateService } from './rate.service';
import { RateQueryDto } from '../carrier/interfaces/carrier-adapter.interface';

@Controller('logistics/rates')
export class RateController {
  constructor(private readonly rateService: RateService) {}

  @Post()
  async getRates(@Body() query: RateQueryDto) {
    return this.rateService.calculateRates(query);
  }
}
