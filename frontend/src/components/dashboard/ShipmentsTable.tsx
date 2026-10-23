'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Shipment, ShipmentStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { Search, ExternalLink, Download, Package } from 'lucide-react';

export interface ShipmentsTableProps {
  shipments: Shipment[];
  onRefresh?: () => void;
}

/**
 * Interactive Shipments Data Table Component.
 * Supports live search, status filtering, direct tracking navigation, and shipping label downloads.
 */
export function ShipmentsTable({ shipments }: ShipmentsTableProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredShipments = shipments.filter((item) => {
    const matchesSearch =
      item.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.carrierCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.originPostalCode.includes(searchTerm) ||
      item.destinationPostalCode.includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar por guía, carrier o C.P..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 pl-9 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
        </div>

        {/* Status Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'CREATED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {status === 'ALL' ? 'Todos' : status.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Número de Guía</th>
                <th className="py-3 px-4">Transportista</th>
                <th className="py-3 px-4">Ruta (Origen &rarr; Destino)</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Fecha Creación</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No se encontraron envíos con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredShipments.map((shipment) => (
                  <tr
                    key={shipment.id}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    {/* Tracking Number */}
                    <td className="py-3.5 px-4 font-mono font-medium text-white">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-indigo-400" />
                        <Link
                          href={`/track/${shipment.trackingNumber}`}
                          className="hover:text-indigo-400 hover:underline"
                        >
                          {shipment.trackingNumber}
                        </Link>
                      </div>
                    </td>

                    {/* Carrier & Service */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-200 block">
                        {shipment.carrierCode}
                      </span>
                      <span className="text-[10px] text-slate-500">{shipment.serviceLevel}</span>
                    </td>

                    {/* Route */}
                    <td className="py-3.5 px-4">
                      <span className="text-slate-300 font-medium">
                        CP {shipment.originPostalCode} &rarr; CP {shipment.destinationPostalCode}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      <Badge status={shipment.status} />
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-4 text-slate-400">
                      {formatDate(shipment.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {shipment.labelUrl && (
                        <a
                          href={shipment.labelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition-colors"
                          title="Descargar Guía en PDF"
                        >
                          <Download className="w-3 h-3" />
                          <span>PDF</span>
                        </a>
                      )}

                      <Link
                        href={`/track/${shipment.trackingNumber}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-400 text-[11px] font-medium border border-indigo-500/30 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Rastrear</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
