'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CartItem, RateOption } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { ecommerceApi } from '@/lib/api-client';
import { X, Trash2, Truck, CreditCard, CheckCircle2, ArrowRight } from 'lucide-react';

export interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemoveItem: (variantId: string) => void;
  onClearCart: () => void;
  tenantId: string;
}

/**
 * Slide-Over Cart Drawer Component.
 * Supports item quantity adjustment, live carrier rate quotation, atomic checkout, and instant payment simulation.
 */
export function CartDrawer({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  tenantId,
}: CartDrawerProps) {
  const router = useRouter();
  const [postalCode, setPostalCode] = useState<string>('06600'); // Default Mexico City CDMX
  const [customerEmail, setCustomerEmail] = useState<string>('cliente@ejemplo.com');
  const [recipientName, setRecipientName] = useState<string>('Carlos Mendoza');
  const [street, setStreet] = useState<string>('Av. Reforma 222');
  const [city, setCity] = useState<string>('Ciudad de México');
  const [state, setState] = useState<string>('CDMX');

  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'simulated'>('stripe');
  const [rates, setRates] = useState<RateOption[]>([]);
  const [selectedRate, setSelectedRate] = useState<RateOption | null>(null);
  const [isQuotingRates, setIsQuotingRates] = useState<boolean>(false);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [isSavingCart, setIsSavingCart] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // Auto-fill customer info if logged in
  React.useEffect(() => {
    try {
      const storedUser = localStorage.getItem('nova_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.email) setCustomerEmail(user.email);
        if (user.firstName || user.lastName) {
          setRecipientName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
        }
      }
    } catch {
      // Ignore parse error
    }
  }, [isOpen]);

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.variant.price) * item.quantity,
    0,
  );
  const shippingCost = selectedRate
    ? Number(selectedRate.totalAmount ?? selectedRate.rateAmount ?? 0)
    : 0;
  const total = subtotal + shippingCost;

  // Fetch live shipping rates for active cart
  const handleQuoteRates = async () => {
    if (!postalCode || postalCode.length < 4 || items.length === 0) return;
    setIsQuotingRates(true);
    setErrorMsg(null);

    try {
      const quoted = await ecommerceApi.getCartRates({
        tenantId,
        destinationPostalCode: postalCode,
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      });
      const validRates = Array.isArray(quoted) ? quoted : (quoted as any)?.rates || [];
      setRates(validRates);
      if (validRates.length > 0) {
        setSelectedRate(validRates[0]);
      } else {
        setErrorMsg('No se encontraron paqueterías disponibles para este código postal.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cotizar envío para este código postal.');
    } finally {
      setIsQuotingRates(false);
    }
  };

  // Auto-cotizar al abrir si hay artículos y C.P.
  React.useEffect(() => {
    if (isOpen && items.length > 0 && rates.length === 0 && !isQuotingRates) {
      handleQuoteRates();
    }
  }, [isOpen, items.length]);

  // Enviar carrito abandonado por correo usando Resend y generar cupón
  const handleSaveAndSendAbandonedCart = async () => {
    if (!customerEmail || !customerEmail.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido para enviarte el carrito.');
      return;
    }
    setIsSavingCart(true);
    setErrorMsg(null);

    try {
      await ecommerceApi.recordAbandonedCart({
        tenantId,
        email: customerEmail,
        customerName: recipientName,
        items: items.map((i) => ({
          name: `${i.product.title} - ${i.variant.title}`,
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: Number(i.variant.price),
          image: i.product.imageUrl,
        })),
        totalAmount: total,
      });

      setNoticeMsg('Se ha enviado un correo con tu carrito guardado y un cupón de 10% de descuento (NOVA10).');
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo registrar el carrito abandonado.');
    } finally {
      setIsSavingCart(false);
    }
  };

  // Place order: Process via Stripe Checkout or simulated instant confirmation
  const handleCheckoutAndPay = async () => {
    if (!selectedRate) {
      setErrorMsg('Por favor selecciona una tarifa de envío.');
      return;
    }
    setIsCheckingOut(true);
    setErrorMsg(null);

    try {
      // 1. Create order
      const orderRes = await ecommerceApi.checkout({
        tenantId,
        customerEmail,
        shippingAddress: {
          recipientName,
          street,
          city,
          state,
          postalCode,
          country: 'MEX',
        },
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        selectedShippingRate: {
          carrierCode: selectedRate.carrierCode,
          serviceCode: selectedRate.serviceCode || selectedRate.serviceName,
          rateAmount: Number(selectedRate.totalAmount ?? selectedRate.rateAmount ?? 0),
          currency: selectedRate.currency || 'USD',
        },
        selectedCarrierRate: {
          carrierCode: selectedRate.carrierCode,
          serviceName: selectedRate.serviceName,
          totalAmount: Number(selectedRate.totalAmount ?? selectedRate.rateAmount ?? 0),
        },
      });

      const targetOrderId = orderRes.id || orderRes.orderId;
      if (!targetOrderId) {
        throw new Error('No se pudo obtener el identificador de la orden creada.');
      }

      if (paymentMethod === 'stripe') {
        // Redirigir a pasarela segura de Stripe Checkout
        const sessionRes = await ecommerceApi.createStripeCheckoutSession(targetOrderId);
        if (sessionRes.url) {
          localStorage.removeItem('nova_cart_items_v1');
          window.location.href = sessionRes.url;
          return;
        } else {
          throw new Error('No se recibió la URL de sesión de Stripe Checkout.');
        }
      }

      const resolvedOrderId = orderRes.orderId || orderRes.id;
      if (!resolvedOrderId) {
        throw new Error('No se pudo obtener el identificador de la orden creada.');
      }

      // Modo simulado directo
      const payRes = await ecommerceApi.confirmPayment({
        orderId: resolvedOrderId,
        provider: 'SIMULATED',
        paymentMethod: 'SIMULATED',
        transactionReference: `TX-${Date.now()}`,
      });

      setCreatedOrder({
        ...orderRes,
        id: resolvedOrderId,
        orderId: resolvedOrderId,
        ...(payRes.order || {}),
      });
      setCheckoutStep('success');
      onClearCart();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el pedido o pago.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-Over Panel */}
      <div className="relative z-10 w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl text-slate-100">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">Carrito de Compras</h3>
            <Badge variant="neutral">{items.reduce((s, i) => s + i.quantity, 0)} items</Badge>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400">
              {errorMsg}
            </div>
          )}

          {noticeMsg && (
            <div className="p-3 rounded-lg text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              {noticeMsg}
            </div>
          )}

          {checkoutStep === 'success' ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-white">¡Pedido Confirmado y Pagado!</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                El stock fue reservado atómicamente y la guía de envío está siendo generada por
                los workers en segundo plano.
              </p>
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-left space-y-1">
                <div>
                  <span className="text-slate-500">ID Pedido:</span>{' '}
                  <span className="font-mono text-slate-200">{createdOrder?.id?.slice(0, 18)}...</span>
                </div>
                <div>
                  <span className="text-slate-500">Total Pagado:</span>{' '}
                  <span className="font-semibold text-emerald-400">{formatCurrency(total)}</span>
                </div>
              </div>
              <div className="pt-4 flex flex-col gap-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    onClose();
                    router.push('/dashboard');
                  }}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Ver en Dashboard Logístico
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCheckoutStep('cart');
                    onClose();
                  }}
                >
                  Seguir Comprando
                </Button>
              </div>
            </div>
          ) : checkoutStep === 'checkout' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-sm font-semibold text-white">Datos de Entrega y Pago</h4>
                <button
                  type="button"
                  onClick={() => setCheckoutStep('cart')}
                  className="text-xs text-indigo-400 hover:underline"
                >
                  Volver al Carrito
                </button>
              </div>

              <Input
                label="Nombre Destinatario"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
              <Input
                label="Correo Electrónico (para recibo y seguimiento)"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
              <Input
                label="Dirección / Calle y Número"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Ciudad"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
                <Input
                  label="Estado"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>

              {/* Rate Selection confirmation */}
              {selectedRate && (
                <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-lg text-xs space-y-1">
                  <div className="flex items-center justify-between text-indigo-300 font-semibold">
                    <span>
                      Envío: {selectedRate.carrierName || selectedRate.carrierCode} ({selectedRate.serviceName})
                    </span>
                    <span>
                      {formatCurrency(Number(selectedRate.totalAmount ?? selectedRate.rateAmount ?? 0))}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Entrega estimada: {selectedRate.estimatedDeliveryDays} días hábiles
                  </p>
                </div>
              )}

              {/* Método de Pago */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('stripe')}
                    className={`p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      paymentMethod === 'stripe'
                        ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-semibold block text-indigo-300">Stripe Checkout</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Tarjetas de Crédito y Débito
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('simulated')}
                    className={`p-3 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                      paymentMethod === 'simulated'
                        ? 'border-indigo-500 bg-indigo-500/20 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-semibold block text-emerald-300">Simulación Inmediata</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Prueba directa sin pasarela
                    </span>
                  </button>
                </div>
              </div>

              {/* Abandoned Cart Save & Email Trigger */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isSavingCart}
                  onClick={handleSaveAndSendAbandonedCart}
                  className="w-full text-center py-2 px-3 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-800 text-indigo-400 text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingCart
                    ? 'Enviando carrito...'
                    : 'Guardar carrito y recibir cupón 10% por correo (Resend)'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Items List */}
              {items.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Tu carrito está vacío. Agrega productos de la tienda.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.variantId}
                      className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800"
                    >
                      <div className="w-12 h-12 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Truck className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-semibold text-white truncate">
                          {item.product.title}
                        </h5>
                        <p className="text-[11px] text-slate-400 truncate">
                          {item.variant.title} - {formatCurrency(Number(item.variant.price))}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateQuantity(item.variantId, Math.max(1, item.quantity - 1))
                            }
                            className="w-5 h-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center text-xs hover:bg-slate-700"
                          >
                            -
                          </button>
                          <span className="text-xs font-medium text-slate-200">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.variantId, item.quantity + 1)}
                            className="w-5 h-5 rounded bg-slate-800 text-slate-300 flex items-center justify-center text-xs hover:bg-slate-700"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-white block">
                          {formatCurrency(Number(item.variant.price) * item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.variantId)}
                          className="text-slate-500 hover:text-rose-400 p-1 mt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Shipping Rates Quotation Section */}
              {items.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-indigo-400" /> Cotizar Envío por C.P.
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="C.P. Destino (ej. 06600)"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleQuoteRates}
                      isLoading={isQuotingRates}
                    >
                      Cotizar
                    </Button>
                  </div>

                  {/* Quoted Rates List */}
                  {rates.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      <span className="text-[11px] text-slate-400 font-medium">
                        Paqueterías Disponibles:
                      </span>
                      {rates.map((rate, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedRate(rate)}
                          className={`p-2.5 rounded-lg border flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            selectedRate?.serviceName === rate.serviceName
                              ? 'bg-indigo-600/20 border-indigo-500 text-white'
                              : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <span className="font-semibold block">
                              {rate.carrierName || rate.carrierCode}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {rate.serviceName} ({rate.estimatedDeliveryDays} días)
                            </span>
                          </div>
                          <span className="font-bold text-emerald-400">
                            {formatCurrency(Number(rate.totalAmount ?? rate.rateAmount ?? 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Summary & Action */}
        {checkoutStep !== 'success' && items.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Envío</span>
                <span>{selectedRate ? formatCurrency(shippingCost) : 'Por calcular'}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-slate-800">
                <span>Total Estimado</span>
                <span className="text-indigo-400">{formatCurrency(total)}</span>
              </div>
            </div>

            {checkoutStep === 'cart' ? (
              <Button
                variant="primary"
                className="w-full"
                onClick={() => {
                  if (!selectedRate && rates.length === 0) {
                    handleQuoteRates();
                  }
                  setCheckoutStep('checkout');
                }}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Proceder al Pago
              </Button>
            ) : (
              <Button
                variant="primary"
                className="w-full"
                isLoading={isCheckingOut}
                onClick={handleCheckoutAndPay}
                leftIcon={<CreditCard className="w-4 h-4" />}
              >
                {paymentMethod === 'stripe'
                  ? 'Pagar con Stripe Checkout'
                  : 'Simular Pago y Generar Guía'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
