export type NotificationChannel = 'EMAIL' | 'WEBHOOK' | 'SMS';

export interface NotificationJobPayload {
  notificationId: string;
  tenantId: string;
  channel: NotificationChannel;
  recipient: string;
  eventType: 'SHIPMENT_CREATED' | 'TRACKING_UPDATE' | 'DELIVERED' | 'EXCEPTION';
  data: Record<string, unknown>;
  queuedAt: string;
}
