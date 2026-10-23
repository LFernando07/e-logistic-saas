'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RateOption } from '@/types';
import { logisticsApi } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { Calculator, Truck, Clock, ShieldCheck } from 'lucide-react';

export interface RateCalculatorProps {
  onSelectRate?: (rate: RateOption) => void;
}

/**
 * Interactive Shipping Rate Calculator Component.
 * Compares multi-carrier quotes (FedEx, DHL, Estafeta, Skydropx) based on parcel weight and dimensions.
 */
export function RateCalculator({ onSelectRate }: RateCalculatorProps) {
  const [originCp, setOriginCp] = useState<string>('01000');
  const [destinationCp, setDestinationCp] = useState<string>('44100');
  const [weightKg, setWeightKg] = useState<number>(1.5);
  const [lengthCm, setLengthCm] = useState<number>(20);
  const [widthCm, setWidthCm] = useState<number>(15);
  const [heightCm, setHeightCm] = useState<number>(10);
  const [declaredValue, setDeclaredValue] = useState<number>(500);

  const [rates, setRates] = useState<RateOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await logisticsApi.quoteRates({
        originPostalCode: originCp,
        destinationPostalCode: destinationCp,
        weightKg: Number(weightKg),
        lengthCm: Number(lengthCm),
        widthCm: Number(widthCm),
        heightCm: Number(heightCm),
        declaredValue: Number(declaredValue),
      });

      setRates(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cotizar tarifas con las paqueterías.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <CardTitle>Cotizador Multitransportista</CardTitle>
            <CardDescription>
              Compara tarifas en tiempo real entre Skydropx, FedEx, DHL y Estafeta.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <form onSubmit={handleCalculate} className="space-y-4">
        {/* Postal Codes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        {/* Parcel Dimensions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

        <Input
          label="Valor Declarado ($ MXN - Opcional)"
          type="number"
          value={declaredValue}
          onChange={(e) => setDeclaredValue(parseFloat(e.target.value) || 0)}
        />

        {errorMsg && (
          <div className="p-3 rounded-lg text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400">
            {errorMsg}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isLoading}
          leftIcon={<Calculator className="w-4 h-4" />}
        >
          Calcular y Comparar Tarifas
        </Button>
      </form>

      {/* Results List */}
      {rates.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-400" />
            Opciones Disponibles ({rates.length})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rates.map((rate, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white text-sm">{rate.carrierName}</span>
                    <span className="text-base font-extrabold text-emerald-400">
                      {formatCurrency(Number(rate.totalAmount))}
                    </span>
                  </div>
                  <span className="text-xs text-indigo-300 font-medium block">
                    {rate.serviceName}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{rate.estimatedDeliveryDays} días hábiles</span>
                  </div>
                  {onSelectRate && (
                    <button
                      type="button"
                      onClick={() => onSelectRate(rate)}
                      className="text-indigo-400 hover:text-indigo-300 font-medium text-xs cursor-pointer"
                    >
                      Seleccionar Tarifa &rarr;
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
