import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../database/prisma.service';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async confirmPayment(dto: ConfirmPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
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

    // Emit event: triggers automated logistics dispatch
    this.eventEmitter.emit('order.paid', result.updatedOrder);

    return {
      success: true,
      orderId: result.updatedOrder.id,
      paymentId: result.payment.id,
      transactionId: result.payment.transactionId,
      status: result.updatedOrder.paymentStatus,
    };
  }
}
