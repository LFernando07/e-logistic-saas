import { Controller, Post, Body } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutDto } from './dto/checkout.dto';

@Controller('ecommerce/checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  async checkout(@Body() dto: CheckoutDto) {
    return this.checkoutService.processCheckout(dto);
  }
}
