import { Controller, Post, Body } from '@nestjs/common';
import { PaymentService, ConfirmPaymentDto } from './payment.service';

@Controller('ecommerce/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('confirm')
  async confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentService.confirmPayment(dto);
  }
}
