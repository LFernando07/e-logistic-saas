'use client';

/**
 * @fileoverview Login and Registration Dedicated Page.
 * Portal de autenticación con diseño premium, pestañas de acceso y registro,
 * auto-relleno de credenciales demo, validaciones y sincronización de sesión.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  LogIn,
  UserPlus,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const redirectPath = searchParams.get('redirect') || '/store';

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Comprobar si ya existe sesión iniciada
  useEffect(() => {
    try {
      const token = localStorage.getItem('nova_auth_token');
      if (token) {
        router.push(redirectPath);
      }
    } catch {
      // Ignore
    }
  }, [redirectPath, router]);

  // Demo credentials autofill for quick testing
  const handleFillDemo = (type: 'merchant' | 'client') => {
    setErrorMsg(null);
    if (type === 'merchant') {
      setEmail('merchant@novastore.com');
      setPassword('Password123!');
      setMode('login');
    } else {
      setEmail('cliente.demo@novalogistics.com');
      setPassword('Password123!');
      setFirstName('Carlos');
      setLastName('Mendoza');
      setMode('register');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'login') {
        const res = await authApi.login({ email, password });
        localStorage.setItem('nova_auth_token', res.accessToken);
        localStorage.setItem('nova_auth_user', JSON.stringify(res.user));
        window.dispatchEvent(new Event('nova_auth_change'));
        setSuccessMsg('Inicio de sesión exitoso. Redirigiendo...');
        setTimeout(() => {
          router.push(redirectPath);
        }, 800);
      } else {
        const res = await authApi.register({
          email,
          password,
          firstName,
          lastName,
          tenantId: '1e2f376f-d11a-45a9-835e-67f67fdf3e7e',
        });
        localStorage.setItem('nova_auth_token', res.accessToken);
        localStorage.setItem('nova_auth_user', JSON.stringify(res.user));
        window.dispatchEvent(new Event('nova_auth_change'));
        setSuccessMsg('Cuenta creada exitosamente. Se envió correo de bienvenida con Resend.');
        setTimeout(() => {
          router.push(redirectPath);
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en la autenticación. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-indigo-600/15 via-cyan-500/10 to-purple-600/10 blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              Nova<span className="text-indigo-400">Logistics</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Bienvenido de Vuelta' : 'Crear Cuenta en NovaLogistics'}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {mode === 'login'
              ? 'Accede al panel logístico y guarda tus carritos de compra.'
              : 'Únete para automatizar tus envíos y compras con múltiples paqueterías.'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrarse</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Nombre"
                  placeholder="Carlos"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <Input
                  label="Apellidos"
                  placeholder="Mendoza"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            )}

            <Input
              label="Correo Electrónico"
              type="email"
              placeholder="cliente@ejemplo.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {mode === 'login' ? 'Acceder al Sistema' : 'Crear Cuenta y Comenzar'}
            </Button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center space-y-2">
            <span className="text-[11px] text-slate-500 block font-medium">
              Acceso rápido para evaluación demo:
            </span>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('merchant')}
                className="px-3 py-1 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-indigo-400 hover:border-slate-700 text-xs transition-colors cursor-pointer"
              >
                Cuenta Merchant Demo
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('client')}
                className="px-3 py-1 rounded-lg border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-cyan-400 hover:border-slate-700 text-xs transition-colors cursor-pointer"
              >
                Cuenta Cliente Demo
              </button>
            </div>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>JWT & Bcrypt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Emails con Resend</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Dedicated Login & Register Page.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center text-slate-400 text-sm">
          Cargando portal de autenticación...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
