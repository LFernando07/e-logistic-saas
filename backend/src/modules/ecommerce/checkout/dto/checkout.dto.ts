/**
 * @fileoverview checkout.dto.ts
 * Definicion de DTOs para el flujo de cotizacion de envio en tiempo real y proceso de checkout.
 */

import { CarrierCode } from '@prisma/client';

/**
 * Articulo individual y cantidad solicitada en el carrito.
 */
export interface CheckoutItemDto {
  /** Identificador UUID de la variante del producto */
  variantId: string;
  /** Cantidad requerida */
  quantity: number;
}

/**
 * Solicitud de cotizacion de tarifas de envio para los articulos en el carrito.
 */
export interface CalculateShippingRatesDto {
  /** Identificador UUID del tenant/comercio */
  tenantId: string;
  /** Codigo postal de destino */
  destinationPostalCode: string;
  /** Codigo de pais ISO de destino (ej. 'MX', 'US') */
  destinationCountry: string;
  /** Ciudad de destino opcional */
  destinationCity?: string;
  /** Estado o provincia de destino opcional */
  destinationState?: string;
  /** Lista de articulos y cantidades en el carrito */
  items: CheckoutItemDto[];
}

/**
 * Carga de datos para formalizar el proceso de compra (Checkout) y crear la orden.
 */
export interface CheckoutDto {
  /** Identificador UUID del comercio */
  tenantId: string;
  /** Correo electronico del comprador */
  customerEmail: string;
  /** Telefono de contacto del comprador */
  customerPhone?: string;
  /** Direccion fisica de envio */
  shippingAddress: {
    name: string;
    street1: string;
    street2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  /** Direccion fiscal o de facturacion (opcional) */
  billingAddress?: {
    name: string;
    street1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  /** Tarifa de paqueteria seleccionada por el cliente en el paso de checkout */
  selectedShippingRate: {
    carrierCode: CarrierCode;
    serviceCode: string;
    rateAmount: number;
    currency: string;
  };
  /** Articulos que integran la compra */
  items: CheckoutItemDto[];
  /** Notas o instrucciones especiales de entrega */
  notes?: string;
}
