import React from 'react';
import { Check, Package, Truck, Compass, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TrackingMilestone } from '@/types';

export interface MilestoneStepperProps {
  currentMilestone: TrackingMilestone;
  progressPercent: number;
  isDelivered?: boolean;
}

interface StepConfig {
  key: TrackingMilestone;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepConfig[] = [
  {
    key: 'LABEL_CREATED',
    label: 'Guía Generada',
    description: 'Etiqueta creada y lista para recolección',
    icon: Package,
  },
  {
    key: 'IN_TRANSIT',
    label: 'En Tránsito',
    description: 'Paquete en red de distribución',
    icon: Truck,
  },
  {
    key: 'OUT_FOR_DELIVERY',
    label: 'En Ruta',
    description: 'En camino con el repartidor local',
    icon: Compass,
  },
  {
    key: 'DELIVERED',
    label: 'Entregado',
    description: 'Recibido exitosamente en destino',
    icon: CheckCircle2,
  },
];

/**
 * 4-Milestone Interactive Visual Stepper.
 * Displays real-time shipment progress with animated progress bar and checkpoint icons.
 *
 * @param currentMilestone - Current canonical milestone step.
 * @param progressPercent - Numeric percentage (0-100).
 * @param isDelivered - Boolean flag if package is finalized.
 */
export function MilestoneStepper({
  currentMilestone,
  progressPercent,
  isDelivered = false,
}: MilestoneStepperProps) {
  const getStepIndex = (milestone: TrackingMilestone) => {
    return STEPS.findIndex((s) => s.key === milestone);
  };

  const currentIndex = getStepIndex(currentMilestone);

  return (
    <div className="w-full py-6">
      {/* Progress Bar Container */}
      <div className="relative mb-8">
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-400 transition-all duration-700 ease-out"
            style={{ width: `${Math.max(12, Math.min(100, progressPercent))}%` }}
          />
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isPassed = index < currentIndex || isDelivered;
          const isCurrent = index === currentIndex && !isDelivered;
          const isPending = index > currentIndex && !isDelivered;

          return (
            <div
              key={step.key}
              className={cn(
                'relative flex flex-col items-center text-center p-3 rounded-xl border transition-all duration-300',
                isCurrent &&
                  'bg-indigo-950/40 border-indigo-500/50 shadow-lg shadow-indigo-500/10 scale-105',
                isPassed && 'bg-slate-900/50 border-emerald-500/30 text-slate-300',
                isPending && 'bg-slate-900/20 border-slate-800 text-slate-500',
              )}
            >
              {/* Step Icon Indicator */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center mb-2.5 transition-colors',
                  isPassed && 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30',
                  isCurrent &&
                    'bg-indigo-600 text-white shadow-md shadow-indigo-500/40 ring-4 ring-indigo-500/20 animate-pulse',
                  isPending && 'bg-slate-800 text-slate-500',
                )}
              >
                {isPassed ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>

              {/* Title & Description */}
              <span
                className={cn(
                  'text-xs font-semibold tracking-wide uppercase',
                  isCurrent && 'text-indigo-400',
                  isPassed && 'text-emerald-400',
                  isPending && 'text-slate-400',
                )}
              >
                {step.label}
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-tight line-clamp-2">
                {step.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
