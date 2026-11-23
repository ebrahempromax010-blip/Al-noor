import React from 'react';
import { ArrowLeft, ArrowRight, Crown, Heart, Watch } from 'lucide-react';
import { Language, MarketRates, Product } from '../types/store';
import { t } from '../utils/i18n';
import { ProductCard } from './ProductCard';

interface CategoriesGroupViewProps {
  lang: Language;
  products: Product[];
  rates: MarketRates;
  whatsappNumber: string;
  wishlistIds: string[];
  onToggleFavorite: (productId: string) => void;
  onAddToCart: (productId: string) => void;
  onZoom: (product: Product) => void;
  onFilterInStore: (categoryId: string) => void;
  onBackToStore: () => void;
}

export const CategoriesGroupView: React.FC<CategoriesGroupViewProps> = ({
  lang,
  products,
  rates,
  whatsappNumber,
  wishlistIds,
  onToggleFavorite,
  onAddToCart,
  onZoom,
  onFilterInStore,
  onBackToStore,
}) => {
  const copy = t(lang);

  const groups = [
    {
      id: 'women',
      title: copy.groupWomen,
      icon: <Crown className="h-5 w-5 text-amber-400" />,
      items: products.filter((p) => p.categoryId === 'women'),
    },
    {
      id: 'men',
      title: copy.groupMen,
      icon: <Watch className="h-5 w-5 text-sky-400" />,
      items: products.filter((p) => p.categoryId === 'men'),
    },
    {
      id: 'kids',
      title: copy.groupChildren,
      icon: <Heart className="h-5 w-5 text-rose-400" />,
      items: products.filter((p) => p.categoryId === 'kids'),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 pb-28 sm:px-6 space-y-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/25 bg-[#131A26] p-5 sm:p-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-amber-300">
            {copy.categoriesHubTitle}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-300">
            {copy.categoriesHubSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToStore}
          className="flex min-h-[42px] items-center gap-2 rounded-xl border border-amber-400/40 bg-[#0B0F17] px-4 py-2 text-xs sm:text-sm font-bold text-amber-200 hover:bg-amber-500/15 cursor-pointer"
        >
          {lang === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          <span>{copy.backToStore}</span>
        </button>
      </div>

      {/* Grouped Sections: Women, Men, Children */}
      {groups.map((group) => (
        <section
          key={group.id}
          aria-label={group.title}
          className="space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/25 bg-[#131A26]">
                {group.icon}
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">{group.title}</h2>
                <span className="font-mono-tabular text-xs text-slate-400">
                  {group.items.length} {lang === 'ar' ? 'منتج' : 'items'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onFilterInStore(group.id)}
              className="rounded-xl border border-amber-500/30 bg-[#131A26] px-4 py-2 text-xs font-bold text-amber-300 hover:border-amber-400 hover:text-white cursor-pointer"
            >
              {copy.viewAllInCategory}
            </button>
          </div>

          {group.items.length === 0 ? (
            <div className="rounded-2xl border border-amber-500/15 bg-[#131A26] p-6 text-center text-sm text-slate-400">
              {copy.noProductsFound}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((product, idx) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  rates={rates}
                  lang={lang}
                  whatsappNumber={whatsappNumber}
                  isFavorite={wishlistIds.includes(product.id)}
                  onToggleFavorite={onToggleFavorite}
                  onAddToCart={onAddToCart}
                  onZoom={onZoom}
                  index={idx}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
};
