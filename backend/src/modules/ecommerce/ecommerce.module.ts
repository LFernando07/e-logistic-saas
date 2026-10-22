import { Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { OrderModule } from './order/order.module';
import { CheckoutModule } from './checkout/checkout.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [CatalogModule, OrderModule, CheckoutModule, PaymentModule],
  exports: [CatalogModule, OrderModule, CheckoutModule, PaymentModule],
})
export class EcommerceModule {}
