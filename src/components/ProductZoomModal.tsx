import React, { useState } from 'react';
import { Gem, MessageCircle, ShoppingBag, X } from 'lucide-react';
import { Language, MarketRates, Product } from '../types/store';
import { t } from '../utils/i18n';
import {
  buildWhatsAppProductUrl,
  calculateProductPrice,
  formatCurrency,
} from '../utils/storeLogic';

interface ProductZoomModalProps {
  product: Product | null;
  rates: MarketRates;
  lang: Language;
  whatsappNumber: string;
  onClose: () => void;
  onAddToCart: (productId: string) => void;
}

export const ProductZoomModal: React.FC<ProductZoomModalProps> = ({
  product,
  rates,
  lang,
  whatsappNumber,
  onClose,
  onAddToCart,
}) => {
  const [zoomed, setZoomed] = useState(false);

  if (!product) return null;

  const copy = t(lang);
  const price = calculateProductPrice(product, rates, rates.autoLinkPrices);
  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const description = lang === 'ar' ? product.descriptionAr : product.descriptionEn;
  const whatsappUrl = buildWhatsAppProductUrl(
    whatsappNumber,
    product,
    price.finalPrice,
    lang
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-amber-500/30 bg-[#131A26] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="absolute top-3 end-3 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/65 text-white transition hover:bg-black cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12">
          <div
            className="relative md:col-span-7 overflow-hidden bg-[#0B0F17] cursor-zoom-in"
            onClick={() => setZoomed((z) => !z)}
          >
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={name}
                referrerPolicy="no-referrer"
                className={`h-72 sm:h-96 md:h-full w-full object-cover transition-transform duration-300 ${
                  zoomed ? 'scale-150 cursor-zoom-out' : 'scale-100'
                }`}
              />
            ) : (
              <div className="flex h-72 items-center justify-center text-amber-400/50">
                <Gem className="h-14 w-14" />
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between p-5 sm:p-6 md:col-span-5">
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                <span>
                  {product.metal === 'silver'
                    ? `${copy.silverPrefix} ${product.karat}`
                    : `${copy.karatPrefix} ${product.karat}`}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-slate-400">{product.code}</span>
              </div>

              <h2 className="mt-2 text-xl font-bold text-white leading-snug">{name}</h2>

              {description && (
                <p className="mt-2.5 text-sm leading-relaxed text-slate-300">{description}</p>
              )}

              <div className="mt-4 space-y-2 border-t border-amber-500/15 pt-4 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">{copy.metal}</span>
                  <span>{product.metal === 'gold' ? copy.gold : copy.silver}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{copy.weight}</span>
                  <span className="font-mono-tabular font-semibold">
                    {product.weightGrams} {copy.gram}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-amber-500/15 pt-4">
              <div className="flex items-baseline gap-2.5">
                <span className="font-mono-tabular text-2xl font-extrabold text-amber-300">
                  {formatCurrency(price.finalPrice, lang)}
                </span>
                {price.hasDiscount && (
                  <span className="font-mono-tabular text-sm text-slate-400 line-through">
                    {formatCurrency(price.originalPrice, lang)}
                  </span>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(product.id);
                    onClose();
                  }}
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] px-4 py-2.5 text-sm font-bold text-slate-950 hover:brightness-110 cursor-pointer"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>{copy.addToCart}</span>
                </button>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-300 hover:bg-emerald-500/25"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>{copy.orderWhatsapp}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
