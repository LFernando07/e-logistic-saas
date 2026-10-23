'use client';

/**
 * @fileoverview Top Navigation Bar component.
 * Navegación principal con enlaces a Dashboard, Tienda, Rastreo,
 * botón dinámico de Carrito con contador en tiempo real y acceso al portal de autenticación /login.
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Truck,
  Store,
  LayoutDashboard,
  Search,
  PackageCheck,
  ShoppingBag,
  LogIn,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState<number>(0);

  // Sincronizar estado de autenticación y carrito desde localStorage
  const syncState = () => {
    try {
      const storedUser = localStorage.getItem('nova_auth_user');
      setCurrentUser(storedUser ? JSON.parse(storedUser) : null);

      const storedCart = localStorage.getItem('nova_cart_items_v1');
      if (storedCart) {
        const items = JSON.parse(storedCart);
        if (Array.isArray(items)) {
          const total = items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
          setCartCount(total);
        } else {
          setCartCount(0);
        }
      } else {
        setCartCount(0);
      }
    } catch {
      // Ignore parse errors
    }
  };

  useEffect(() => {
    syncState();

    const handleAuthChange = () => syncState();
    const handleCartChange = () => syncState();

    window.addEventListener('nova_auth_change', handleAuthChange);
    window.addEventListener('nova_cart_change', handleCartChange);
    window.addEventListener('storage', syncState);

    return () => {
      window.removeEventListener('nova_auth_change', handleAuthChange);
      window.removeEventListener('nova_cart_change', handleCartChange);
      window.removeEventListener('storage', syncState);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('nova_auth_token');
    localStorage.removeItem('nova_auth_user');
    window.dispatchEvent(new Event('nova_auth_change'));
    setCurrentUser(null);
  };

  // Abrir carrito de forma inteligente
  const handleOpenCart = () => {
    if (pathname === '/store') {
      window.dispatchEvent(new Event('nova-open-cart'));
    } else {
      router.push('/store?open_cart=true');
    }
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

        {/* Right Section: Quick Track, Cart & Auth */}
        <div className="flex items-center gap-2.5">
          {/* Quick Tracking Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.elements.namedItem('trackInput') as HTMLInputElement;
              if (input && input.value.trim()) {
                window.location.href = `/track/${encodeURIComponent(input.value.trim())}`;
              }
            }}
            className="relative hidden lg:block"
          >
            <input
              name="trackInput"
              type="text"
              placeholder="Buscar guía (TRK-...)"
              className="w-44 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 pl-8 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
          </form>

          {/* Cart Button in Navbar */}
          <button
            type="button"
            onClick={handleOpenCart}
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-300 transition-colors cursor-pointer"
            title="Ver Carrito de Compras"
          >
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold hidden sm:inline">Carrito</span>
            {cartCount > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center animate-pulse">
                {cartCount}
              </span>
            )}
          </button>

          {/* Auth State Button: Direct link to /login or User Avatar */}
          {currentUser ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800">
              <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center">
                {currentUser.firstName?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-xs font-medium text-slate-200 hidden sm:inline max-w-[90px] truncate">
                {currentUser.firstName || currentUser.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-indigo-400" />
              <span>Iniciar Sesión</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
