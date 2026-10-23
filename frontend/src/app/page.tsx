import Link from 'next/link';
import {
  Truck,
  Store,
  Layers,
  ShieldCheck,
  Zap,
  ArrowRight,
  Package,
  Activity,
  Boxes,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

/**
 * Landing Page for NovaLogistics SaaS platform.
 * Provides high-level system overview, architecture highlights, and portal navigation.
 */
export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/20 via-cyan-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-6">
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span>Fase 2: Frontend Portals en Next.js & Turbopack</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Logística Multitransportista &{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            E-Commerce Integrado
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Plataforma modular con arquitectura de doble esquema PostgreSQL (`store` + `logistics`),
          colas asíncronas con BullMQ, generación de guías PDF con Supabase Storage y rastreo
          post-compra en tiempo real.
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 transition-all hover:-translate-y-0.5"
          >
            <Truck className="w-4 h-4" />
            <span>Dashboard Logístico</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/store"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 transition-all hover:-translate-y-0.5"
          >
            <Store className="w-4 h-4 text-cyan-400" />
            <span>Tienda E-Commerce</span>
          </Link>

          <Link
            href="/track/TRK-NOVA-001"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-800 transition-all"
          >
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Rastrear Guía Demo</span>
          </Link>
        </div>
      </section>

      {/* Architecture Highlights Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-900">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white">Módulos de la Solución</h2>
          <p className="text-sm text-slate-400 mt-2">
            Desarrollado bajo principios de Clean Architecture y escalabilidad horizontal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Logistics Management */}
          <Card hoverEffect className="flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Carrier Strategy Pattern</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Integración unificada con Skydropx, FedEx, DHL y Estafeta. Cotización matricial de
                tarifas y generación de etiquetas PDF almacenadas en Supabase Storage.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Acceder a Envíos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Card 2: Post-Purchase Tracking */}
          <Card hoverEffect className="flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Post-Purchase Branded Tracking</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Experiencia para clientes finales con 4 hitos canónicos (Label Created &rarr; In Transit
                &rarr; Out for Delivery &rarr; Delivered), branding del comercio y simulador de webhooks.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <Link
                href="/track/TRK-NOVA-001"
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <span>Ver Rastreador en Vivo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>

          {/* Card 3: E-Commerce Storefront */}
          <Card hoverEffect className="flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <Boxes className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">E-Commerce & Reserva Atómica</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Catálogo multi-tenant con variantes de producto, cotización dinámica de flete según
                código postal y reserva transaccional de stock (`$transaction`).
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <Link
                href="/store"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <span>Explorar Catálogo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
