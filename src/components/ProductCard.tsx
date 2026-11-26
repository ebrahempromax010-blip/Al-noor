import React, { memo, useState } from 'react';
import { Expand, PlayCircle, ShoppingCart, Video } from 'lucide-react';
import { Language, LayoutStyle, Product } from '../types/store';
import { calculateDiscountedPrice, getCategoryGroupLabel } from '../utils/storeLogic';

interface ProductCardProps {
  product: Product;
  lang: Language;
  currency: string;
  layoutStyle?: LayoutStyle;
  onAddToCart: (product: Product) => void;
  onZoom: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = memo(({
  product,
  lang,
  currency,
  layoutStyle = 'modern_grid',
  onAddToCart,
  onZoom,
}) => {
  const [showInlineVideo, setShowInlineVideo] = useState(false);

  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const specs = lang === 'ar' ? product.specsAr : product.specsEn;
  const finalPrice = calculateDiscountedPrice(product.price, product.discountPercent);
  const hasDiscount = (product.discountPercent || 0) > 0;
  const hasVideo = Boolean(product.videoUrl && product.videoUrl.trim());

  const isWide = layoutStyle === 'executive_wide';

  return (
    <article
      data-testid={`product-card-${product.id}`}
      className={`tech-surface cv-auto gpu-accelerated group flex ${
        isWide ? 'flex-col sm:flex-row' : 'flex-col'
      } overflow-hidden rounded-2xl border shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:border-blue-500/45 hover:shadow-lg`}
    >
      {/* Media Box */}
      <div
        className={`relative overflow-hidden bg-slate-900 ${
          isWide ? 'aspect-[4/3] sm:w-64 shrink-0' : 'aspect-[4/3] w-full'
        }`}
      >
        {showInlineVideo && hasVideo ? (
          <video
            src={product.videoUrl}
            controls
            autoPlay
            playsInline
            preload="none"
            className="h-full w-full object-cover"
          />
        ) : (
          <img
            src={product.imageUrl}
            alt={name}
            loading="lazy"
            decoding="async"
            onClick={() => onZoom(product)}
            className="h-full w-full cursor-pointer object-cover transition-transform duration-200 will-change-transform group-hover:scale-[1.03]"
          />
        )}

        {hasDiscount && (
          <span className="absolute top-2.5 start-2.5 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-extrabold text-white shadow">
            -{product.discountPercent}%
          </span>
        )}

        <div className="absolute bottom-2.5 end-2.5 flex items-center gap-1.5">
          {hasVideo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowInlineVideo((prev) => !prev);
              }}
              aria-label={lang === 'ar' ? 'تشغيل الفيديو الترويجي' : 'Play promo video'}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-950/80 px-2 py-1 text-[11px] font-bold text-sky-300 backdrop-blur-sm transition hover:bg-blue-600 hover:text-white"
            >
              {showInlineVideo ? (
                <Video className="h-3.5 w-3.5" />
              ) : (
                <PlayCircle className="h-3.5 w-3.5" />
              )}
              <span>{lang === 'ar' ? (showInlineVideo ? 'الصورة' : 'فيديو') : showInlineVideo ? 'Photo' : 'Video'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onZoom(product)}
            aria-label={lang === 'ar' ? 'معاينة التفاصيل' : 'Quick preview'}
            className="rounded-lg bg-slate-950/80 p-1.5 text-white backdrop-blur-sm transition hover:bg-blue-600"
          >
            <Expand className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wide text-blue-500">
            <span className="truncate">{product.brand || 'Tech Pro'}</span>
            <span className="tech-text-secondary font-normal">
              {getCategoryGroupLabel(product.categoryGroup, lang)}
            </span>
          </div>

          <h3
            onClick={() => onZoom(product)}
            className="line-clamp-2 cursor-pointer text-sm sm:text-base font-extrabold leading-snug hover:text-blue-500 transition-colors"
          >
            {name}
          </h3>

          <p className="tech-text-secondary line-clamp-2 text-xs leading-relaxed">
            {specs}
          </p>
        </div>

        <div className="mt-4 flex items-end justify-between gap-2 border-t border-inherit pt-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono-tabular text-base sm:text-lg font-extrabold text-blue-600 dark:text-sky-400">
                {finalPrice.toLocaleString('en-US')}
              </span>
              <span className="text-xs font-bold">{currency}</span>
            </div>
            {hasDiscount && (
              <span className="tech-text-secondary font-mono-tabular text-xs line-through">
                {product.price.toLocaleString('en-US')} {currency}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={() => onAddToCart(product)}
            data-testid={`add-to-cart-${product.id}`}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold transition ${
              product.inStock
                ? 'tech-accent-btn shadow-sm active:scale-[0.98]'
                : 'cursor-not-allowed bg-slate-500/20 tech-text-secondary'
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>
              {product.inStock
                ? lang === 'ar'
                  ? 'أضف للسلة'
                  : 'Add'
                : lang === 'ar'
                  ? 'نفذت الكمية'
                  : 'Out'}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
});
