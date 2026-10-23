/**
 * @fileoverview cart.service.ts
 * Servicio para gestión y sincronización de carritos abandonados.
 * Registra carritos con token único de recuperación y emite correos transaccionales con Resend.
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../notifications/email.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface AbandonedCartItemDto {
  name: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  image?: string;
}

export interface RecordAbandonedCartDto {
  tenantId: string;
  email: string;
  customerName?: string;
  items: AbandonedCartItemDto[];
  totalAmount: number;
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Guarda un carrito abandonado en la base de datos y envía el correo de recuperación.
   */
  async recordAbandonedCart(dto: RecordAbandonedCartDto) {
    const recoveryToken = crypto.randomBytes(16).toString('hex');
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const recoveryUrl = `${frontendUrl}/store?recover_cart=${recoveryToken}`;

    const abandonedCart = await this.prisma.abandonedCart.create({
      data: {
        tenantId: dto.tenantId,
        email: dto.email.trim().toLowerCase(),
        customerName: dto.customerName || 'Cliente',
        items: dto.items as any,
        totalAmount: dto.totalAmount,
        recoveryToken,
        emailSentAt: new Date(),
      },
    });

    this.logger.log(
      `Abandoned cart registered for ${dto.email}. Token: ${recoveryToken}. Total: $${dto.totalAmount}`,
    );

    // Send abandoned cart recovery email asynchronously via Resend
    this.emailService
      .sendAbandonedCartEmail(dto.email, {
        customerName: dto.customerName || 'Cliente',
        items: dto.items,
        totalAmount: dto.totalAmount,
        recoveryUrl,
        discountCode: 'NOVA10',
      })
      .catch((err) => {
        this.logger.error(`Error sending abandoned cart recovery email to ${dto.email}: ${err.message}`);
      });

    return {
      success: true,
      cartId: abandonedCart.id,
      recoveryToken,
      recoveryUrl,
      message: 'Carrito abandonado registrado y correo de recuperación encolado.',
    };
  }

  /**
   * Recupera el contenido de un carrito abandonado a través de su token único.
   */
  async recoverCart(recoveryToken: string) {
    const cart = await this.prisma.abandonedCart.findUnique({
      where: { recoveryToken },
    });

    if (!cart) {
      throw new NotFoundException('El enlace de recuperación es inválido o ha expirado.');
    }

    // Marcar como recuperado
    await this.prisma.abandonedCart.update({
      where: { id: cart.id },
      data: { isRecovered: true },
    });

    return {
      success: true,
      email: cart.email,
      customerName: cart.customerName,
      items: cart.items,
      totalAmount: cart.totalAmount,
    };
  }
}
