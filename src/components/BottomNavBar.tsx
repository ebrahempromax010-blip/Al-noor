import React from 'react';
import { Globe, Settings, ShoppingBag, Store } from 'lucide-react';
import { Language } from '../types/store';
import { t } from '../utils/i18n';

interface BottomNavBarProps {
  lang: Language;
  cartCount: number;
  activeView: 'store' | 'categories' | 'prices' | 'admin';
  onGoStore: () => void;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onToggleLanguage: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  lang,
  cartCount,
  activeView,
  onGoStore,
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
      <div className="mx-auto grid h-14 max-w-7xl grid-cols-4 gap-1 px-1.5 py-1.5 sm:gap-3 sm:px-6">
        {/* 1. Store - Royal Blue #2563EB */}
        <button
          type="button"
          onClick={onGoStore}
          aria-pressed={activeView === 'store'}
          className={`flex min-h-[42px] items-center justify-center gap-1 sm:gap-1.5 rounded-xl bg-[#2563EB] px-1.5 sm:px-3 text-[11px] sm:text-sm font-bold text-white shadow transition hover:bg-blue-500 active:scale-[0.98] whitespace-nowrap cursor-pointer ${
            activeView === 'store' ? 'ring-2 ring-white/50' : 'opacity-90'
          }`}
        >
          <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span>{copy.navStore}</span>
        </button>

        {/* 2. Cart / Purchases - Emerald Green #10B981 */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex min-h-[42px] items-center justify-center gap-1 sm:gap-1.5 rounded-xl bg-[#10B981] px-1.5 sm:px-3 text-[11px] sm:text-sm font-bold text-white shadow transition hover:bg-emerald-400 active:scale-[0.98] whitespace-nowrap cursor-pointer"
        >
          <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span>{copy.navCart}</span>
          <span
            data-testid="cart-badge-count"
            className="font-mono-tabular inline-flex min-w-[18px] items-center justify-center rounded-md bg-slate-950/80 px-1 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-white"
          >
            {cartCount}
          </span>
        </button>

        {/* 3. Settings / Admin - Amber Gold #F59E0B */}
        <button
          type="button"
          onClick={onOpenAdmin}
          aria-pressed={activeView === 'admin'}
          className={`flex min-h-[42px] items-center justify-center gap-1 sm:gap-1.5 rounded-xl bg-[#F59E0B] px-1.5 sm:px-3 text-[11px] sm:text-sm font-bold text-slate-950 shadow transition hover:bg-amber-400 active:scale-[0.98] whitespace-nowrap cursor-pointer ${
            activeView === 'admin' ? 'ring-2 ring-white/70' : ''
          }`}
        >
          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span>{copy.navSettings}</span>
        </button>

        {/* 4. Language Switch EN / AR - Blue #3B82F6 */}
        <button
          type="button"
          onClick={onToggleLanguage}
          className="flex min-h-[42px] items-center justify-center gap-1 sm:gap-1.5 rounded-xl bg-[#3B82F6] px-1.5 sm:px-3 text-[11px] sm:text-sm font-bold text-white shadow transition hover:bg-blue-400 active:scale-[0.98] whitespace-nowrap cursor-pointer"
        >
          <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span>{copy.navLang}</span>
        </button>
      </div>
    </nav>
  );
};
