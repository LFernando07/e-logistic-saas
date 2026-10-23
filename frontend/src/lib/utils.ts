import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes with clsx conditionality.
 * Resolves conflicting Tailwind utility classes cleanly.
 *
 * @param inputs - Variable number of class values, objects, or arrays.
 * @returns Merged class name string.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a numeric currency value into Mexican Pesos (MXN) or specified currency.
 *
 * @param amount - The numerical amount to format.
 * @param currency - The ISO 4217 currency code (default: 'MXN').
 * @returns Formatted currency string (e.g. "$1,250.00 MXN").
 */
export function formatCurrency(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats an ISO date string or Date object into human-readable Spanish locale format.
 *
 * @param date - Date object or ISO string.
 * @returns Formatted date string (e.g. "23 oct 2026, 10:30").
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
