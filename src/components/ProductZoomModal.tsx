import React from 'react';
import { CheckCircle2, Play, ShoppingCart, Tag, X } from 'lucide-react';
import { Language, Product } from '../types/store';
import { calculateDiscountedPrice, getCategoryGroupLabel } from '../utils/storeLogic';

interface ProductZoomModalProps {
  product: Product | null;
  lang: Language;
  currency: string;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export const ProductZoomModal: React.FC<ProductZoomModalProps> = ({
  product,
  lang,
  currency,
  onClose,
  onAddToCart,
}) => {
  if (!product) return null;

  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const specs = lang === 'ar' ? product.specsAr : product.specsEn;
  const finalPrice = calculateDiscountedPrice(product.price, product.discountPercent);
  const hasDiscount = (product.discountPercent || 0) > 0;
  const hasVideo = Boolean(product.videoUrl && product.videoUrl.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="tech-surface animate-panel-in flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-slate-950 md:w-1/2 flex flex-col justify-center">
          <img
            src={product.imageUrl}
            alt={name}
            decoding="async"
            className="max-h-72 w-full object-cover md:max-h-96"
          />
          {hasVideo && (
            <div className="border-t border-slate-800 bg-slate-950 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-sky-400">
                <Play className="h-3.5 w-3.5" />
                <span>{lang === 'ar' ? 'فيديو استعراض المنتج' : 'Product Promo Video'}</span>
              </div>
              <video
                src={product.videoUrl}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-48 rounded-lg bg-black object-contain"
              />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between overflow-y-auto p-6">
          <div>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-500">
                <span>{product.brand}</span>
                <span>•</span>
                <span>{getCategoryGroupLabel(product.categoryGroup, lang)}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                className="tech-surface-muted rounded-lg border p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold leading-snug mb-3">{name}</h2>

            <div className="tech-surface-muted rounded-xl border p-3.5 text-xs sm:text-sm leading-relaxed mb-4">
              <p className="font-bold mb-1">
                {lang === 'ar' ? 'المواصفات الفنية:' : 'Technical Specifications:'}
              </p>
              <p className="tech-text-secondary">{specs}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs tech-text-secondary mb-4">
              <span className="inline-flex items-center gap-1 font-mono-tabular">
                <Tag className="h-3.5 w-3.5 text-blue-500" />
                SKU: {product.sku}
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-500 font-bold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {product.inStock
                  ? lang === 'ar'
                    ? 'متوفر الآن بالضمان الرسمي'
                    : 'In Stock with Official Warranty'
                  : lang === 'ar'
                    ? 'نفذت الكمية حالياً'
                    : 'Currently Out of Stock'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-inherit pt-4">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono-tabular text-2xl font-extrabold text-blue-600 dark:text-sky-400">
                  {finalPrice.toLocaleString('en-US')}
                </span>
                <span className="text-sm font-bold">{currency}</span>
              </div>
              {hasDiscount && (
                <span className="tech-text-secondary font-mono-tabular text-xs line-through block">
                  {product.price.toLocaleString('en-US')} {currency}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={!product.inStock}
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
              className="tech-accent-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold shadow-md transition disabled:opacity-50"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>
                {lang === 'ar' ? 'أضف لسلة المشتريات' : 'Add to Shopping Cart'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
