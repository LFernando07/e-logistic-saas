/**
 * @fileoverview Type-safe HTTP Client for connecting Next.js frontend to NestJS backend APIs.
 * Includes graceful fallback and error handling for Logistics, E-Commerce, Auth, Stripe, and Cart Recovery.
 */

import {
  PublicTrackingResponse,
  RateOption,
  Shipment,
  Product,
  CarrierAccount,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Standard HTTP error with statusCode and error message.
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public data?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Executes a fetch request with JSON parsing and error handling.
 *
 * @param path - URL endpoint path (e.g. '/logistics/tracking/TRK-123').
 * @param options - RequestInit fetch options.
 * @returns Parsed JSON response.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  let authHeader: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('nova_auth_token');
    if (token) {
      authHeader = { Authorization: `Bearer ${token}` };
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...authHeader,
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorBody: any;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = { message: res.statusText };
      }
      throw new ApiError(
        res.status,
        errorBody.message || `Request failed with status ${res.status}`,
        errorBody,
      );
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(500, err.message || 'Network request failed');
  }
}

/**
 * Authentication API Methods
 */
export const authApi = {
  async register(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantId?: string;
  }): Promise<{ user: any; accessToken: string; message: string }> {
    return request<{ user: any; accessToken: string; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: {
    email: string;
    password: string;
  }): Promise<{ user: any; accessToken: string; message: string }> {
    return request<{ user: any; accessToken: string; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMe(): Promise<any> {
    return request<any>('/auth/me', {
      cache: 'no-store',
    });
  },
};

/**
 * Logistics API Methods
 */
export const logisticsApi = {
  async getTracking(trackingNumber: string): Promise<PublicTrackingResponse> {
    return request<PublicTrackingResponse>(`/logistics/tracking/${trackingNumber}`, {
      cache: 'no-store',
    });
  },

  async quoteRates(payload: {
    tenantId?: string;
    originPostalCode: string;
    destinationPostalCode: string;
    weightKg: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    declaredValue?: number;
  }): Promise<RateOption[]> {
    return request<RateOption[]>('/logistics/rates/quote', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getShipments(tenantId?: string): Promise<Shipment[]> {
    const query = tenantId ? `?tenantId=${tenantId}` : '';
    return request<Shipment[]>(`/logistics/shipments${query}`, {
      cache: 'no-store',
    });
  },

  async getCarrierAccounts(tenantId?: string): Promise<CarrierAccount[]> {
    const query = tenantId ? `?tenantId=${tenantId}` : '';
    return request<CarrierAccount[]>(`/logistics/carriers/accounts${query}`, {
      cache: 'no-store',
    });
  },

  async createShipment(payload: {
    tenantId: string;
    carrierCode: string;
    serviceLevel: string;
    originPostalCode: string;
    destinationPostalCode: string;
    packages: Array<{
      weightKg: number;
      lengthCm: number;
      widthCm: number;
      heightCm: number;
    }>;
  }): Promise<Shipment> {
    return request<Shipment>('/logistics/shipments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async simulateWebhookEvent(payload: {
    trackingNumber: string;
    carrierCode: string;
    status: string;
    description: string;
    location?: string;
  }): Promise<{ message: string; trackingNumber: string }> {
    return request<{ message: string; trackingNumber: string }>(
      '/logistics/webhooks/simulate/event',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },
};

/**
 * E-Commerce API Methods
 */
export const ecommerceApi = {
  async getProducts(params?: {
    tenantId?: string;
    tenantSlug?: string;
    category?: string;
    search?: string;
  }): Promise<Product[]> {
    const searchParams = new URLSearchParams();
    if (params?.tenantId) searchParams.append('tenantId', params.tenantId);
    if (params?.tenantSlug) searchParams.append('tenantSlug', params.tenantSlug);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return request<Product[]>(`/ecommerce/products${query}`, {
      cache: 'no-store',
    });
  },

  async getCartRates(payload: {
    tenantId: string;
    destinationPostalCode: string;
    items: Array<{ variantId: string; quantity: number }>;
  }): Promise<RateOption[]> {
    return request<RateOption[]>('/ecommerce/checkout/rates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async checkout(payload: {
    tenantId: string;
    customerEmail: string;
    shippingAddress: {
      recipientName: string;
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
      phone?: string;
    };
    items: Array<{ variantId: string; quantity: number }>;
    selectedCarrierRate: {
      carrierCode: string;
      serviceName: string;
      totalAmount: number;
    };
  }): Promise<any> {
    return request<any>('/ecommerce/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createStripeCheckoutSession(orderId: string): Promise<{ sessionId: string; url: string; simulated?: boolean }> {
    return request<{ sessionId: string; url: string; simulated?: boolean }>(
      '/ecommerce/payments/stripe/checkout-session',
      {
        method: 'POST',
        body: JSON.stringify({ orderId }),
      },
    );
  },

  async confirmPayment(payload: {
    orderId: string;
    paymentMethod: string;
    transactionReference?: string;
  }): Promise<any> {
    return request<any>('/ecommerce/payments/confirm', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async recordAbandonedCart(payload: {
    tenantId: string;
    email: string;
    customerName?: string;
    items: Array<{ name: string; quantity: number; unitPrice: number; image?: string }>;
    totalAmount: number;
  }): Promise<{ success: boolean; recoveryToken: string; recoveryUrl: string }> {
    return request<any>('/ecommerce/cart/abandoned', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async recoverCart(token: string): Promise<{
    success: boolean;
    email: string;
    customerName?: string;
    items: any[];
    totalAmount: number;
  }> {
    return request<any>(`/ecommerce/cart/recover/${token}`, {
      cache: 'no-store',
    });
  },
};
