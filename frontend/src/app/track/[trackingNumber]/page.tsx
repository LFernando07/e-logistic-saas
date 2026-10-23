'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MilestoneStepper } from '@/components/tracking/MilestoneStepper';
import { EventTimeline } from '@/components/tracking/EventTimeline';
import { WebhookSimulatorModal } from '@/components/tracking/WebhookSimulatorModal';
import { PublicTrackingResponse } from '@/types';
import { logisticsApi } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import {
  Package,
  Truck,
  MapPin,
  Calendar,
  Download,
  Activity,
  RefreshCw,
  Copy,
  Check,
  Building,
} from 'lucide-react';

// Fallback tracking model for instant visual testing
const FALLBACK_TRACKING: PublicTrackingResponse = {
  trackingNumber: 'TRK-NOVA-001',
  carrierCode: 'SKYDROPX',
  status: 'IN_TRANSIT',
  currentMilestone: 'IN_TRANSIT',
  progressPercent: 50,
  estimatedDeliveryDate: new Date(Date.now() + 3600 * 1000 * 48).toISOString(),
  originPostalCode: '01000',
  destinationPostalCode: '44100',
  merchant: {
    name: 'Nova Logistics Store',
    slug: 'nova-store',
    brandColor: '#4f46e5',
  },
  events: [
    {
      id: 'evt-3',
      shipmentId: 'shipment-1',
      status: 'IN_TRANSIT',
      description: 'En tránsito hacia el centro de distribución metropolitano.',
      location: 'HUB Central CDMX, México',
      timestamp: new Date(Date.now() - 3600 * 1000 * 6).toISOString(),
    },
    {
      id: 'evt-2',
      shipmentId: 'shipment-1',
      status: 'IN_TRANSIT',
      description: 'Paquete recolectado por transportista en almacén de origen.',
      location: 'Almacén Central Álvaro Obregón, CDMX',
      timestamp: new Date(Date.now() - 3600 * 1000 * 18).toISOString(),
    },
    {
      id: 'evt-1',
      shipmentId: 'shipment-1',
      status: 'LABEL_GENERATED',
      description: 'Guía de transporte generada en el sistema.',
      location: 'Nova Logistics Portal',
      timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    },
  ],
};

function TrackingContent() {
  const params = useParams();
  const trackingNumber = (params?.trackingNumber as string) || 'TRK-NOVA-001';

  const [trackingData, setTrackingData] = useState<PublicTrackingResponse>({
    ...FALLBACK_TRACKING,
    trackingNumber,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchTracking = async () => {
    setIsLoading(true);
    try {
      const data = await logisticsApi.getTracking(trackingNumber);
      if (data) {
        setTrackingData(data);
      }
    } catch {
      // Graceful fallback preserved
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
  }, [trackingNumber]);

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isDelivered = trackingData.currentMilestone === 'DELIVERED';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Merchant Branding Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Building className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">
                {trackingData.merchant?.name || 'Nova Logistics Store'}
              </span>
              <Badge variant="info">Tienda Oficial</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Portal de Seguimiento Post-Compra Oficial del Pedido
            </p>
          </div>
        </div>

        {/* Live Simulator Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTracking}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSimulatorOpen(true)}
            leftIcon={<Activity className="w-3.5 h-3.5 text-cyan-300" />}
          >
            Simular Webhook
          </Button>
        </div>
      </div>

      {/* Primary Tracking Info Card */}
      <Card className="space-y-6">
        {/* Tracking Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              Número de Guía
            </span>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-2xl font-mono font-bold text-white tracking-wide">
                {trackingData.trackingNumber}
              </h2>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                title="Copiar guía"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge status={trackingData.status} className="text-sm px-3 py-1" />
            <div className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 font-semibold">
              Carrier: {trackingData.carrierCode}
            </div>
          </div>
        </div>

        {/* Milestone Progression Stepper */}
        <MilestoneStepper
          currentMilestone={trackingData.currentMilestone}
          progressPercent={trackingData.progressPercent}
          isDelivered={isDelivered}
        />

        {/* Origin / Destination & Delivery Date Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <span className="text-slate-500 block">Fecha Estimada de Entrega</span>
              <span className="font-semibold text-slate-200">
                {formatDate(trackingData.estimatedDeliveryDate)}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <span className="text-slate-500 block">Origen</span>
              <span className="font-semibold text-slate-200">
                C.P. {trackingData.originPostalCode || '01000'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-center gap-3">
            <Truck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-slate-500 block">Destino</span>
              <span className="font-semibold text-slate-200">
                C.P. {trackingData.destinationPostalCode || '44100'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* History Timeline */}
      <Card>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-white text-base">Historial de Actualizaciones</h3>
          </div>
          <span className="text-xs text-slate-500">
            {trackingData.events?.length || 0} eventos registrados
          </span>
        </div>

        <EventTimeline events={trackingData.events} />
      </Card>

      {/* Webhook Simulator Modal */}
      <WebhookSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        trackingNumber={trackingData.trackingNumber}
        carrierCode={trackingData.carrierCode}
        onEventDispatched={() => {
          fetchTracking();
        }}
      />
    </div>
  );
}

/**
 * Public Tracking Page wrapped in Suspense for dynamic route pre-rendering in Next.js 16.
 */
export default function TrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto py-24 text-center text-slate-400">
          Cargando información de guía de envío...
        </div>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
