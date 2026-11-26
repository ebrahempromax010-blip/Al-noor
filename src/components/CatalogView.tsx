import React, { memo, useMemo } from 'react';
import { ArrowUpDown, Headphones, Laptop, LayoutGrid, Percent, RotateCcw } from 'lucide-react';
import {
  CatalogCategoryTab,
  CatalogSortOption,
  Language,
  LayoutStyle,
  Product,
} from '../types/store';
import { filterAndSortTechProducts } from '../utils/storeLogic';
import { CurrencyCode } from '../utils/currencyLogic';
import { ProductCard } from './ProductCard';

interface CatalogViewProps {
  lang: Language;
  currency: string;
  displayCurrency?: CurrencyCode;
  exchangeRates?: Record<CurrencyCode, number>;
  layoutStyle: LayoutStyle;
  products: Product[];
  categoryTab: CatalogCategoryTab;
  sortBy: CatalogSortOption;
  searchQuery: string;
  onCategoryChange: (cat: CatalogCategoryTab) => void;
  onSortChange: (sort: CatalogSortOption) => void;
  onResetFilters: () => void;
  onAddToCart: (product: Product) => void;
  onZoomProduct: (product: Product) => void;
}

export const CatalogView: React.FC<CatalogViewProps> = memo(({
  lang,
  currency,
  displayCurrency,
  exchangeRates,
  layoutStyle,
  products,
  categoryTab,
  sortBy,
  searchQuery,
  onCategoryChange,
  onSortChange,
  onResetFilters,
  onAddToCart,
  onZoomProduct,
}) => {
  const filtered = useMemo(
    () =>
      filterAndSortTechProducts(products, {
        categoryTab,
        searchQuery,
        sortBy,
      }),
    [products, categoryTab, searchQuery, sortBy]
  );

  const tabs: Array<{
    id: CatalogCategoryTab;
    labelAr: string;
    labelEn: string;
    Icon: React.FC<{ className?: string }>;
  }> = [
    { id: 'all', labelAr: 'الجميع', labelEn: 'All', Icon: LayoutGrid },
    { id: 'computers', labelAr: 'كمبيوترات', labelEn: 'Computers', Icon: Laptop },
    { id: 'accessories', labelAr: 'إكسسوارات', labelEn: 'Accessories', Icon: Headphones },
    { id: 'offers', labelAr: 'العروض', labelEn: 'Offers', Icon: Percent },
  ];

  const gridClass =
    layoutStyle === 'executive_wide'
      ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
      : layoutStyle === 'compact_cards'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

  return (
    <section className="mx-auto max-w-7xl space-y-5 px-3 py-5 sm:px-6" data-testid="catalog-view">
      {/* Top Filter Bar right below Header Search */}
      <div className="tech-surface flex flex-col gap-3 rounded-2xl border p-3.5 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map(({ id, labelAr, labelEn, Icon }) => {
            const active = categoryTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onCategoryChange(id)}
                data-testid={`catalog-tab-${id}`}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-extrabold transition ${
                  active
                    ? 'tech-accent-btn shadow-sm'
                    : 'tech-surface-muted border hover:border-blue-500/40'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{lang === 'ar' ? labelAr : labelEn}</span>
              </button>
            );
          })}
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor="catalog-sort-select"
            className="tech-text-secondary inline-flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-blue-500" />
            <span>{lang === 'ar' ? 'ترتيب حسب:' : 'Sort by:'}</span>
          </label>
          <select
            id="catalog-sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as CatalogSortOption)}
            data-testid="catalog-sort-select"
            className="tech-surface-muted rounded-xl border px-3 py-2 text-xs font-bold outline-none focus:border-blue-500"
          >
            <option value="latest">{lang === 'ar' ? 'الأحدث' : 'Latest'}</option>
            <option value="price_asc">
              {lang === 'ar' ? 'السعر من الأقل للأعلى' : 'Price: Low to High'}
            </option>
            <option value="price_desc">
              {lang === 'ar' ? 'السعر من الأعلى للأقل' : 'Price: High to Low'}
            </option>
            <option value="offers_only">
              {lang === 'ar' ? 'العروض والخصومات فقط' : 'Offers & Discounts Only'}
            </option>
          </select>
        </div>
      </div>

      {/* Count summary */}
      <div className="flex items-center justify-between px-1">
        <p className="tech-text-secondary text-xs font-bold">
          {lang === 'ar'
            ? `عرض ${filtered.length} منتج`
            : `Showing ${filtered.length} products`}
        </p>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="tech-surface flex flex-col items-center justify-center rounded-2xl border p-10 text-center">
          <p className="tech-text-secondary mb-4 text-sm font-semibold">
            {lang === 'ar'
              ? 'لا توجد منتجات مطابقة لخيارات التصفية والبحث.'
              : 'No products match the selected filter or search query.'}
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="tech-accent-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Reset Filters'}</span>
          </button>
        </div>
      ) : (
        <div className={gridClass}>
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              lang={lang}
              currency={currency}
              displayCurrency={displayCurrency}
              exchangeRates={exchangeRates}
              layoutStyle={layoutStyle}
              onAddToCart={onAddToCart}
              onZoom={onZoomProduct}
            />
          ))}
        </div>
      )}
    </section>
  );
});
