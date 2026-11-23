import React from 'react';
import {
  BarChart3,
  Flame,
  Globe,
  Languages,
  LayoutGrid,
  Loader2,
} from 'lucide-react';
import { Language } from '../types/store';
import { t } from '../utils/i18n';

interface QuickActionBarProps {
  lang: Language;
  activeView: 'store' | 'categories' | 'prices' | 'favorites' | 'admin';
  isRefreshingMarket: boolean;
  isSyncingFirefox: boolean;
  onOpenCategories: () => void;
  onOpenPricesPage: () => void;
  onGlobalExchange: () => void;
  onFirefoxUpdate: () => void;
  onOpenLanguageSettings: () => void;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({
  lang,
  activeView,
  isRefreshingMarket,
  isSyncingFirefox,
  onOpenCategories,
  onOpenPricesPage,
  onGlobalExchange,
  onFirefoxUpdate,
  onOpenLanguageSettings,
}) => {
  const copy = t(lang);

  return (
    <section
      aria-label={lang === 'ar' ? 'أزرار الوصول السريع' : 'Quick Access Controls'}
      className="border-b border-amber-500/15 bg-[#0B0F17]/95"
    >
      <div className="mx-auto max-w-7xl px-3 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Categories */}
          <button
            type="button"
            onClick={onOpenCategories}
            aria-pressed={activeView === 'categories'}
            className={`flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              activeView === 'categories'
                ? 'border-amber-400 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-slate-950 shadow'
                : 'border-amber-500/30 bg-[#131A26] text-amber-200 hover:border-amber-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
            <span>{copy.btnCategories}</span>
          </button>

          {/* 2. Current Prices of Gold, Diamonds, US Dollars, and Silver */}
          <button
            type="button"
            onClick={onOpenPricesPage}
            aria-pressed={activeView === 'prices'}
            className={`flex min-h-[38px] max-w-full items-center gap-1.5 rounded-xl border px-3 py-1.5 text-start text-xs font-bold whitespace-normal sm:whitespace-nowrap transition cursor-pointer ${
              activeView === 'prices'
                ? 'border-amber-400 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-slate-950 shadow'
                : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5 shrink-0" />
            <span>{copy.btnCurrentPrices}</span>
          </button>

          {/* 3. Global Exchange */}
          <button
            type="button"
            onClick={onGlobalExchange}
            disabled={isRefreshingMarket}
            className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-200 whitespace-nowrap transition hover:border-sky-400 hover:bg-sky-500/20 disabled:opacity-60 cursor-pointer"
          >
            {isRefreshingMarket ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            ) : (
              <Globe className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>{copy.btnGlobalExchange}</span>
          </button>

          {/* 4. Firefox Update (Instant Cloud Sync Pull) */}
          <button
            type="button"
            onClick={onFirefoxUpdate}
            disabled={isSyncingFirefox}
            className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-orange-500/40 bg-orange-500/15 px-3 py-1.5 text-xs font-bold text-orange-200 whitespace-nowrap transition hover:border-orange-400 hover:bg-orange-500/25 disabled:opacity-60 cursor-pointer"
          >
            {isSyncingFirefox ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            ) : (
              <Flame className="h-3.5 w-3.5 shrink-0 text-orange-400" />
            )}
            <span>{copy.btnFirefoxUpdate}</span>
          </button>

          {/* 5. Language Settings */}
          <button
            type="button"
            onClick={onOpenLanguageSettings}
            className="flex min-h-[38px] items-center gap-1.5 rounded-xl border border-indigo-400/35 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-200 whitespace-nowrap transition hover:border-indigo-400 hover:bg-indigo-500/20 cursor-pointer"
          >
            <Languages className="h-3.5 w-3.5 shrink-0" />
            <span>{copy.btnLanguageSettings}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
