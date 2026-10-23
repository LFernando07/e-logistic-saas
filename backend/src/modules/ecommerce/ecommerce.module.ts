import { Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module';
import { OrderModule } from './order/order.module';
import { CheckoutModule } from './checkout/checkout.module';
import { PaymentModule } from './payment/payment.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [CatalogModule, OrderModule, CheckoutModule, PaymentModule, CartModule],
  exports: [CatalogModule, OrderModule, CheckoutModule, PaymentModule, CartModule],
})
export class EcommerceModule {}
