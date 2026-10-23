import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { CartService, RecordAbandonedCartDto } from './cart.service';

/**
 * Controlador de Carritos Abandonados y Recuperación.
 */
@Controller('ecommerce/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post('abandoned')
  @HttpCode(HttpStatus.OK)
  async recordAbandonedCart(@Body() dto: RecordAbandonedCartDto) {
    return this.cartService.recordAbandonedCart(dto);
  }

  @Get('recover/:token')
  async recoverCart(@Param('token') token: string) {
    return this.cartService.recoverCart(token);
  }
}
