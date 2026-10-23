'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Product, ProductVariant, CartItem } from '@/types';
import { ProductCard } from '@/components/store/ProductCard';
import { CartDrawer } from '@/components/store/CartDrawer';
import { ecommerceApi } from '@/lib/api-client';
import { Store, ShoppingBag, Search, Sparkles, CheckCircle2, AlertCircle, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// Fallback seed products matching backend database seed
const SEED_PRODUCTS: Product[] = [
  {
    id: 'prod-seed-1',
    tenantId: 'tenant-nova-1',
    title: 'Teclado Mecánico Custom Titanium 75%',
    slug: 'teclado-mecanico-custom-titanium',
    description:
      'Chasis de aluminio anodizado CNC, switches lubricados de fábrica y keycaps PBT doubleshot. Conexión tri-mode 2.4GHz / Bluetooth / Type-C.',
    category: 'Tecnología',
    imageUrl:
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    createdAt: new Date().toISOString(),
    variants: [
      {
        id: 'var-1a',
        productId: 'prod-seed-1',
        sku: 'KB-TITAN-GATERON-YELLOW',
        title: 'Switches Lineales Gateron Yellow',
        price: 2499.0,
        compareAtPrice: 2899.0,
        stockQuantity: 25,
        weightKg: 1.2,
        lengthCm: 32,
        widthCm: 14,
        heightCm: 4,
      },
      {
        id: 'var-1b',
        productId: 'prod-seed-1',
        sku: 'KB-TITAN-TACTILE-BROWN',
        title: 'Switches Táctiles Holy Panda',
        price: 2699.0,
        compareAtPrice: 3100.0,
        stockQuantity: 15,
        weightKg: 1.2,
        lengthCm: 32,
        widthCm: 14,
        heightCm: 4,
      },
    ],
  },
  {
    id: 'prod-seed-2',
    tenantId: 'tenant-nova-1',
    title: 'Tenis Ultralight Carbon Trail Running',
    slug: 'tenis-ultralight-carbon-trail',
    description:
      'Placa propulsora de fibra de carbono integrada, amortiguación de espuma Pebax reactiva y suela Vibram Megagrip para tracción extrema en terrenos técnicos.',
    category: 'Calzado',
    imageUrl:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    createdAt: new Date().toISOString(),
    variants: [
      {
        id: 'var-2a',
        productId: 'prod-seed-2',
        sku: 'SHOE-CARBON-27MX',
        title: 'Talla 27.0 MX (9.0 US)',
        price: 3899.0,
        compareAtPrice: 4299.0,
        stockQuantity: 12,
        weightKg: 0.8,
        lengthCm: 34,
        widthCm: 22,
        heightCm: 12,
      },
      {
        id: 'var-2b',
        productId: 'prod-seed-2',
        sku: 'SHOE-CARBON-28MX',
        title: 'Talla 28.0 MX (10.0 US)',
        price: 3899.0,
        compareAtPrice: 4299.0,
        stockQuantity: 8,
        weightKg: 0.85,
        lengthCm: 34,
        widthCm: 22,
        heightCm: 12,
      },
    ],
  },
  {
    id: 'prod-seed-3',
    tenantId: 'tenant-nova-1',
    title: 'Sudadera Minimalist Lana Merino 100%',
    slug: 'sudadera-minimalist-merino-wool',
    description:
      'Tejido térmico ultra-fino de 260g/m² transpirable y resistente a olores. Corte ergonómico con costuras planas Flatlock para máximo confort.',
    category: 'Ropa',
    imageUrl:
      'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
    isActive: true,
    createdAt: new Date().toISOString(),
    variants: [
      {
        id: 'var-3a',
        productId: 'prod-seed-3',
        sku: 'HOODIE-MERINO-M-BLK',
        title: 'Mediana (M) - Negro Carbón',
        price: 1850.0,
        compareAtPrice: 2100.0,
        stockQuantity: 30,
        weightKg: 0.5,
        lengthCm: 30,
        widthCm: 25,
        heightCm: 5,
      },
      {
        id: 'var-3b',
        productId: 'prod-seed-3',
        sku: 'HOODIE-MERINO-L-BLK',
        title: 'Grande (L) - Negro Carbón',
        price: 1850.0,
        compareAtPrice: 2100.0,
        stockQuantity: 20,
        weightKg: 0.55,
        lengthCm: 30,
        widthCm: 25,
        heightCm: 5,
      },
    ],
  },
];

/**
 * Storefront Content Component with SearchParams and LocalStorage Hydration.
 */
function StoreContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [tenantId, setTenantId] = useState<string>('1e2f376f-d11a-45a9-835e-67f67fdf3e7e');
  const [bannerNotice, setBannerNotice] = useState<{
    type: 'success' | 'warning' | 'info';
    title: string;
    description: string;
  } | null>(null);

  // 1. Hydrate cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nova_cart_items_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCartItems(parsed);
        }
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  // 2. Synchronize active cart to localStorage
  useEffect(() => {
    try {
      if (cartItems.length > 0) {
        localStorage.setItem('nova_cart_items_v1', JSON.stringify(cartItems));
      } else {
        localStorage.removeItem('nova_cart_items_v1');
      }
    } catch {
      // Ignore storage error
    }
  }, [cartItems]);

  // 3. Load live products from backend catalog API
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const liveProducts = await ecommerceApi.getProducts({ tenantSlug: 'nova-store' });
        if (liveProducts && liveProducts.length > 0) {
          const fallbackImages = [
            'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=600&q=80',
          ];
          const enriched = liveProducts.map((p, idx) => ({
            ...p,
            imageUrl: p.imageUrl || fallbackImages[idx % fallbackImages.length],
          }));
          setProducts(enriched);
          if (liveProducts[0]?.tenantId) {
            setTenantId(liveProducts[0].tenantId);
          }
        }
      } catch {
        // Keeps graceful fallback seed products
      }
    };
    fetchCatalog();
  }, []);

  // 4. Handle URL search params: payment_success, payment_canceled, recover_cart
  useEffect(() => {
    const isPaymentSuccess = searchParams.get('payment_success');
    const isPaymentCanceled = searchParams.get('payment_canceled');
    const recoverCartToken = searchParams.get('recover_cart');

    if (isPaymentSuccess === 'true') {
      localStorage.removeItem('nova_cart_items_v1');
      setCartItems([]);
      setBannerNotice({
        type: 'success',
        title: '¡Pago Confirmado con Éxito con Stripe!',
        description:
          'Tu orden fue procesada correctamente. Se ha enviado un recibo detallado a tu correo electrónico vía Resend y la guía de despacho ha sido asignada.',
      });
    } else if (isPaymentCanceled === 'true') {
      setBannerNotice({
        type: 'warning',
        title: 'Pago Cancelado en Stripe Checkout',
        description:
          'La transacción no se completó. Tus productos siguen resguardados en tu carrito de compras para cuando desees reanudar la orden.',
      });
    } else if (recoverCartToken) {
      // Restore abandoned cart via backend token
      ecommerceApi
        .recoverCart(recoverCartToken)
        .then((res) => {
          if (res.items && Array.isArray(res.items)) {
            // Reconstruct cart items
            const restoredItems: CartItem[] = res.items.map((rawItem: any, idx: number) => {
              const matchedProduct = products.find((p) =>
                p.variants?.some((v) => v.id === rawItem.variantId),
              ) || {
                id: `prod-recovered-${idx}`,
                tenantId: 'tenant-nova-1',
                title: rawItem.name || 'Producto Restaurado',
                slug: 'producto-restaurado',
                category: 'General',
                imageUrl: rawItem.image,
                isActive: true,
                createdAt: new Date().toISOString(),
                variants: [],
              };

              const matchedVariant = matchedProduct.variants?.find(
                (v) => v.id === rawItem.variantId,
              ) || {
                id: rawItem.variantId || `var-recovered-${idx}`,
                productId: matchedProduct.id,
                sku: `SKU-REC-${idx}`,
                title: 'Estándar',
                price: rawItem.unitPrice || 0,
                stockQuantity: 10,
                weightKg: 1,
                lengthCm: 20,
                widthCm: 15,
                heightCm: 10,
              };

              return {
                variantId: matchedVariant.id,
                product: matchedProduct,
                variant: matchedVariant,
                quantity: rawItem.quantity || 1,
              };
            });

            setCartItems(restoredItems);
            setIsCartOpen(true);
            setBannerNotice({
              type: 'info',
              title: '¡Carrito Abandonado Recuperado con Éxito!',
              description: `Hola ${res.customerName || 'estimado cliente'}, tus productos han sido restablecidos en el carrito. Utiliza el cupón NOVA10 para obtener un 10% de descuento adicional.`,
            });
          }
        })
        .catch(() => {
          setBannerNotice({
            type: 'warning',
            title: 'Enlace de Recuperación Expirado',
            description:
              'El enlace para restablecer el carrito abandonado ya fue utilizado o no es válido.',
          });
        });
    }
  }, [searchParams, products]);

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories = ['ALL', 'Tecnología', 'Calzado', 'Ropa'];

  // Add to cart handler
  const handleAddToCart = (product: Product, variant: ProductVariant, quantity: number) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.variantId === variant.id);
      if (existing) {
        return prev.map((i) =>
          i.variantId === variant.id ? { ...i, quantity: i.quantity + quantity } : i,
        );
      }
      return [...prev, { variantId: variant.id, product, variant, quantity }];
    });
  };

  const handleUpdateQuantity = (variantId: string, quantity: number) => {
    setCartItems((prev) =>
      prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
    );
  };

  const handleRemoveItem = (variantId: string) => {
    setCartItems((prev) => prev.filter((i) => i.variantId !== variantId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    try {
      localStorage.removeItem('nova_cart_items_v1');
    } catch {
      // Ignore
    }
  };

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Dynamic Status / Recovery / Payment Banner */}
      {bannerNotice && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 shadow-lg ${
            bannerNotice.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : bannerNotice.type === 'warning'
              ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
              : 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
          }`}
        >
          <div className="flex items-start gap-3">
            {bannerNotice.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : bannerNotice.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <Tag className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-sm font-bold text-white">{bannerNotice.title}</h4>
              <p className="text-xs text-slate-300 mt-0.5">{bannerNotice.description}</p>
            </div>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Store Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 sm:p-12 overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nova Logistics Store Demo</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Comercio Electrónico con Logística Automatizada
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2">
            Compra productos de alta gama con cotización dinámica en el carrito, reserva atómica de
            inventario y generación de guía en tiempo real.
          </p>
        </div>

        {/* Floating Cart Button in Store */}
        <div className="mt-6 sm:mt-0 sm:absolute sm:top-8 sm:right-8">
          <Button
            variant="primary"
            onClick={() => setIsCartOpen(true)}
            leftIcon={<ShoppingBag className="w-4 h-4" />}
          >
            <span>Ver Carrito ({totalCartCount})</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'Todos los Productos' : cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 pl-9 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="py-16 text-center text-slate-500 text-sm">
          No se encontraron productos que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        tenantId={tenantId}
      />
    </div>
  );
}

/**
 * Storefront Page with Suspense boundary for Next.js client-side search parameters.
 */
export default function StorePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
          Cargando catálogo de tienda...
        </div>
      }
    >
      <StoreContent />
    </Suspense>
  );
}
