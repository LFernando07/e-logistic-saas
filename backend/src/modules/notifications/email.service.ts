/**
 * @fileoverview email.service.ts
 * Servicio de envío de correos electrónicos transaccionales utilizando la API de Resend.
 * Soporta modo sandbox, logging estructurado, y plantillas HTML para:
 * - Recibos de confirmación de compra y guía asignada.
 * - Correos de bienvenida tras registro.
 * - Notificaciones de recuperación de carritos abandonados con cupón.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  getOrderReceiptHtml,
  OrderReceiptParams,
} from './templates/order-receipt.template';
import {
  getWelcomeEmailHtml,
  WelcomeEmailParams,
} from './templates/welcome.template';
import {
  getAbandonedCartHtml,
  AbandonedCartParams,
} from './templates/abandoned-cart.template';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'Nova Logistics <onboarding@resend.dev>';

    if (apiKey && apiKey.startsWith('re_')) {
      this.resend = new Resend(apiKey);
      this.logger.log('Resend email client initialized successfully.');
    } else {
      this.logger.warn('RESEND_API_KEY is not configured or invalid. Emails will be logged to console in mock mode.');
    }
  }

  /**
   * Indica si la clave de Resend está presente y activa.
   */
  isConfigured(): boolean {
    return this.resend !== null;
  }

  /**
   * Envía correo de confirmación de compra y recibo detallado con datos de envío.
   *
   * @param params Parámetros de la orden, cliente, artículos y guía de transporte
   */
  async sendOrderReceiptEmail(params: OrderReceiptParams): Promise<{ success: boolean; id?: string }> {
    const { customerEmail, orderCode } = params;

    if (!customerEmail || !customerEmail.includes('@')) {
      this.logger.warn(`Invalid or empty recipient email: ${customerEmail}`);
      return { success: false };
    }

    const html = getOrderReceiptHtml(params);

    if (!this.resend) {
      this.logger.log(`[MOCK EMAIL: Order Receipt] To: ${customerEmail} | Order: ${orderCode} | Total: $${params.totalAmount}`);
      return { success: true, id: `mock-${Date.now()}` };
    }

    try {
      // In Resend trial sandbox, if sending fails because domain is unverified, fallback to trial verified email or log
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [customerEmail],
        subject: `Confirmación de Pedido #${orderCode} - Nova Logistics`,
        html,
      });

      if (error) {
        this.logger.error(`Resend API Error sending order receipt to ${customerEmail}: ${error.message}`);
        return { success: false };
      }

      this.logger.log(`Order receipt email successfully sent to ${customerEmail}. ID: ${data?.id}`);
      return { success: true, id: data?.id };
    } catch (err: any) {
      this.logger.error(`Exception sending order receipt via Resend: ${err.message}`, err.stack);
      return { success: false };
    }
  }

  /**
   * Envía correo de bienvenida tras registro exitoso de usuario.
   *
   * @param params Parámetros del nuevo usuario registrado
   */
  async sendWelcomeEmail(params: WelcomeEmailParams): Promise<{ success: boolean; id?: string }> {
    const { email, name } = params;

    if (!email || !email.includes('@')) {
      return { success: false };
    }

    const html = getWelcomeEmailHtml(params);

    if (!this.resend) {
      this.logger.log(`[MOCK EMAIL: Welcome] To: ${email} | Name: ${name}`);
      return { success: true, id: `mock-welcome-${Date.now()}` };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: '¡Bienvenido a Nova Logistics SaaS!',
        html,
      });

      if (error) {
        this.logger.error(`Resend API Error sending welcome email to ${email}: ${error.message}`);
        return { success: false };
      }

      this.logger.log(`Welcome email successfully sent to ${email}. ID: ${data?.id}`);
      return { success: true, id: data?.id };
    } catch (err: any) {
      this.logger.error(`Exception sending welcome email via Resend: ${err.message}`, err.stack);
      return { success: false };
    }
  }

  /**
   * Envía correo de recuperación de carrito abandonado.
   *
   * @param to Dirección de correo del cliente
   * @param params Artículos, importe, enlace de recuperación y código de descuento
   */
  async sendAbandonedCartEmail(
    to: string,
    params: AbandonedCartParams,
  ): Promise<{ success: boolean; id?: string }> {
    if (!to || !to.includes('@')) {
      return { success: false };
    }

    const html = getAbandonedCartHtml(params);

    if (!this.resend) {
      this.logger.log(`[MOCK EMAIL: Abandoned Cart] To: ${to} | Recovery URL: ${params.recoveryUrl}`);
      return { success: true, id: `mock-cart-${Date.now()}` };
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject: '¡Tus artículos te están esperando! - Nova Logistics Store',
        html,
      });

      if (error) {
        this.logger.error(`Resend API Error sending abandoned cart email to ${to}: ${error.message}`);
        return { success: false };
      }

      this.logger.log(`Abandoned cart email successfully sent to ${to}. ID: ${data?.id}`);
      return { success: true, id: data?.id };
    } catch (err: any) {
      this.logger.error(`Exception sending abandoned cart email: ${err.message}`, err.stack);
      return { success: false };
    }
  }
}
