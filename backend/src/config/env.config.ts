export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  DIRECT_URL?: string;
  REDIS_URL?: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  WEBHOOK_SECRET_DEFAULT?: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL: string;
  SENTRY_DSN?: string;
  FRONTEND_URL: string;
}

export const configuration = (): EnvironmentVariables => ({
  NODE_ENV: (process.env.NODE_ENV as EnvironmentVariables['NODE_ENV']) || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/elogistics?schema=store',
  DIRECT_URL: process.env.DIRECT_URL || undefined,
  REDIS_URL: process.env.REDIS_URL || undefined,
  REDIS_HOST: process.env.REDIS_HOST || 'capable-sheep-210678.upstash.io',
  REDIS_PORT: parseInt(process.env.REDIS_PORT || String(process.env.UPSTASH_REDIS_PORT || '6379'), 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
  WEBHOOK_SECRET_DEFAULT: process.env.WEBHOOK_SECRET_DEFAULT || 'dev_secret_key_123',
  JWT_SECRET: process.env.JWT_SECRET || 'jwt_secret_nova_logistics_saas_2026',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || undefined,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || undefined,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || undefined,
  RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'Nova Logistics <onboarding@resend.dev>',
  SENTRY_DSN: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || undefined,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3001',
});
