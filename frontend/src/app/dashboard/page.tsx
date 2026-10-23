'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ShipmentsTable } from '@/components/dashboard/ShipmentsTable';
import { RateCalculator } from '@/components/dashboard/RateCalculator';
import { CreateShipmentModal } from '@/components/dashboard/CreateShipmentModal';
import { Shipment, CarrierAccount } from '@/types';
import { logisticsApi } from '@/lib/api-client';
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  PlusCircle,
  RefreshCw,
  Server,
  Layers,
} from 'lucide-react';

// Fallback seed shipment data for initial UI render
const SEED_SHIPMENTS: Shipment[] = [
  {
    id: 'shipment-seed-1',
    tenantId: 'tenant-nova-1',
    trackingNumber: 'TRK-NOVA-001',
    carrierCode: 'SKYDROPX',
    serviceLevel: 'express',
    status: 'IN_TRANSIT',
    labelUrl: 'https://preview.storage.supabase.co/labels/demo.pdf',
    originPostalCode: '01000',
    destinationPostalCode: '44100',
    createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'shipment-seed-2',
    tenantId: 'tenant-nova-1',
    trackingNumber: 'TRK-NOVA-002',
    carrierCode: 'FEDEX',
    serviceLevel: 'standard',
    status: 'OUT_FOR_DELIVERY',
    labelUrl: 'https://preview.storage.supabase.co/labels/demo.pdf',
    originPostalCode: '01000',
    destinationPostalCode: '64000',
    createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'shipment-seed-3',
    tenantId: 'tenant-nova-1',
    trackingNumber: 'TRK-NOVA-003',
    carrierCode: 'DHL',
    serviceLevel: 'priority',
    status: 'DELIVERED',
    labelUrl: 'https://preview.storage.supabase.co/labels/demo.pdf',
    originPostalCode: '01000',
    destinationPostalCode: '06600',
    createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_CARRIERS: CarrierAccount[] = [
  {
    id: 'carrier-acc-1',
    tenantId: 'tenant-nova-1',
    carrierCode: 'SKYDROPX',
    accountName: 'Skydropx Producción / API Key',
    isActive: true,
    isSandbox: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'carrier-acc-2',
    tenantId: 'tenant-nova-1',
    carrierCode: 'MOCK_CARRIER',
    accountName: 'Simulador Local Mock Carrier',
    isActive: true,
    isSandbox: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'carrier-acc-3',
    tenantId: 'tenant-nova-1',
    carrierCode: 'FEDEX',
    accountName: 'FedEx Web Services Direct',
    isActive: false,
    isSandbox: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Logistics Merchant Dashboard.
 * Central hub for tracking metrics, shipment operations, carrier rate quoting, and account administration.
 */
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'shipments' | 'rates' | 'carriers'>('shipments');
  const [shipments, setShipments] = useState<Shipment[]>(SEED_SHIPMENTS);
  const [carriers, setCarriers] = useState<CarrierAccount[]>(SEED_CARRIERS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Load live shipments from backend
  const loadShipments = async (showLoading: boolean = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await logisticsApi.getShipments();
      if (data && data.length > 0) {
        setShipments(data);
      }
    } catch {
      // Fallback kept gracefully
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShipments(false);
  }, []);

  // Metrics calculations
  const totalShipments = shipments.length;
  const inTransitCount = shipments.filter(
    (s) => s.status === 'IN_TRANSIT' || s.status === 'OUT_FOR_DELIVERY',
  ).length;
  const deliveredCount = shipments.filter((s) => s.status === 'DELIVERED').length;
  const createdCount = shipments.filter(
    (s) => s.status === 'CREATED' || s.status === 'LABEL_GENERATED',
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-indigo-400" />
            Panel de Operaciones Logísticas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestión multitransportista unificada, cola de etiquetas BullMQ y sincronización en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadShipments(true)}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualizar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
          >
            Nuevo Envío
          </Button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Total Envíos</span>
            <span className="text-xl font-extrabold text-white">{totalShipments}</span>
          </div>
        </Card>

        {/* Metric 2 */}
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">En Tránsito / Ruta</span>
            <span className="text-xl font-extrabold text-cyan-400">{inTransitCount}</span>
          </div>
        </Card>

        {/* Metric 3 */}
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Entregados</span>
            <span className="text-xl font-extrabold text-emerald-400">{deliveredCount}</span>
          </div>
        </Card>

        {/* Metric 4 */}
        <Card className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Pendientes de Etiqueta</span>
            <span className="text-xl font-extrabold text-amber-400">{createdCount}</span>
          </div>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('shipments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'shipments'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Historial de Guías ({shipments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'rates'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Cotizador Matricial</span>
        </button>

        <button
          onClick={() => setActiveTab('carriers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === 'carriers'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Paqueterías Conectadas</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'shipments' && (
        <ShipmentsTable shipments={shipments} onRefresh={loadShipments} />
      )}

      {activeTab === 'rates' && (
        <div className="max-w-3xl">
          <RateCalculator />
        </div>
      )}

      {activeTab === 'carriers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {carriers.map((carrier) => (
            <Card key={carrier.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{carrier.carrierCode}</span>
                {carrier.isActive ? (
                  <Badge variant="success">Activo</Badge>
                ) : (
                  <Badge variant="neutral">Inactivo</Badge>
                )}
              </div>
              <p className="text-xs text-slate-400">{carrier.accountName}</p>
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>Modo:</span>
                <span className="font-mono text-slate-300">
                  {carrier.isSandbox ? 'Sandbox' : 'Producción'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Shipment Modal */}
      <CreateShipmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tenantId="tenant-nova-1"
        onShipmentCreated={loadShipments}
      />
    </div>
  );
}
