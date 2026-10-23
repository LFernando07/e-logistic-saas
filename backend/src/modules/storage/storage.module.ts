/**
 * @fileoverview storage.module.ts
 * Modulo global de almacenamiento.
 * Provee y exporta SupabaseStorageService para que cualquier dominio (Logistics, E-Commerce)
 * pueda persistir documentos y etiquetas termicas en Supabase Storage.
 */

import { Global, Module } from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service';

/**
 * Modulo global de gestion de almacenamiento de archivos.
 */
@Global()
@Module({
  providers: [SupabaseStorageService],
  exports: [SupabaseStorageService],
})
export class StorageModule {}
