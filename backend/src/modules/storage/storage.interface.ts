/**
 * @fileoverview storage.interface.ts
 * Contratos y tipos de datos para el servicio de almacenamiento de archivos.
 * Define las opciones de subida, respuesta estructurada y la interfaz abstracta IStorageService
 * para permitir implementaciones intercambiables (Supabase Storage, S3, MinIO o almacenamiento local).
 */

/**
 * Opciones para la carga de un archivo al servicio de almacenamiento.
 */
export interface UploadFileOptions {
  /** Nombre del bucket de destino (ej. 'shipping-labels') */
  bucket: string;
  /** Ruta o clave relativa del archivo dentro del bucket (ej. 'tenants/t-1/labels/MCK123.pdf') */
  path: string;
  /** Buffer binario con el contenido del archivo */
  fileBuffer: Buffer;
  /** Tipo MIME del contenido (ej. 'application/pdf', 'text/plain') */
  contentType: string;
  /** Indica si el archivo debe ser accesible de forma publica directa */
  isPublic?: boolean;
}

/**
 * Resultado estructurado devuelto tras una carga exitosa.
 */
export interface UploadedFileResult {
  /** Nombre del bucket donde se almaceno el archivo */
  bucket: string;
  /** Clave o ruta interna del archivo en el bucket */
  path: string;
  /** URL publica directa si el bucket o archivo es publico */
  publicUrl?: string;
  /** URL firmada temporal con caducidad si se solicito acceso privado */
  signedUrl?: string;
}

/**
 * Interfaz generica del servicio de almacenamiento.
 */
export interface IStorageService {
  /**
   * Sube un archivo binario al almacenamiento en la nube.
   *
   * @param options Parametros de carga del archivo
   * @returns Resultado con rutas y URLs del archivo cargado
   */
  uploadFile(options: UploadFileOptions): Promise<UploadedFileResult>;

  /**
   * Sube especificamente una etiqueta de envio (PDF o ZPL) al bucket 'shipping-labels'.
   *
   * @param tenantId Identificador del tenant para aislamiento de archivos
   * @param fileName Nombre del archivo (ej. 'MCK123456789.pdf')
   * @param fileBuffer Buffer binario con los datos de la guia
   * @param format Formato del archivo ('PDF' o 'ZPL')
   * @returns Resultado de carga con la URL accesible
   */
  uploadShippingLabel(
    tenantId: string,
    fileName: string,
    fileBuffer: Buffer,
    format: 'PDF' | 'ZPL',
  ): Promise<UploadedFileResult>;

  /**
   * Genera una URL firmada con caducidad temporal para descarga segura.
   *
   * @param bucket Nombre del bucket
   * @param path Ruta interna del archivo
   * @param expiresInSeconds Duracion en segundos de validez de la URL firmada
   * @returns URL temporal firmada
   */
  getSignedUrl(bucket: string, path: string, expiresInSeconds?: number): Promise<string>;
}
