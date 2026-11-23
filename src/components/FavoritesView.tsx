import React from 'react';
import { ArrowLeft, ArrowRight, Heart, Trash2 } from 'lucide-react';
import { Language, MarketRates, Product } from '../types/store';
import { t } from '../utils/i18n';
import { ProductCard } from './ProductCard';

interface FavoritesViewProps {
  lang: Language;
  favoriteProducts: Product[];
  rates: MarketRates;
  whatsappNumber: string;
  onToggleFavorite: (productId: string) => void;
  onClearFavorites: () => void;
  onAddToCart: (productId: string) => void;
  onZoom: (product: Product) => void;
  onBackToStore: () => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  lang,
  favoriteProducts,
  rates,
  whatsappNumber,
  onToggleFavorite,
  onClearFavorites,
  onAddToCart,
  onZoom,
  onBackToStore,
}) => {
  const copy = t(lang);

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 pb-28 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rose-500/25 bg-[#131A26] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-500/35 bg-rose-500/15 text-rose-400">
            <Heart className="h-5 w-5 fill-rose-500" />
          </span>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                {copy.favoritesTitle}
              </h1>
              <span className="font-mono-tabular rounded-lg border border-rose-400/35 bg-rose-500/15 px-2 py-0.5 text-xs font-bold text-rose-300">
                {favoriteProducts.length}
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-300">
              {copy.favoritesSubtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {favoriteProducts.length > 0 && (
            <button
              type="button"
              onClick={onClearFavorites}
              className="flex min-h-[42px] items-center gap-1.5 rounded-xl border border-rose-500/35 bg-rose-500/10 px-4 py-2 text-xs sm:text-sm font-bold text-rose-300 hover:bg-rose-500/20 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>{copy.clearFavorites}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onBackToStore}
            className="flex min-h-[42px] items-center gap-2 rounded-xl border border-amber-400/40 bg-[#0B0F17] px-4 py-2 text-xs sm:text-sm font-bold text-amber-200 hover:bg-amber-500/15 cursor-pointer"
          >
            {lang === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            <span>{copy.backToStore}</span>
          </button>
        </div>
      </div>

      {/* Empty or Saved Products Grid */}
      {favoriteProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/20 bg-[#131A26] py-16 px-6 text-center">
          <Heart className="h-12 w-12 text-rose-400/50" />
          <p className="mt-3 text-base sm:text-lg font-bold text-white">
            {copy.favoritesEmpty}
          </p>
          <p className="mt-1.5 max-w-md text-xs sm:text-sm text-slate-400">
            {copy.favoritesEmptySub}
          </p>
          <button
            type="button"
            onClick={onBackToStore}
            className="mt-5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] px-6 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:brightness-110 cursor-pointer"
          >
            {copy.browseJewelry}
          </button>
        </div>
      ) : (
        <section
          aria-label={copy.favoritesTitle}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {favoriteProducts.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              rates={rates}
              lang={lang}
              whatsappNumber={whatsappNumber}
              isFavorite={true}
              onToggleFavorite={onToggleFavorite}
              onAddToCart={onAddToCart}
              onZoom={onZoom}
              index={idx}
            />
          ))}
        </section>
      )}
    </div>
  );
};
