export interface DeadLetterJobPayload {
  originalQueue: string;
  originalJobId?: string;
  originalJobName: string;
  payload: unknown;
  failedReason: string;
  stackTrace?: string;
  attemptsMade: number;
  failedAt: string;
}
