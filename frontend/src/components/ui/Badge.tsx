import React from 'react';
import { cn } from '@/lib/utils';
import { ShipmentStatus } from '@/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: ShipmentStatus | string;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'danger' | 'neutral';
}

/**
 * Status Badge Component.
 * Displays colored badge depending on shipment status or variant.
 *
 * @param status - Shipment status key or custom string.
 * @param variant - Visual color variant override.
 * @param children - Custom label inside the badge.
 */
export function Badge({
  status,
  variant,
  className,
  children,
  ...props
}: BadgeProps) {
  let resolvedVariant = variant || 'default';

  if (!variant && status) {
    switch (status) {
      case 'DELIVERED':
        resolvedVariant = 'success';
        break;
      case 'IN_TRANSIT':
      case 'OUT_FOR_DELIVERY':
        resolvedVariant = 'info';
        break;
      case 'LABEL_GENERATED':
      case 'CREATED':
        resolvedVariant = 'warning';
        break;
      case 'FAILED':
      case 'EXCEPTION':
        resolvedVariant = 'danger';
        break;
      default:
        resolvedVariant = 'neutral';
    }
  }

  const variantStyles = {
    default: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    info: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    neutral: 'bg-slate-700/40 text-slate-300 border-slate-600/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border tracking-wide uppercase',
        variantStyles[resolvedVariant],
        className,
      )}
      {...props}
    >
      {children || (status ? status.replace(/_/g, ' ') : '')}
    </span>
  );
}
