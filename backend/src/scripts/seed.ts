/**
 * @fileoverview seed.ts
 * Script para sembrar datos iniciales de prueba en la base de datos PostgreSQL de Supabase.
 * Crea un comercio/tenant de demostracion con configuracion de branding, cuentas de transportistas,
 * productos de prueba con variantes, existencias y pesos para probar el flujo de checkout y logistica.
 */

import { PrismaClient, UserRole, CarrierCode } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Cargar variables de entorno de .env
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

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO SEED DE BASE DE DATOS ---');

  // 1. Crear o actualizar Tenant de demostracion
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'nova-store' },
    update: {},
    create: {
      slug: 'nova-store',
      name: 'Nova Logistics Store',
      domain: 'novastore.local',
      brandingSettings: {
        storeName: 'Nova Logistics Store',
        logoUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
        primaryColor: '#0284c7',
        accentColor: '#0369a1',
        tagline: 'Equipamiento deportivo premium con envios express',
      },
    },
  });
  console.log(`[OK] Tenant creado/asegurado: ${tenant.name} (ID: ${tenant.id})`);

  // 2. Crear usuario Merchant administrador del tenant
  const merchantUser = await prisma.user.upsert({
    where: { email: 'merchant@novastore.com' },
    update: {},
    create: {
      email: 'merchant@novastore.com',
      passwordHash: 'argon2_or_bcrypt_hash_simulated_demo',
      firstName: 'Carlos',
      lastName: 'Montemayor',
      role: UserRole.MERCHANT,
      tenantId: tenant.id,
    },
  });
  console.log(`[OK] Usuario Merchant creado: ${merchantUser.email}`);

  // 3. Crear CarrierAccounts para MOCK y SKYDROPX
  await prisma.carrierAccount.upsert({
    where: { id: 'carrier-acc-mock-1' },
    update: {},
    create: {
      id: 'carrier-acc-mock-1',
      tenantId: tenant.id,
      carrierCode: CarrierCode.MOCK,
      accountName: 'Mock Express Carrier Sandbox',
      credentialsEncrypted: { apiKey: 'mock_sandbox_key_123' },
      isSandbox: true,
      isActive: true,
    },
  });

  await prisma.carrierAccount.upsert({
    where: { id: 'carrier-acc-skydropx-1' },
    update: {},
    create: {
      id: 'carrier-acc-skydropx-1',
      tenantId: tenant.id,
      carrierCode: CarrierCode.SKYDROPX,
      accountName: 'Skydropx Multi-Carrier Cuenta Principal',
      credentialsEncrypted: { apiKey: 'skx_sandbox_token_abc' },
      isSandbox: true,
      isActive: true,
    },
  });
  console.log('[OK] Cuentas de transportista configuradas para el tenant.');

  // 4. Crear Productos y Variantes
  const productA = await prisma.product.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: 'tenis-running-stealth-pro',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      title: 'Zapatillas Running Stealth Pro',
      slug: 'tenis-running-stealth-pro',
      description: 'Zapatillas deportivas ultraligeras con amortiguacion reactiva y suela antideslizante.',
      category: 'Calzado',
      isActive: true,
      variants: {
        create: [
          {
            sku: 'RUN-BLK-40',
            title: 'Negro Mate / Talla 40',
            price: 89.99,
            compareAtPrice: 119.99,
            inventoryQuantity: 45,
            weightGrams: 800,
            lengthCm: 32,
            widthCm: 22,
            heightCm: 12,
            isActive: true,
          },
          {
            sku: 'RUN-BLK-42',
            title: 'Negro Mate / Talla 42',
            price: 89.99,
            compareAtPrice: 119.99,
            inventoryQuantity: 30,
            weightGrams: 850,
            lengthCm: 32,
            widthCm: 22,
            heightCm: 12,
            isActive: true,
          },
        ],
      },
    },
  });

  const productB = await prisma.product.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: 'mochila-urbana-impermeable',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      title: 'Mochila Urbana Impermeable 25L',
      slug: 'mochila-urbana-impermeable',
      description: 'Mochila ergonomica con compartimento para laptop de 16 pulgadas y tela resistente al agua.',
      category: 'Accesorios',
      isActive: true,
      variants: {
        create: [
          {
            sku: 'BPK-GRY-25L',
            title: 'Gris Grafito / 25 Litros',
            price: 59.50,
            inventoryQuantity: 25,
            weightGrams: 1100,
            lengthCm: 45,
            widthCm: 30,
            heightCm: 15,
            isActive: true,
          },
        ],
      },
    },
  });

  const productC = await prisma.product.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: 'chaqueta-termica-cortavientos',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      title: 'Chaqueta Termica Cortavientos',
      slug: 'chaqueta-termica-cortavientos',
      description: 'Chaqueta para senderismo y entrenamiento con forro transpirable e impermeable.',
      category: 'Ropa',
      isActive: true,
      variants: {
        create: [
          {
            sku: 'JKT-NVY-M',
            title: 'Azul Marino / Mediana (M)',
            price: 119.00,
            inventoryQuantity: 20,
            weightGrams: 600,
            lengthCm: 35,
            widthCm: 25,
            heightCm: 5,
            isActive: true,
          },
        ],
      },
    },
  });

  console.log(`[OK] Productos creados con variantes:`);
  console.log(`     - ${productA.title}`);
  console.log(`     - ${productB.title}`);
  console.log(`     - ${productC.title}`);

  // 5. Crear Envios Demo con Eventos de Seguimiento (TRK-NOVA-001, TRK-NOVA-002, TRK-NOVA-003)
  const shipment1 = await prisma.shipment.upsert({
    where: { trackingNumber: 'TRK-NOVA-001' },
    update: {},
    create: {
      tenantId: tenant.id,
      carrierCode: CarrierCode.SKYDROPX,
      serviceCode: 'express',
      trackingNumber: 'TRK-NOVA-001',
      status: 'IN_TRANSIT',
      labelUrl: 'https://preview.storage.supabase.co/labels/demo-label.pdf',
      rateAmount: 185.0,
      currency: 'MXN',
      estimatedDeliveryAt: new Date(Date.now() + 3600 * 1000 * 48),
      originAddress: {
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '01000',
        country: 'MEX',
      },
      destinationAddress: {
        name: 'Carlos Mendoza',
        city: 'Guadalajara',
        state: 'Jalisco',
        postalCode: '44100',
        country: 'MEX',
      },
      packages: {
        create: [
          {
            weightKg: 1.5,
            lengthCm: 25,
            widthCm: 20,
            heightCm: 15,
            packageType: 'BOX',
          },
        ],
      },
      trackingEvents: {
        create: [
          {
            status: 'LABEL_CREATED',
            rawStatus: 'LABEL_GENERATED',
            description: 'Guía de transporte generada en el sistema.',
            location: 'Portal Nova Logistics',
            carrierCode: CarrierCode.SKYDROPX,
            eventTimestamp: new Date(Date.now() - 3600 * 1000 * 24),
          },
          {
            status: 'IN_TRANSIT',
            rawStatus: 'PICKED_UP',
            description: 'Paquete recolectado por transportista en almacén de origen.',
            location: 'Almacén Central Álvaro Obregón, CDMX',
            carrierCode: CarrierCode.SKYDROPX,
            eventTimestamp: new Date(Date.now() - 3600 * 1000 * 18),
          },
          {
            status: 'IN_TRANSIT',
            rawStatus: 'IN_TRANSIT',
            description: 'En tránsito hacia el centro de distribución metropolitano.',
            location: 'HUB Central CDMX, México',
            carrierCode: CarrierCode.SKYDROPX,
            eventTimestamp: new Date(Date.now() - 3600 * 1000 * 6),
          },
        ],
      },
    },
  });

  const shipment2 = await prisma.shipment.upsert({
    where: { trackingNumber: 'TRK-NOVA-002' },
    update: {},
    create: {
      tenantId: tenant.id,
      carrierCode: CarrierCode.FEDEX,
      serviceCode: 'standard',
      trackingNumber: 'TRK-NOVA-002',
      status: 'OUT_FOR_DELIVERY',
      rateAmount: 145.0,
      currency: 'MXN',
      estimatedDeliveryAt: new Date(Date.now() + 3600 * 1000 * 6),
      originAddress: {
        city: 'Ciudad de México',
        state: 'CDMX',
        postalCode: '01000',
        country: 'MEX',
      },
      destinationAddress: {
        name: 'Andrea Morales',
        city: 'Monterrey',
        state: 'Nuevo León',
        postalCode: '64000',
        country: 'MEX',
      },
      packages: {
        create: [
          {
            weightKg: 0.8,
            lengthCm: 34,
            widthCm: 22,
            heightCm: 12,
            packageType: 'BOX',
          },
        ],
      },
      trackingEvents: {
        create: [
          {
            status: 'LABEL_CREATED',
            rawStatus: 'LABEL_GENERATED',
            description: 'Etiqueta creada y lista para recolección.',
            location: 'CDMX',
            carrierCode: CarrierCode.FEDEX,
            eventTimestamp: new Date(Date.now() - 3600 * 1000 * 36),
          },
          {
            status: 'IN_TRANSIT',
            rawStatus: 'IN_TRANSIT',
            description: 'Arribo a estación de transferencia regional.',
            location: 'Monterrey HUB Norte',
            carrierCode: CarrierCode.FEDEX,
            eventTimestamp: new Date(Date.now() - 3600 * 1000 * 12),
          },
          {
            status: 'OUT_FOR_DELIVERY',
            rawStatus: 'OUT_FOR_DELIVERY',
            description: 'En unidad de reparto asignada para entrega hoy.',
            location: 'Ruta San Pedro Garza García',
            carrierCode: CarrierCode.FEDEX,
            eventTimestamp: new Date(Date.now() - 3600 * 1000 * 2),
          },
        ],
      },
    },
  });

  console.log(`[OK] Envíos demo creados con eventos de seguimiento:`);
  console.log(`     - ${shipment1.trackingNumber} (${shipment1.status})`);
  console.log(`     - ${shipment2.trackingNumber} (${shipment2.status})`);

  console.log('--- SEED COMPLETADO SATISFACTORIAMENTE ---');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
