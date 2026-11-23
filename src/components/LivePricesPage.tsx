import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  DollarSign,
  Flame,
  Gem,
  Globe,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Language, MarketRates } from '../types/store';
import { t } from '../utils/i18n';
import { computeDiamondPrices, formatCurrency } from '../utils/storeLogic';

interface LivePricesPageProps {
  lang: Language;
  rates: MarketRates;
  isRefreshingMarket: boolean;
  isSyncingFirefox: boolean;
  onGlobalExchange: () => void;
  onFirefoxUpdate: () => void;
  onBackToStore: () => void;
}

export const LivePricesPage: React.FC<LivePricesPageProps> = ({
  lang,
  rates,
  isRefreshingMarket,
  isSyncingFirefox,
  onGlobalExchange,
  onFirefoxUpdate,
  onBackToStore,
}) => {
  const copy = t(lang);
  const gold14 = Math.round(rates.gold24 * (14 / 24));
  const diamonds = computeDiamondPrices(rates.diamondCaratUsd, rates.usdEgp);

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 pb-28 sm:px-6 space-y-6">
      {/* Page Hero Header */}
      <div className="rounded-2xl border border-amber-500/30 bg-[#131A26] p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-amber-300">
              {copy.pricesPageTitle}
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-300">
              {copy.pricesPageSubtitle}
            </p>
            <p className="mt-2 font-mono-tabular text-[11px] text-emerald-300">
              {lang === 'ar' ? 'آخر تحديث مرتبط بالبورصة:' : 'Last Exchange Sync:'}{' '}
              {new Date(rates.lastUpdated).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onGlobalExchange}
              disabled={isRefreshingMarket}
              className="flex min-h-[42px] items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 shadow hover:brightness-110 cursor-pointer"
            >
              {isRefreshingMarket ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Globe className="h-4 w-4" />
              )}
              <span>{copy.btnGlobalExchange}</span>
            </button>

            <button
              type="button"
              onClick={onFirefoxUpdate}
              disabled={isSyncingFirefox}
              className="flex min-h-[42px] items-center gap-1.5 rounded-xl border border-orange-500/40 bg-orange-500/15 px-4 py-2 text-xs sm:text-sm font-bold text-orange-200 hover:bg-orange-500/25 cursor-pointer"
            >
              {isSyncingFirefox ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Flame className="h-4 w-4 text-orange-400" />
              )}
              <span>{copy.btnFirefoxUpdate}</span>
            </button>

            <button
              type="button"
              onClick={onBackToStore}
              className="flex min-h-[42px] items-center gap-1.5 rounded-xl border border-amber-500/30 bg-[#0B0F17] px-4 py-2 text-xs sm:text-sm font-bold text-slate-200 hover:border-amber-400 cursor-pointer"
            >
              {lang === 'ar' ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              <span>{copy.backToStore}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Exchange-Linked Asset Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* 1. GOLD */}
        <section className="rounded-2xl border border-amber-500/25 bg-[#131A26] p-5 sm:p-6">
          <div className="flex items-center gap-2.5 border-b border-amber-500/15 pb-3 mb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Coins className="h-5 w-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-amber-300">
              {copy.goldSectionTitle}
            </h2>
          </div>

          <div className="space-y-3 text-sm">
            {[
              [copy.gold24, formatCurrency(rates.gold24, lang)],
              [copy.gold21, formatCurrency(rates.gold21, lang)],
              [copy.gold18, formatCurrency(rates.gold18, lang)],
              [copy.gold14, formatCurrency(gold14, lang)],
              [copy.goldPound, formatCurrency(rates.goldPound, lang)],
              [copy.globalOunce, `$${rates.ounceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
            ].map(([label, val]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-amber-500/10 bg-[#0B0F17] px-4 py-2.5"
              >
                <span className="text-slate-300">{label}</span>
                <span className="font-mono-tabular font-bold text-amber-300">{val}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 2. DIAMONDS */}
        <section className="rounded-2xl border border-cyan-500/25 bg-[#131A26] p-5 sm:p-6">
          <div className="flex items-center gap-2.5 border-b border-cyan-500/15 pb-3 mb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
              <Gem className="h-5 w-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-cyan-200">
              {copy.diamondSectionTitle}
            </h2>
          </div>

          <div className="space-y-3 text-sm">
            {[
              [copy.diamond1ct, formatCurrency(diamonds.carat1Egp, lang)],
              [copy.diamondHalfCt, formatCurrency(diamonds.halfCaratEgp, lang)],
              [copy.diamondQuarterCt, formatCurrency(diamonds.quarterCaratEgp, lang)],
              [
                copy.diamondBenchmarkUsd,
                `$${diamonds.carat1Usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
              ],
            ].map(([label, val]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-cyan-500/10 bg-[#0B0F17] px-4 py-2.5"
              >
                <span className="text-slate-300">{label}</span>
                <span className="font-mono-tabular font-bold text-cyan-200">{val}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 3. US DOLLARS */}
        <section className="rounded-2xl border border-emerald-500/25 bg-[#131A26] p-5 sm:p-6">
          <div className="flex items-center gap-2.5 border-b border-emerald-500/15 pb-3 mb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-emerald-300">
              {copy.usdSectionTitle}
            </h2>
          </div>

          <div className="space-y-3 text-sm">
            {[
              [copy.usd1, `${rates.usdEgp.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}`],
              [copy.usd100, formatCurrency(rates.usdEgp * 100, lang)],
              [copy.usd1000, formatCurrency(rates.usdEgp * 1000, lang)],
            ].map(([label, val]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-emerald-500/10 bg-[#0B0F17] px-4 py-2.5"
              >
                <span className="text-slate-300">{label}</span>
                <span className="font-mono-tabular font-bold text-emerald-300">{val}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 4. SILVER */}
        <section className="rounded-2xl border border-slate-400/25 bg-[#131A26] p-5 sm:p-6">
          <div className="flex items-center gap-2.5 border-b border-slate-400/15 pb-3 mb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-400/15 text-slate-200">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-100">
              {copy.silverSectionTitle}
            </h2>
          </div>

          <div className="space-y-3 text-sm">
            {[
              [copy.silver925, formatCurrency(rates.silver925, lang)],
              [copy.silverSwiss, formatCurrency(rates.silverSwiss, lang)],
              [
                lang === 'ar' ? 'أونصة الفضة العالمية ($)' : 'Global Silver Ounce ($)',
                `$${rates.silverOunceUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
              ],
            ].map(([label, val]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-xl border border-slate-400/10 bg-[#0B0F17] px-4 py-2.5"
              >
                <span className="text-slate-300">{label}</span>
                <span className="font-mono-tabular font-bold text-slate-100">{val}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
