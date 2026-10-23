/**
 * @fileoverview PaymentService
 * Servicio de procesamiento y confirmación de pagos para órdenes de compra.
 * Integra Stripe Checkout (modo Sandbox/Producción) con sesiones y webhooks criptográficos,
 * actualiza el estado de la orden a 'PAID' y 'PROCESSING', emite el evento 'order.paid' para
 * activar la generación logística del envío, y envía el correo de confirmación de compra con Resend.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../notifications/email.service';
import { PaymentProvider, PaymentStatus, OrderStatus } from '@prisma/client';

export interface ConfirmPaymentDto {
  orderId: string;
  provider: PaymentProvider;
  transactionId?: string;
  rawResponse?: Record<string, unknown>;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly stripe: Stripe | null = null;
  private readonly webhookSecret?: string;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

    if (stripeKey && stripeKey.startsWith('sk_')) {
      this.stripe = new Stripe(stripeKey, {
        typescript: true,
        appInfo: {
          name: 'Nova Logistics SaaS',
          version: '1.0.0',
        },
      });
      this.logger.log('Stripe SDK initialized successfully.');
    } else {
      this.logger.warn('STRIPE_SECRET_KEY is not configured or invalid. Stripe checkout will operate in simulated mode.');
    }
  }

  /**
   * Crea una sesión de Stripe Checkout para pagar una orden de compra existente.
   *
   * @param orderId Identificador UUID de la orden
   * @returns URL de redirección a la pasarela segura de Stripe
   */
  async createStripeCheckoutSession(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        tenant: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} was not found.`);
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException(`Order ${order.orderNumber} is already paid.`);
    }

    // Modo simulado si Stripe no tiene clave válida
    if (!this.stripe) {
      this.logger.log(`[SIMULATED STRIPE] Simulating session for order ${order.orderNumber}`);
      return {
        simulated: true,
        sessionId: `sim_session_${Date.now()}`,
        url: `${this.frontendUrl}/store?payment_success=true&order_id=${order.id}`,
      };
    }

    // Mapear artículos de la orden a line items de Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
      price_data: {
        currency: order.currency.toLowerCase(),
        product_data: {
          name: item.title,
        },
        unit_amount: Math.round(Number(item.unitPrice) * 100),
      },
      quantity: item.quantity,
    }));

    // Agregar tarifa de envío como concepto separado si es mayor a 0
    if (Number(order.shippingFee) > 0) {
      lineItems.push({
        price_data: {
          currency: order.currency.toLowerCase(),
          product_data: {
            name: 'Servicio de Paquetería y Envío',
          },
          unit_amount: Math.round(Number(order.shippingFee) * 100),
        },
        quantity: 1,
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: 'payment',
      customer_email: order.customerEmail,
      success_url: `${this.frontendUrl}/store?payment_success=true&order_id=${order.id}`,
      cancel_url: `${this.frontendUrl}/store?payment_canceled=true&order_id=${order.id}`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        tenantId: order.tenantId,
        customerEmail: order.customerEmail,
      },
    });

    this.logger.log(`Stripe Checkout Session created: ${session.id} for order ${order.orderNumber}`);

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Procesa eventos entrantes del webhook de Stripe con verificación de firma HMAC.
   *
   * @param rawBody Contenido crudo de la petición HTTP
   * @param signature Encabezado 'stripe-signature'
   */
  async handleStripeWebhook(rawBody: string | Buffer, signature?: string) {
    let event: Stripe.Event;

    if (this.stripe && this.webhookSecret && signature) {
      try {
        event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
      } catch (err: any) {
        this.logger.error(`Stripe Webhook signature verification failed: ${err.message}`);
        throw new BadRequestException(`Webhook Error: ${err.message}`);
      }
    } else {
      // Fallback si no hay firma configurada aún en desarrollo
      event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf-8'));
      this.logger.warn('Stripe Webhook processed without cryptographic signature verification.');
    }

    this.logger.log(`Received Stripe Webhook Event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          await this.confirmPayment({
            orderId,
            provider: PaymentProvider.STRIPE,
            transactionId: session.payment_intent ? String(session.payment_intent) : session.id,
            rawResponse: session as any,
          });
        }
        break;
      }

      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Confirma el pago de una orden de forma atómica en base de datos.
   * Crea el registro en Payment, cambia el estado de la orden a PAID, dispara 'order.paid'
   * y envía el recibo por correo electrónico vía Resend.
   *
   * @param dto Datos del pago (orderId, pasarela/proveedor, transacción externa)
   */
  async confirmPayment(dto: ConfirmPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        items: true,
        tenant: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} was not found.`);
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException(`Order ${order.orderNumber} is already paid.`);
    }

    const transactionId = dto.transactionId || `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          tenantId: order.tenantId,
          provider: dto.provider,
          transactionId,
          amount: order.totalAmount,
          currency: order.currency,
          status: PaymentStatus.PAID,
          rawResponse: (dto.rawResponse || { simulated: true }) as object,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.PROCESSING,
        },
        include: { items: true },
      });

      return { payment, updatedOrder };
    });

    this.logger.log(`Order ${order.orderNumber} marked as PAID. Emitting order.paid event.`);

    // 1. Emitir evento: activa de forma reactiva la generación logística y de etiqueta
    this.eventEmitter.emit('order.paid', result.updatedOrder);

    // 2. Enviar correo de recibo de compra con Resend en segundo plano
    const shippingAddress = (order.shippingAddress as Record<string, any>) || {};
    const addressStr = `${shippingAddress.street || ''}, ${shippingAddress.city || ''}, ${shippingAddress.state || ''} C.P. ${shippingAddress.postalCode || ''}`;
    const trackingUrl = `${this.frontendUrl}/track/${order.orderNumber}`;

    this.emailService
      .sendOrderReceiptEmail({
        orderCode: order.orderNumber,
        customerName: shippingAddress.recipientName || 'Cliente',
        customerEmail: order.customerEmail,
        shippingAddress: addressStr,
        carrierName: 'Nova Express Logistics',
        totalAmount: Number(order.totalAmount),
        paymentMethod: dto.provider === PaymentProvider.STRIPE ? 'Stripe Checkout (Tarjeta)' : 'Pago Simulado',
        items: order.items.map((i) => ({
          name: i.title,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
        })),
        trackingUrl,
      })
      .catch((err) => {
        this.logger.error(`Failed to send order receipt email for ${order.orderNumber}: ${err.message}`);
      });

    return {
      success: true,
      orderId: result.updatedOrder.id,
      paymentId: result.payment.id,
      transactionId: result.payment.transactionId,
      status: result.updatedOrder.paymentStatus,
    };
  }
}
