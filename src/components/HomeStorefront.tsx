import React, { memo, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Cpu,
  ExternalLink,
  Headphones,
  Laptop,
  MapPin,
  Percent,
  Sparkles,
} from 'lucide-react';
import {
  CatalogCategoryTab,
  Language,
  Product,
  StoreData,
} from '../types/store';
import { normalizeSafeUrl } from '../utils/storeLogic';
import { ProductCard } from './ProductCard';

interface HomeStorefrontProps {
  lang: Language;
  storeData: StoreData;
  searchQuery: string;
  onNavigateCatalog: (category: CatalogCategoryTab) => void;
  onAddToCart: (product: Product) => void;
  onZoomProduct: (product: Product) => void;
  onOpenSettingsAI: () => void;
}

export const HomeStorefront: React.FC<HomeStorefrontProps> = memo(({
  lang,
  storeData,
  searchQuery,
  onNavigateCatalog,
  onAddToCart,
  onZoomProduct,
  onOpenSettingsAI,
}) => {
  const { settings, products, socialLinks, branch } = storeData;
  const currency = settings.currency || 'ج.م';

  const cleanQuery = searchQuery.trim().toLowerCase();
  const visibleProducts = useMemo(
    () =>
      cleanQuery
        ? products.filter((p) =>
            `${p.nameAr} ${p.nameEn} ${p.brand} ${p.specsAr} ${p.specsEn} ${p.sku}`
              .toLowerCase()
              .includes(cleanQuery)
          )
        : products,
    [cleanQuery, products]
  );

  const computers = useMemo(
    () => visibleProducts.filter((p) => p.categoryGroup === 'computers').slice(0, 4),
    [visibleProducts]
  );
  const accessories = useMemo(
    () =>
      visibleProducts
        .filter((p) => p.categoryGroup === 'accessories' || p.categoryGroup === 'software')
        .slice(0, 4),
    [visibleProducts]
  );
  const deals = useMemo(
    () => visibleProducts.filter((p) => (p.discountPercent || 0) > 0).slice(0, 4),
    [visibleProducts]
  );

  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  const gridClass =
    settings.layoutStyle === 'executive_wide'
      ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
      : settings.layoutStyle === 'compact_cards'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

  const socialItems = [
    { label: 'Facebook', url: socialLinks.facebookUrl },
    { label: 'YouTube', url: socialLinks.youtubeUrl },
    { label: 'Instagram', url: socialLinks.instagramUrl },
    { label: 'TikTok', url: socialLinks.tiktokUrl },
  ].filter((s) => Boolean(s.url && s.url.trim()));

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-3 py-5 sm:px-6">
      {/* If actively typing in search on Home, display matching results immediately */}
      {cleanQuery ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold">
              {lang === 'ar'
                ? `نتائج البحث (${visibleProducts.length})`
                : `Search Results (${visibleProducts.length})`}
            </h2>
            <button
              type="button"
              onClick={() => onNavigateCatalog('all')}
              className="text-xs font-bold text-blue-500 hover:underline"
            >
              {lang === 'ar' ? 'عرض الكل مع الفلاتر' : 'Open Full Catalog'}
            </button>
          </div>
          {visibleProducts.length === 0 ? (
            <div className="tech-surface rounded-2xl border p-8 text-center">
              <p className="tech-text-secondary text-sm mb-3">
                {lang === 'ar'
                  ? 'لم نجد منتجاً مطابقاً في المخزون الحالي — يمكنك سؤال المساعد الذكي لتسجيل إشعار توفر المنتج فور وصوله.'
                  : 'No matching product in stock right now — ask our AI assistant to notify you when restocked.'}
              </p>
              <button
                type="button"
                onClick={onOpenSettingsAI}
                className="tech-accent-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold"
              >
                <Sparkles className="h-4 w-4" />
                <span>{lang === 'ar' ? 'اسأل المساعد الذكي' : 'Ask AI Assistant'}</span>
              </button>
            </div>
          ) : (
            <div className={gridClass}>
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  lang={lang}
                  currency={currency}
                  layoutStyle={settings.layoutStyle}
                  onAddToCart={onAddToCart}
                  onZoom={onZoomProduct}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Modern Amazon-Tech Hero Showcase */}
          <section className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-slate-950 shadow-xl">
            <img
              src={
                settings.promoBannerImageUrl ||
                '/src/assets/images/hero_tech_workstation_1795638127434.jpg'
              }
              alt={lang === 'ar' ? settings.heroTitleAr : settings.heroTitleEn}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-55"
            />
            <div
              className="relative z-10 flex flex-col justify-between gap-6 p-6 sm:p-10 md:min-h-[300px]"
              style={{ background: 'var(--hero-overlay)' }}
            >
              <div className="max-w-2xl space-y-3">
                <p className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-sky-300">
                  <Cpu className="h-4 w-4" />
                  <span>{lang === 'ar' ? settings.promoBadgeAr : settings.promoBadgeEn}</span>
                </p>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight text-white">
                  {lang === 'ar' ? settings.heroTitleAr : settings.heroTitleEn}
                </h2>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                  {lang === 'ar' ? settings.heroSubtitleAr : settings.heroSubtitleEn}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onNavigateCatalog('computers')}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs sm:text-sm font-extrabold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
                >
                  <Laptop className="h-4 w-4" />
                  <span>
                    {lang === 'ar' ? 'تصفح الكمبيوترات واللابتوب' : 'Browse Computers & Laptops'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateCatalog('offers')}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-xs sm:text-sm font-extrabold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  <Percent className="h-4 w-4 text-amber-300" />
                  <span>{lang === 'ar' ? 'أقوى العروض' : 'Top Tech Deals'}</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenSettingsAI}
                  className="inline-flex items-center gap-2 rounded-xl border border-sky-400/35 bg-sky-500/15 px-4 py-3 text-xs sm:text-sm font-extrabold text-sky-200 backdrop-blur-sm transition hover:bg-sky-500/25"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{lang === 'ar' ? 'مساعد اختيار المواصفات' : 'AI Spec Advisor'}</span>
                </button>
              </div>
            </div>
          </section>

          {/* Showcase Section 1: Computers & Laptops */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/15 text-blue-500">
                  <Laptop className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold">
                    {lang === 'ar'
                      ? 'أحدث أجهزة الكمبيوتر واللابتوب'
                      : 'Latest Computers, Laptops & Displays'}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateCatalog('computers')}
                className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-500 hover:underline"
              >
                <span>{lang === 'ar' ? 'عرض الكل' : 'View All'}</span>
                <ArrowIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className={gridClass}>
              {computers.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  lang={lang}
                  currency={currency}
                  layoutStyle={settings.layoutStyle}
                  onAddToCart={onAddToCart}
                  onZoom={onZoomProduct}
                />
              ))}
            </div>
          </section>

          {/* Showcase Section 2: Accessories & Software */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                  <Headphones className="h-5 w-5" />
                </div>
                <h2 className="text-base sm:text-lg font-extrabold">
                  {lang === 'ar'
                    ? 'إكسسوارات احترافية وبرمجيات أصلية'
                    : 'Pro Accessories & Genuine Software'}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => onNavigateCatalog('accessories')}
                className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-500 hover:underline"
              >
                <span>{lang === 'ar' ? 'عرض الكل' : 'View All'}</span>
                <ArrowIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className={gridClass}>
              {accessories.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  lang={lang}
                  currency={currency}
                  layoutStyle={settings.layoutStyle}
                  onAddToCart={onAddToCart}
                  onZoom={onZoomProduct}
                />
              ))}
            </div>
          </section>

          {/* Showcase Section 3: Deals */}
          {deals.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
                    <Percent className="h-5 w-5" />
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold">
                    {lang === 'ar' ? 'خصومات وعروض اليوم' : "Today's Hardware Deals"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateCatalog('offers')}
                  className="inline-flex items-center gap-1 text-xs font-extrabold text-blue-500 hover:underline"
                >
                  <span>{lang === 'ar' ? 'كل العروض' : 'All Deals'}</span>
                  <ArrowIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className={gridClass}>
                {deals.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    lang={lang}
                    currency={currency}
                    layoutStyle={settings.layoutStyle}
                    onAddToCart={onAddToCart}
                    onZoom={onZoomProduct}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Clean Tech Store Footer with Public Branch Info & Official Social Links */}
      <footer className="tech-surface mt-8 rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h3 className="text-base font-extrabold">
              {lang === 'ar' ? settings.storeNameAr : settings.storeNameEn}
            </h3>
            <p className="tech-text-secondary flex items-center gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>{lang === 'ar' ? branch.addressAr : branch.addressEn}</span>
            </p>
            <p className="tech-text-secondary text-xs">
              {lang === 'ar' ? branch.workingHoursAr : branch.workingHoursEn}
              {branch.branchMapUrl && (
                <>
                  {' • '}
                  <a
                    href={normalizeSafeUrl(branch.branchMapUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-blue-500 hover:underline"
                  >
                    <span>{lang === 'ar' ? 'موقع الفرع على الخريطة' : 'Branch Map'}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </p>
          </div>

          {socialItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {socialItems.map((item) => (
                <a
                  key={item.label}
                  href={normalizeSafeUrl(item.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tech-surface-muted inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition hover:border-blue-500/40"
                >
                  <span>{item.label}</span>
                  <ExternalLink className="h-3 w-3 text-blue-500" />
                </a>
              ))}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
});
