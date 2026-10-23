import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Suspense } from 'react';
import { Navbar } from '@/components/ui/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'NovaLogistics - Multi-Carrier SaaS & Integrated E-Commerce',
  description:
    'Plataforma integral para gestión de envíos multitransportista, cotización dinámica, rastreo post-compra branded y comercio electrónico integrado.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
        <Suspense fallback={<div className="h-16 border-b border-slate-800/80 bg-slate-950/80" />}>
          <Navbar />
        </Suspense>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>NovaLogistics SaaS &copy; 2026. Todos los derechos reservados.</span>
            <div className="flex items-center gap-4 text-slate-400">
              <span>NestJS Multi-Schema</span>
              <span>BullMQ + Redis</span>
              <span>Supabase Storage</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
