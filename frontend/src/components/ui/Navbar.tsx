'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Truck, Store, LayoutDashboard, Search, PackageCheck, User as UserIcon, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthModal } from './AuthModal';

/**
 * Top Navigation Bar component.
 * Links across Dashboard, Storefront, Tracking lookup, and includes Auth state.
 */
export function Navbar() {
  const pathname = usePathname();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nova_auth_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    } catch {
      // Ignorado
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('nova_auth_token');
    localStorage.removeItem('nova_auth_user');
    setCurrentUser(null);
  };

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

        {/* Right Section: Search & Auth */}
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
              className="w-44 lg:w-48 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 pl-8 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
          </form>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-300 hidden md:inline">
                {currentUser.firstName}
              </span>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Acceder</span>
            </button>
          )}

          <Link
            href="/store"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            <Store className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tienda</span>
          </Link>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(user) => setCurrentUser(user)}
      />
    </header>
  );
}
