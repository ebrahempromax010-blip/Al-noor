import React, { useState } from 'react';
import { Check, Gem, Heart, MessageCircle, ShoppingBag, ZoomIn } from 'lucide-react';
import { motion } from 'motion/react';
import { Language, MarketRates, Product } from '../types/store';
import { t } from '../utils/i18n';
import {
  buildWhatsAppProductUrl,
  calculateProductPrice,
  formatCurrency,
} from '../utils/storeLogic';

interface ProductCardProps {
  product: Product;
  rates: MarketRates;
  lang: Language;
  whatsappNumber: string;
  storeName?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onZoom: (product: Product) => void;
  index: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  rates,
  lang,
  whatsappNumber,
  storeName,
  isFavorite = false,
  onToggleFavorite,
  onAddToCart,
  onZoom,
  index,
}) => {
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const copy = t(lang);

  const price = calculateProductPrice(product, rates, rates.autoLinkPrices);
  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const karatLabel =
    product.metal === 'silver'
      ? `${copy.silverPrefix} ${product.karat}`
      : `${copy.karatPrefix} ${product.karat}`;

  const whatsappUrl = buildWhatsAppProductUrl(
    whatsappNumber,
    product,
    price.finalPrice,
    lang,
    storeName
  );

  const handleAdd = () => {
    onAddToCart(product.id);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1100);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.04, 0.28),
        ease: [0.16, 1, 0.3, 1],
      }}
      className="hover-shimmer group flex flex-col overflow-hidden rounded-2xl border border-amber-500/20 bg-[#131A26] transition-transform duration-200 hover:-translate-y-0.5 hover:border-amber-400/45"
    >
      {/* Image Container with Zoom Trigger */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#0B0F17]">
        <button
          type="button"
          onClick={() => onZoom(product)}
          aria-label={`${name} — ${copy.zoomHint}`}
          className="relative block h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          {!imgError && product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1B2435] to-[#0B0F17] p-4 text-amber-400/60">
              <Gem className="h-10 w-10" />
              <span className="text-xs text-slate-400 text-center line-clamp-1">{name}</span>
            </div>
          )}

          {/* Subtle Zoom Hint on Hover */}
          <span className="pointer-events-none absolute bottom-2.5 end-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-black/65 text-amber-300 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <ZoomIn className="h-4 w-4" />
          </span>
        </button>

        {/* Karat Badge */}
        <span className="pointer-events-none absolute top-3 start-3 rounded-lg border border-amber-400/40 bg-[#0B0F17]/85 px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-sm">
          {karatLabel}
        </span>

        {/* Pulsing Discount Badge if active */}
        {price.hasDiscount && (
          <span className="pointer-events-none absolute top-3 end-3 animate-pulse rounded-lg bg-gradient-to-r from-rose-600 to-amber-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
            {copy.discountTag} {product.discountPercent}%
          </span>
        )}

        {/* Wishlist Heart Toggle Button */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(product.id);
            }}
            aria-pressed={isFavorite}
            aria-label={
              isFavorite
                ? `${copy.removeFromFavorites}: ${name}`
                : `${copy.addToFavorites}: ${name}`
            }
            className={`absolute bottom-2.5 start-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-xl border backdrop-blur-sm transition active:scale-90 cursor-pointer ${
              isFavorite
                ? 'border-rose-400/70 bg-rose-500/25 text-rose-400 shadow-lg shadow-rose-950/40'
                : 'border-amber-500/30 bg-[#0B0F17]/80 text-slate-200 hover:border-rose-400/60 hover:text-rose-400'
            }`}
          >
            <Heart
              className={`h-4 w-4 transition-transform ${
                isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : ''
              }`}
            />
          </button>
        )}
      </div>

      {/* Product Details */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Clean Unboxed Metadata */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono-tabular">{product.code}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-tabular">
            {product.weightGrams} {copy.gram}
          </span>
        </div>

        <h2 className="mt-1.5 text-base font-bold leading-snug text-white line-clamp-2">
          {name}
        </h2>

        {/* Price Row */}
        <div className="mt-auto pt-3 flex flex-wrap items-baseline gap-2.5">
          <span className="font-mono-tabular text-lg font-extrabold text-amber-300">
            {formatCurrency(price.finalPrice, lang)}
          </span>
          {price.hasDiscount && (
            <span className="font-mono-tabular text-xs text-slate-400 line-through">
              {formatCurrency(price.originalPrice, lang)}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleAdd}
            className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
              justAdded
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-slate-950 hover:brightness-110 active:scale-[0.98]'
            }`}
          >
            {justAdded ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            <span>{justAdded ? copy.addedToCart : copy.addToCart}</span>
          </button>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25 hover:text-emerald-200"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{copy.orderWhatsapp}</span>
          </a>
        </div>
      </div>
    </motion.article>
  );
};
