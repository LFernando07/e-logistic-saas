'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { logisticsApi } from '@/lib/api-client';
import { Activity, Send } from 'lucide-react';

export interface WebhookSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackingNumber: string;
  carrierCode?: string;
  onEventDispatched?: () => void;
}

const PRESET_EVENTS = [
  {
    status: 'IN_TRANSIT',
    description: 'Paquete recibido en centro de clasificación y trasvase.',
    location: 'HUB Cuautitlán Izcalli, MEX',
  },
  {
    status: 'IN_TRANSIT',
    description: 'Arribo a estación de transferencia regional.',
    location: 'Estación Central Guadalajara, JAL',
  },
  {
    status: 'OUT_FOR_DELIVERY',
    description: 'En unidad de reparto asignada para entrega hoy.',
    location: 'Ruta Zapopan Poniente, JAL',
  },
  {
    status: 'DELIVERED',
    description: 'Entregado en domicilio. Firma recibida por titular.',
    location: 'Zapopan, JAL',
  },
];

/**
 * Webhook Simulator Modal Component.
 * Allows merchant and QA testers to push simulated carrier scans into BullMQ in real-time.
 */
export function WebhookSimulatorModal({
  isOpen,
  onClose,
  trackingNumber,
  carrierCode = 'SKYDROPX',
  onEventDispatched,
}: WebhookSimulatorModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>('IN_TRANSIT');
  const [description, setDescription] = useState<string>(
    'Paquete recibido en centro de clasificación y trasvase.',
  );
  const [location, setLocation] = useState<string>('HUB Central CDMX');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const handleApplyPreset = (preset: (typeof PRESET_EVENTS)[0]) => {
    setSelectedStatus(preset.status);
    setDescription(preset.description);
    setLocation(preset.location);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    try {
      await logisticsApi.simulateWebhookEvent({
        trackingNumber,
        carrierCode,
        status: selectedStatus,
        description,
        location,
      });

      setFeedback({
        type: 'success',
        message: 'Evento webhook encolado exitosamente. Se procesará en BullMQ.',
      });

      if (onEventDispatched) {
        setTimeout(() => {
          onEventDispatched();
        }, 800);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error al disparar evento de webhook simulado.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Simulador de Webhooks en Vivo"
      description={`Dispara actualizaciones automáticas para la guía ${trackingNumber} hacia la cola BullMQ.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Presets */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Eventos Predefinidos Rápidos
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_EVENTS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                  selectedStatus === preset.status && description === preset.description
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-semibold text-slate-200">{preset.status}</div>
                <div className="truncate text-[10px] text-slate-400 mt-0.5">{preset.location}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Status Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Estado de Guía (Status)
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
          >
            <option value="IN_TRANSIT">IN_TRANSIT (En tránsito)</option>
            <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY (En reparto)</option>
            <option value="DELIVERED">DELIVERED (Entregado)</option>
            <option value="EXCEPTION">EXCEPTION (Incidencia / Retraso)</option>
            <option value="FAILED">FAILED (Fallo en entrega)</option>
          </select>
        </div>

        {/* Description Input */}
        <Input
          label="Descripción del Evento"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        {/* Location Input */}
        <Input
          label="Ubicación Escaneo (Opcional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        {/* Feedback message */}
        {feedback && (
          <div
            className={`p-3 rounded-lg text-xs border ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Disparar Webhook
          </Button>
        </div>
      </form>
    </Modal>
  );
}
