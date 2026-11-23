import React from 'react';
import { Globe, Heart, Settings, ShoppingBag, Store } from 'lucide-react';
import { Language } from '../types/store';
import { t } from '../utils/i18n';

interface BottomNavBarProps {
  lang: Language;
  cartCount: number;
  wishlistCount: number;
  activeView: 'store' | 'categories' | 'prices' | 'favorites' | 'admin';
  onGoStore: () => void;
  onGoFavorites: () => void;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onToggleLanguage: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  lang,
  cartCount,
  wishlistCount,
  activeView,
  onGoStore,
  onGoFavorites,
  onOpenCart,
  onOpenAdmin,
  onToggleLanguage,
}) => {
  const copy = t(lang);

  return (
    <nav
      aria-label={lang === 'ar' ? 'شريط التنقل الرئيسي' : 'Primary Bottom Navigation'}
      className="fixed bottom-0 inset-x-0 z-40 border-t border-amber-500/25 bg-[#0B0F17]/95 backdrop-blur-md"
    >
      <div className="mx-auto grid h-16 sm:h-14 max-w-7xl grid-cols-5 gap-1 px-1.5 py-1.5 sm:gap-2.5 sm:px-6">
        {/* 1. Store - Royal Blue #2563EB */}
        <button
          type="button"
          onClick={onGoStore}
          aria-pressed={activeView === 'store'}
          className={`flex min-h-[42px] flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-xl bg-[#2563EB] px-1 sm:px-3 text-[10px] sm:text-sm font-bold text-white shadow transition hover:bg-blue-500 active:scale-[0.98] whitespace-nowrap cursor-pointer ${
            activeView === 'store' ? 'ring-2 ring-white/60' : 'opacity-90'
          }`}
        >
          <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span>{copy.navStore}</span>
        </button>

        {/* 2. Favorites - Rose #E11D48 */}
        <button
          type="button"
          onClick={onGoFavorites}
          aria-pressed={activeView === 'favorites'}
          className={`relative flex min-h-[42px] flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-xl bg-rose-600 px-1 sm:px-3 text-[10px] sm:text-sm font-bold text-white shadow transition hover:bg-rose-500 active:scale-[0.98] whitespace-nowrap cursor-pointer ${
            activeView === 'favorites' ? 'ring-2 ring-white/70' : 'opacity-95'
          }`}
        >
          <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${wishlistCount > 0 ? 'fill-white' : ''}`} />
          <span>{copy.navFavorites}</span>
          <span
            data-testid="favorites-badge-count"
            className="font-mono-tabular absolute top-0.5 end-1 sm:static inline-flex min-w-[16px] sm:min-w-[18px] items-center justify-center rounded-md bg-slate-950/80 px-1 py-0.2 sm:py-0.5 text-[9px] sm:text-[11px] font-extrabold text-white"
          >
            {wishlistCount}
          </span>
        </button>

        {/* 3. Cart / Purchases - Emerald Green #10B981 */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex min-h-[42px] flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-xl bg-[#10B981] px-1 sm:px-3 text-[10px] sm:text-sm font-bold text-white shadow transition hover:bg-emerald-400 active:scale-[0.98] whitespace-nowrap cursor-pointer"
        >
          <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span>{copy.navCart}</span>
          <span
            data-testid="cart-badge-count"
            className="font-mono-tabular absolute top-0.5 end-1 sm:static inline-flex min-w-[16px] sm:min-w-[18px] items-center justify-center rounded-md bg-slate-950/80 px-1 py-0.2 sm:py-0.5 text-[9px] sm:text-[11px] font-extrabold text-white"
          >
            {cartCount}
          </span>
        </button>

        {/* 4. Settings / Admin - Amber Gold #F59E0B */}
        <button
          type="button"
          onClick={onOpenAdmin}
          aria-pressed={activeView === 'admin'}
          className={`flex min-h-[42px] flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-xl bg-[#F59E0B] px-1 sm:px-3 text-[10px] sm:text-sm font-bold text-slate-950 shadow transition hover:bg-amber-400 active:scale-[0.98] whitespace-nowrap cursor-pointer ${
            activeView === 'admin' ? 'ring-2 ring-white/70' : ''
          }`}
        >
          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span>{copy.navSettings}</span>
        </button>

        {/* 5. Language Switch EN / AR - Blue #3B82F6 */}
        <button
          type="button"
          onClick={onToggleLanguage}
          className="flex min-h-[42px] flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 rounded-xl bg-[#3B82F6] px-1 sm:px-3 text-[10px] sm:text-sm font-bold text-white shadow transition hover:bg-blue-400 active:scale-[0.98] whitespace-nowrap cursor-pointer"
        >
          <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span>{copy.navLang}</span>
        </button>
      </div>
    </nav>
  );
};

