import React from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { Language, MarketRates } from '../types/store';
import { t } from '../utils/i18n';
import { formatCurrency } from '../utils/storeLogic';

interface LiveTickerBarProps {
  lang: Language;
  rates: MarketRates;
  isRefreshing: boolean;
  onRefreshMarket: () => void;
  refreshFeedback: string | null;
}

export const LiveTickerBar: React.FC<LiveTickerBarProps> = ({
  lang,
  rates,
  isRefreshing,
  onRefreshMarket,
  refreshFeedback,
}) => {
  const copy = t(lang);

  const tickerItems = [
    { label: copy.gold24, value: formatCurrency(rates.gold24, lang), accent: 'text-amber-300' },
    { label: copy.gold21, value: formatCurrency(rates.gold21, lang), accent: 'text-amber-400' },
    { label: copy.gold18, value: formatCurrency(rates.gold18, lang), accent: 'text-amber-300' },
    { label: copy.goldPound, value: formatCurrency(rates.goldPound, lang), accent: 'text-amber-200' },
    { label: copy.silver925, value: formatCurrency(rates.silver925, lang), accent: 'text-slate-200' },
    { label: copy.silverSwiss, value: formatCurrency(rates.silverSwiss, lang), accent: 'text-slate-200' },
    {
      label: copy.globalOunce,
      value: `$${rates.ounceUsd.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`,
      accent: 'text-emerald-300',
    },
    {
      label: copy.usdRate,
      value: `${rates.usdEgp.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}`,
      accent: 'text-sky-300',
    },
  ];

  const renderGroup = (prefix: string) =>
    tickerItems.map((item, idx) => (
      <div
        key={`${prefix}-${idx}`}
        className="flex items-center gap-2 whitespace-nowrap px-4 border-e border-amber-500/15"
      >
        <span className="text-xs text-slate-400">{item.label}</span>
        <span className={`font-mono-tabular text-xs sm:text-sm font-bold ${item.accent}`}>
          {item.value}
        </span>
      </div>
    ));

  return (
    <section
      aria-label={lang === 'ar' ? 'أسعار البورصة العالمية والمحلية' : 'Live Gold & Silver Market Rates'}
      className="border-b border-amber-500/20 bg-[#0E131D]"
    >
      <div className="mx-auto flex max-w-7xl flex-col sm:flex-row sm:items-center sm:justify-between">
        {/* Continuous Ticker */}
        <div className="ticker-container relative flex-1 overflow-hidden py-2.5">
          <div
            className={`flex w-max items-center ${
              lang === 'ar' ? 'ticker-track-rtl' : 'ticker-track-ltr'
            }`}
          >
            {renderGroup('a')}
            {renderGroup('b')}
          </div>
        </div>

        {/* Refresh from Global Market CTA */}
        <div className="flex items-center justify-between gap-2 border-t border-amber-500/15 px-3 py-2 sm:border-t-0 sm:border-s sm:px-4 shrink-0 bg-[#111827]/70">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 sm:hidden">
            <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            <span>{refreshFeedback || (lang === 'ar' ? 'تحديث البورصة' : 'Live Feed')}</span>
          </div>
          <button
            type="button"
            onClick={onRefreshMarket}
            disabled={isRefreshing}
            className="hover-shimmer flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-amber-600/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-400 hover:text-white disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? copy.refreshingMarket : copy.refreshMarketBtn}</span>
          </button>
        </div>
      </div>
      {refreshFeedback && (
        <div className="hidden sm:block border-t border-amber-500/10 bg-[#0B0F17] px-6 py-1 text-[11px] text-amber-300/90 text-end">
          {refreshFeedback}
        </div>
      )}
    </section>
  );
};
