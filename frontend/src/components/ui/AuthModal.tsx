'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { authApi } from '@/lib/api-client';
import { LogIn, UserPlus, CheckCircle2, Shield } from 'lucide-react';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: (user: any) => void;
}

/**
 * Authentication Modal for Login & Register.
 * Stores JWT token in localStorage and updates user state.
 */
export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (tab === 'login') {
        const res = await authApi.login({ email, password });
        localStorage.setItem('nova_auth_token', res.accessToken);
        localStorage.setItem('nova_auth_user', JSON.stringify(res.user));
        setSuccessMsg('Inicio de sesión exitoso');
        if (onAuthSuccess) onAuthSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        const res = await authApi.register({
          email,
          password,
          firstName,
          lastName,
        });
        localStorage.setItem('nova_auth_token', res.accessToken);
        localStorage.setItem('nova_auth_user', JSON.stringify(res.user));
        setSuccessMsg('Cuenta creada exitosamente. ¡Te enviamos un correo de bienvenida!');
        if (onAuthSuccess) onAuthSuccess(res.user);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en la autenticación.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
      description={
        tab === 'login'
          ? 'Ingresa a tu cuenta de Nova Logistics SaaS'
          : 'Regístrate para gestionar pedidos y recibir actualizaciones'
      }
    >
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              tab === 'login'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              tab === 'register'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          {tab === 'register' && (
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Nombre"
                placeholder="Carlos"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Apellido"
                placeholder="Mendoza"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          )}

          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="usuario@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errorMsg && (
            <div className="p-2.5 rounded-lg text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            isLoading={isLoading}
            leftIcon={tab === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          >
            {tab === 'login' ? 'Entrar a mi Cuenta' : 'Registrarme'}
          </Button>
        </form>
      </div>
    </Modal>
  );
}
