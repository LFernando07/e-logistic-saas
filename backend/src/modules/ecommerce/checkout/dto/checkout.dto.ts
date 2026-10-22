import { CarrierCode } from '@prisma/client';

export interface CheckoutItemDto {
  variantId: string;
  quantity: number;
}

export interface CheckoutDto {
  tenantId: string;
  customerEmail: string;
  customerPhone?: string;
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
  billingAddress?: {
    name: string;
    street1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  selectedShippingRate: {
    carrierCode: CarrierCode;
    serviceCode: string;
    rateAmount: number;
    currency: string;
  };
  items: CheckoutItemDto[];
  notes?: string;
}
