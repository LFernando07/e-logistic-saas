import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env natively
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let value = trimmed.substring(idx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  });
}

async function verifyConnections() {
  console.log('--- VERIFICANDO CONEXIONES ---');

  // 1. Verificar Redis (Upstash)
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;
  const redisPassword = process.env.REDIS_PASSWORD;
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

  console.log('1. Probando conexion con Redis (Upstash)...');
  let redis: Redis | null = null;
  try {
    if (redisUrl) {
      redis = new Redis(redisUrl, {
        tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 7000,
        maxRetriesPerRequest: 1,
      });
    } else if (redisHost) {
      redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        tls: redisHost.includes('upstash.io') ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 7000,
        maxRetriesPerRequest: 1,
      });
    } else {
      throw new Error('No se encontro REDIS_URL ni REDIS_HOST en .env');
    }

    const pong = await redis.ping();
    console.log(`   [OK] Redis respondio exitosamente: ${pong}`);
  } catch (error) {
    console.log(`   [ERROR] Fallo conexion con Redis: ${(error as Error).message}`);
  } finally {
    if (redis) {
      redis.disconnect();
    }
  }

  // 2. Verificar PostgreSQL (Supabase / Prisma)
  console.log('2. Probando conexion con PostgreSQL en Supabase via Prisma...');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT current_database(), current_schema(), now();`;
    console.log('   [OK] PostgreSQL conectado exitosamente.', result);
  } catch (error) {
    console.log(`   [ERROR] Fallo conexion con PostgreSQL: ${(error as Error).message}`);
  } finally {
    await prisma.$disconnect();
  }

  // 3. Verificar Supabase API y Storage
  console.log('3. Probando conexion con Supabase API & Storage...');
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.log('   [ADVERTENCIA] SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no estan configurados en .env');
  } else {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) {
        throw error;
      }
      console.log(`   [OK] Supabase Storage respondio exitosamente. Buckets encontrados: ${buckets.length}`);
      if (buckets.length > 0) {
        console.log(`        Nombres de buckets: ${buckets.map((b) => b.name).join(', ')}`);
      }
    } catch (error) {
      console.log(`   [ERROR] Fallo conexion con Supabase Storage: ${(error as Error).message}`);
    }
  }

  console.log('------------------------------');
}

verifyConnections().catch(console.error);
