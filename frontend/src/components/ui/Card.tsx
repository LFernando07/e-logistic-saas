import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

/**
 * Modern Glassmorphic Card Container.
 * Provides backdrop blur, soft border, and optional lift hover effect.
 */
export function Card({ className, hoverEffect = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-xl p-5 shadow-xl shadow-black/20 text-slate-100',
        hoverEffect &&
          'transition-all duration-200 hover:border-slate-700 hover:shadow-indigo-500/5 hover:-translate-y-0.5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Card Header component
 */
export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col space-y-1.5 pb-4 border-b border-slate-800/60 mb-4', className)} {...props}>
      {children}
    </div>
  );
}

/**
 * Card Title component
 */
export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold leading-none tracking-tight text-white', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

/**
 * Card Description component
 */
export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-slate-400', className)} {...props}>
      {children}
    </p>
  );
}
