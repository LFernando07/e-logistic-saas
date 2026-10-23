/**
 * @fileoverview supabase-storage.service.ts
 * Implementacion del servicio de almacenamiento utilizando el Storage API de Supabase (@supabase/supabase-js).
 * Gestiona el bucket 'shipping-labels' para persistencia de etiquetas termicas (PDF y ZPL),
 * asegurando aislamiento multi-tenant por directorio, generacion de URLs publicas y firmadas,
 * y creacion automatica del bucket si no existe.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IStorageService, UploadFileOptions, UploadedFileResult } from './storage.interface';

/**
 * Nombre por defecto del bucket para etiquetas de envio.
 */
export const SHIPPING_LABELS_BUCKET = 'shipping-labels';

/**
 * Servicio de almacenamiento sobre Supabase Storage.
 */
@Injectable()
export class SupabaseStorageService implements IStorageService, OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private supabaseClient: SupabaseClient | null = null;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const supabaseUrl =
      this.configService.get<string>('SUPABASE_URL') ||
      this.configService.get<string>('NEXT_PUBLIC_SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && serviceRoleKey) {
      this.supabaseClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
      this.logger.warn('Supabase credentials not fully configured. Storage will operate in fallback mock mode.');
    }
  }

  /**
   * Inicializa el servicio y verifica o crea el bucket 'shipping-labels' de forma idempotente.
   */
  async onModuleInit(): Promise<void> {
    if (this.isConfigured && this.supabaseClient) {
      await this.ensureBucket(SHIPPING_LABELS_BUCKET, true);
    }
  }

  /**
   * Verifica la existencia de un bucket y lo crea si no existe.
   *
   * @param bucketName Nombre del bucket a verificar o crear
   * @param isPublic Define si el bucket permite acceso publico a sus archivos
   */
  public async ensureBucket(bucketName: string, isPublic: boolean = true): Promise<void> {
    if (!this.supabaseClient) return;

    try {
      const { data: buckets, error: listError } = await this.supabaseClient.storage.listBuckets();
      if (listError) {
        this.logger.warn(`Could not list Supabase buckets: ${listError.message}`);
        return;
      }

      const bucketExists = buckets?.some((b) => b.name === bucketName);
      if (!bucketExists) {
        const { error: createError } = await this.supabaseClient.storage.createBucket(bucketName, {
          public: isPublic,
          fileSizeLimit: '10MB',
          allowedMimeTypes: ['application/pdf', 'text/plain', 'image/png'],
        });

        if (createError) {
          this.logger.error(`Failed to create bucket '${bucketName}': ${createError.message}`);
        } else {
          this.logger.log(`Storage bucket '${bucketName}' created successfully.`);
        }
      }
    } catch (error) {
      this.logger.error(`Error ensuring bucket '${bucketName}': ${(error as Error).message}`);
    }
  }

  /**
   * Sube un archivo binario al bucket y ruta especificados.
   *
   * @param options Opciones completas de carga de archivo
   * @returns Datos estructurados con la ruta y URL generada
   */
  async uploadFile(options: UploadFileOptions): Promise<UploadedFileResult> {
    const { bucket, path, fileBuffer, contentType, isPublic = true } = options;

    if (!this.supabaseClient || !this.isConfigured) {
      // Modo mock fallback para pruebas o desarrollo local sin conexion externa
      const fallbackUrl = `https://storage.local/${bucket}/${path}`;
      this.logger.log(`Mock storage upload: ${path} (${fileBuffer.length} bytes) -> ${fallbackUrl}`);
      return {
        bucket,
        path,
        publicUrl: fallbackUrl,
        signedUrl: fallbackUrl,
      };
    }

    const { error: uploadError } = await this.supabaseClient.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      this.logger.error(`Failed uploading file to ${bucket}/${path}: ${uploadError.message}`);
      throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);
    }

    let publicUrl: string | undefined;
    if (isPublic) {
      const { data } = this.supabaseClient.storage.from(bucket).getPublicUrl(path);
      publicUrl = data.publicUrl;
    }

    return {
      bucket,
      path,
      publicUrl,
    };
  }

  /**
   * Sube una etiqueta de envio organizando la ruta por tenant para aislamiento multi-tenant.
   *
   * @param tenantId Identificador del tenant propietario del envio
   * @param fileName Nombre del archivo de la etiqueta (ej. 'TRK123456.pdf')
   * @param fileBuffer Buffer binario con los datos de la guia
   * @param format Formato del archivo ('PDF' o 'ZPL')
   * @returns Resultado con la URL publica o accesible de la etiqueta
   */
  async uploadShippingLabel(
    tenantId: string,
    fileName: string,
    fileBuffer: Buffer,
    format: 'PDF' | 'ZPL',
  ): Promise<UploadedFileResult> {
    const contentType = format === 'PDF' ? 'application/pdf' : 'text/plain';
    const filePath = `${tenantId}/labels/${fileName}`;

    return this.uploadFile({
      bucket: SHIPPING_LABELS_BUCKET,
      path: filePath,
      fileBuffer,
      contentType,
      isPublic: true,
    });
  }

  /**
   * Genera una URL firmada con tiempo de caducidad para acceso privado a documentos.
   *
   * @param bucket Nombre del bucket
   * @param path Ruta interna del archivo
   * @param expiresInSeconds Tiempo de expiracion en segundos (por defecto 3600 = 1 hora)
   * @returns URL firmada
   */
  async getSignedUrl(bucket: string, path: string, expiresInSeconds: number = 3600): Promise<string> {
    if (!this.supabaseClient || !this.isConfigured) {
      return `https://storage.local/${bucket}/${path}?signed=mock`;
    }

    const { data, error } = await this.supabaseClient.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to generate signed URL for ${bucket}/${path}: ${error?.message}`);
    }

    return data.signedUrl;
  }
}
