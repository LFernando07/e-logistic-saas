'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { logisticsApi } from '@/lib/api-client';
import { PackagePlus } from 'lucide-react';

export interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  onShipmentCreated?: () => void;
}

/**
 * Manual Shipment Creation & Label Generation Modal.
 * Allows merchants to dispatch a shipment and trigger label generation in BullMQ.
 */
export function CreateShipmentModal({
  isOpen,
  onClose,
  tenantId,
  onShipmentCreated,
}: CreateShipmentModalProps) {
  const [carrierCode, setCarrierCode] = useState<string>('SKYDROPX');
  const [serviceLevel, setServiceLevel] = useState<string>('standard');
  const [originCp, setOriginCp] = useState<string>('01000');
  const [destinationCp, setDestinationCp] = useState<string>('64000');
  const [weightKg, setWeightKg] = useState<number>(2.0);
  const [lengthCm, setLengthCm] = useState<number>(25);
  const [widthCm, setWidthCm] = useState<number>(20);
  const [heightCm, setHeightCm] = useState<number>(15);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await logisticsApi.createShipment({
        tenantId,
        carrierCode,
        serviceLevel,
        originPostalCode: originCp,
        destinationPostalCode: destinationCp,
        packages: [
          {
            weightKg: Number(weightKg),
            lengthCm: Number(lengthCm),
            widthCm: Number(widthCm),
            heightCm: Number(heightCm),
          },
        ],
      });

      if (onShipmentCreated) {
        onShipmentCreated();
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al generar el envío.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear Envío y Generar Guía"
      description="Genera una nueva guía de transporte y encola la generación de etiqueta PDF."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Transportista
            </label>
            <select
              value={carrierCode}
              onChange={(e) => setCarrierCode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="SKYDROPX">Skydropx API</option>
              <option value="MOCK_CARRIER">Mock Carrier Sandbox</option>
              <option value="FEDEX">FedEx Express</option>
              <option value="DHL">DHL Express</option>
              <option value="ESTAFETA">Estafeta Terrestre</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Servicio
            </label>
            <select
              value={serviceLevel}
              onChange={(e) => setServiceLevel(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="standard">Standard (3-5 días)</option>
              <option value="express">Express (Día siguiente)</option>
              <option value="priority">Prioritario AM</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="C.P. Origen"
            value={originCp}
            onChange={(e) => setOriginCp(e.target.value)}
            required
          />
          <Input
            label="C.P. Destino"
            value={destinationCp}
            onChange={(e) => setDestinationCp(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <Input
            label="Peso (kg)"
            type="number"
            step="0.1"
            value={weightKg}
            onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
            required
          />
          <Input
            label="Largo (cm)"
            type="number"
            value={lengthCm}
            onChange={(e) => setLengthCm(parseInt(e.target.value) || 0)}
            required
          />
          <Input
            label="Ancho (cm)"
            type="number"
            value={widthCm}
            onChange={(e) => setWidthCm(parseInt(e.target.value) || 0)}
            required
          />
          <Input
            label="Alto (cm)"
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(parseInt(e.target.value) || 0)}
            required
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isLoading}
            leftIcon={<PackagePlus className="w-3.5 h-3.5" />}
          >
            Generar Guía
          </Button>
        </div>
      </form>
    </Modal>
  );
}
