'use client';

import React, { useState } from 'react';
import { Product, ProductVariant } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBag, Check } from 'lucide-react';

export interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
}

/**
 * Product Card Component for E-Commerce Storefront.
 * Includes variant selection (sizes/models), price updates, inventory check, and Add-to-Cart.
 */
export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants?.[0]?.id || '',
  );
  const [isAdded, setIsAdded] = useState<boolean>(false);

  const selectedVariant =
    product.variants?.find((v) => v.id === selectedVariantId) || product.variants?.[0];

  const handleAdd = () => {
    if (!selectedVariant) return;
    onAddToCart(product, selectedVariant, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1200);
  };

  const isOutOfStock = !selectedVariant || selectedVariant.stockQuantity <= 0;

  return (
    <Card hoverEffect className="flex flex-col justify-between overflow-hidden group">
      <div>
        {/* Product Image Preview */}
        <div className="relative aspect-square w-full rounded-lg bg-slate-950/80 overflow-hidden mb-4 border border-slate-800">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
              <ShoppingBag className="w-12 h-12 mb-2 stroke-[1.5]" />
              <span className="text-xs">Sin imagen</span>
            </div>
          )}

          {/* Category Tag */}
          <div className="absolute top-2.5 left-2.5">
            <Badge variant="info">{product.category}</Badge>
          </div>

          {/* Stock Tag */}
          <div className="absolute top-2.5 right-2.5">
            {isOutOfStock ? (
              <Badge variant="danger">Agotado</Badge>
            ) : (
              <Badge variant="success">{selectedVariant.stockQuantity} disponibles</Badge>
            )}
          </div>
        </div>

        {/* Product Title and Description */}
        <h4 className="font-semibold text-base text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
          {product.title}
        </h4>
        <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
          {product.description || 'Producto premium disponible con entrega garantizada.'}
        </p>

        {/* Variants Selector */}
        {product.variants && product.variants.length > 1 && (
          <div className="mt-3">
            <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
              Variante / Modelo:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {product.variants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    selectedVariantId === variant.id
                      ? 'bg-indigo-600 text-white border-indigo-500'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {variant.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pricing & Add To Cart Button */}
      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
        <div>
          <span className="text-[11px] text-slate-400 block">Precio</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-white">
              {formatCurrency(Number(selectedVariant?.price || 0))}
            </span>
            {selectedVariant?.compareAtPrice && (
              <span className="text-xs text-slate-500 line-through">
                {formatCurrency(Number(selectedVariant.compareAtPrice))}
              </span>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant={isAdded ? 'secondary' : 'primary'}
          disabled={isOutOfStock}
          onClick={handleAdd}
          leftIcon={
            isAdded ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShoppingBag className="w-4 h-4" />
            )
          }
        >
          {isAdded ? 'Agregado' : 'Agregar'}
        </Button>
      </div>
    </Card>
  );
}
