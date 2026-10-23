/**
 * @fileoverview Type definitions for the E-Logistic SaaS frontend application.
 * Defines domain models, API payloads, and UI view state models.
 */

/** Canonical shipment milestone states */
export type ShipmentStatus = 'CREATED' | 'LABEL_GENERATED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'EXCEPTION';

/** Canonical 4-step milestone progression for public tracking */
export type TrackingMilestone = 'LABEL_CREATED' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

/** Available shipping carrier providers */
export type CarrierCode = 'SKYDROPX' | 'MOCK_CARRIER' | 'FEDEX' | 'DHL' | 'ESTAFETA';

/**
 * Tenant / Storefront Profile
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor?: string;
  createdAt: string;
}

/**
 * Shipping Rate Quotation Item
 */
export interface RateOption {
  carrierCode: string;
  carrierName: string;
  serviceName: string;
  serviceCode: string;
  totalAmount: number;
  currency: string;
  estimatedDeliveryDays: number;
  deliveryDateGuaranteed?: boolean;
}

/**
 * Carrier Account configuration model
 */
export interface CarrierAccount {
  id: string;
  tenantId: string;
  carrierCode: string;
  accountName: string;
  isActive: boolean;
  isSandbox: boolean;
  createdAt: string;
}

/**
 * Shipment Package specification
 */
export interface ShipmentPackage {
  id: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  declaredValue: number;
}

/**
 * Shipment record model
 */
export interface Shipment {
  id: string;
  tenantId: string;
  orderId?: string;
  trackingNumber: string;
  carrierCode: string;
  serviceLevel: string;
  status: ShipmentStatus;
  labelUrl?: string;
  labelFormat?: string;
  originPostalCode: string;
  destinationPostalCode: string;
  estimatedDeliveryDate?: string;
  packages?: ShipmentPackage[];
  events?: TrackingEvent[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Individual tracking checkpoint event
 */
export interface TrackingEvent {
  id: string;
  shipmentId: string;
  status: string;
  description: string;
  location?: string;
  timestamp: string;
}

/**
 * Post-Purchase Tracking View Model returned by GET /logistics/tracking/:trackingNumber
 */
export interface PublicTrackingResponse {
  trackingNumber: string;
  carrierCode: string;
  status: ShipmentStatus;
  currentMilestone: TrackingMilestone;
  progressPercent: number;
  estimatedDeliveryDate?: string;
  originPostalCode: string;
  destinationPostalCode: string;
  merchant: {
    name: string;
    slug: string;
    logoUrl?: string;
    brandColor?: string;
  };
  events: TrackingEvent[];
}

/**
 * E-Commerce Product Variant
 */
export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  attributes?: Record<string, string>;
}

/**
 * E-Commerce Product
 */
export interface Product {
  id: string;
  tenantId: string;
  title: string;
  slug: string;
  description?: string;
  category: string;
  imageUrl?: string;
  isActive: boolean;
  variants: ProductVariant[];
  createdAt: string;
}

/**
 * Cart Item for E-Commerce Storefront
 */
export interface CartItem {
  variantId: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
}
