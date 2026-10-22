export const QUEUES = {
  CARRIER_WEBHOOKS: 'carrier-webhooks',
  LABEL_GENERATION: 'label-generation',
  NOTIFICATIONS: 'notifications',
  DEAD_LETTER: 'dead-letter-queue',
} as const;

export const JOB_NAMES = {
  PROCESS_CARRIER_WEBHOOK: 'process-carrier-webhook',
  GENERATE_SHIPPING_LABEL: 'generate-shipping-label',
  DISPATCH_NOTIFICATION: 'dispatch-notification',
  HANDLE_FAILED_JOB: 'handle-failed-job',
} as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential' as const,
    delay: 2000, // 2s, 4s, 8s, 16s, 32s
  },
  removeOnComplete: {
    age: 86400, // keep completed jobs for 24 hours
    count: 1000,
  },
  removeOnFail: {
    age: 604800, // keep failed jobs for 7 days
  },
};
