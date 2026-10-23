'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Truck, Store, LayoutDashboard, Search, PackageCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Top Navigation Bar component.
 * Links across Dashboard, Storefront, Tracking lookup, and quick switchers.
 */
export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    {
      name: 'Overview',
      href: '/',
      icon: Truck,
      exact: true,
    },
    {
      name: 'Logistics Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      exact: false,
    },
    {
      name: 'E-Commerce Store',
      href: '/store',
      icon: Store,
      exact: false,
    },
    {
      name: 'Track Order',
      href: '/track/TRK-NOVA-001',
      icon: PackageCheck,
      exact: false,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
              NovaLogistics
            </span>
            <span className="block text-[10px] tracking-wider text-indigo-400 font-semibold uppercase">
              Multi-Carrier SaaS
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900',
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Tracking Search in Header */}
        <div className="flex items-center gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.elements.namedItem('trackInput') as HTMLInputElement;
              if (input && input.value.trim()) {
                window.location.href = `/track/${encodeURIComponent(input.value.trim())}`;
              }
            }}
            className="relative hidden sm:block"
          >
            <input
              name="trackInput"
              type="text"
              placeholder="Buscar guía (TRK-...)"
              className="w-48 lg:w-56 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 pl-8 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
          </form>

          <Link
            href="/store"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Tienda Demo</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
