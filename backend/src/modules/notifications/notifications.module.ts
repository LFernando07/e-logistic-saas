import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Modulo global de notificaciones y correos transaccionales con Resend.
 */
@Global()
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class NotificationsModule {}
