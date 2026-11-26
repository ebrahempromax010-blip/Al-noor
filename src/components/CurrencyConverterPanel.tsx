import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Check, Coins, RefreshCw } from 'lucide-react';
import { Language, Product } from '../types/store';
import {
  calculateDiscountedPrice,
} from '../utils/storeLogic';
import {
  convertCurrencyAmount,
  CurrencyCode,
  formatStorePriceDisplay,
  getCurrencyDescriptor,
  resolveBaseCurrencyCode,
  SUPPORTED_CURRENCIES,
} from '../utils/currencyLogic';

interface CurrencyConverterPanelProps {
  lang: Language;
  baseCurrencyLabel: string;
  selectedCurrency: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  ratesSource: 'live_api' | 'fallback_reference' | 'loading';
  ratesUpdatedAt: string;
  refreshingRates: boolean;
  products: Product[];
  onSelectDisplayCurrency: (code: CurrencyCode) => void;
  onRefreshRates: () => void;
}

export const CurrencyConverterPanel: React.FC<CurrencyConverterPanelProps> = ({
  lang,
  baseCurrencyLabel,
  selectedCurrency,
  rates,
  ratesSource,
  ratesUpdatedAt,
  refreshingRates,
  products,
  onSelectDisplayCurrency,
  onRefreshRates,
}) => {
  const baseCode = resolveBaseCurrencyCode(baseCurrencyLabel);
  const [amountInput, setAmountInput] = useState<string>('10000');
  const [fromCode, setFromCode] = useState<CurrencyCode>(baseCode);
  const [toCode, setToCode] = useState<CurrencyCode>(
    selectedCurrency !== baseCode ? selectedCurrency : baseCode === 'USD' ? 'EUR' : 'USD'
  );

  const numericAmount = useMemo(() => {
    const parsed = Number.parseFloat(amountInput);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [amountInput]);

  const convertedValue = useMemo(
    () => convertCurrencyAmount(numericAmount, fromCode, toCode, rates, baseCode),
    [numericAmount, fromCode, toCode, rates, baseCode]
  );

  const unitRate = useMemo(
    () => convertCurrencyAmount(1, fromCode, toCode, rates, baseCode),
    [fromCode, toCode, rates, baseCode]
  );

  const toDescriptor = getCurrencyDescriptor(toCode);
  const formattedResult = convertedValue.toLocaleString('en-US', {
    minimumFractionDigits: convertedValue >= 1000 ? 0 : toDescriptor.decimals,
    maximumFractionDigits: convertedValue >= 1000 ? 2 : Math.max(2, toDescriptor.decimals),
  });

  const previewProducts = useMemo(() => products.slice(0, 3), [products]);

  const handleSwap = () => {
    setFromCode(toCode);
    setToCode(fromCode);
  };

  return (
    <div className="space-y-4" data-testid="currency-converter-panel">
      {/* Live Exchange Rate Header & Refresh */}
      <div className="tech-surface-muted flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-blue-500 shrink-0" />
          <div>
            <p className="font-extrabold">
              {lang === 'ar'
                ? 'أسعار الصرف المباشرة والعملة المعروضة'
                : 'Live Exchange Rates & Display Currency'}
            </p>
            <p className="tech-text-secondary text-[11px]">
              {ratesSource === 'live_api'
                ? lang === 'ar'
                  ? 'محدثة من أسعار الصرف العالمية الحالية'
                  : 'Synced with current international exchange rates'
                : ratesSource === 'loading'
                  ? lang === 'ar'
                    ? 'جاري تحديث أسعار الصرف...'
                    : 'Fetching current exchange rates...'
                  : lang === 'ar'
                    ? 'أسعار مرجعية (اضغط تحديث للمزامنة)'
                    : 'Reference rates active (tap refresh to sync)'}
              {ratesUpdatedAt ? ` • ${new Date(ratesUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefreshRates}
          disabled={refreshingRates}
          data-testid="refresh-rates-btn"
          className="tech-surface inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-extrabold transition hover:border-blue-500/50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-blue-500 ${refreshingRates ? 'animate-spin' : ''}`} />
          <span>{lang === 'ar' ? 'تحديث الأسعار' : 'Refresh'}</span>
        </button>
      </div>

      {/* Storewide Display Currency Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold">
            {lang === 'ar'
              ? 'اختر عملة عرض أسعار المنتجات في المتجر:'
              : 'Display All Store Product Prices In:'}
          </p>
          {selectedCurrency !== baseCode && (
            <button
              type="button"
              onClick={() => onSelectDisplayCurrency(baseCode)}
              data-testid="reset-currency-btn"
              className="text-[11px] font-bold text-blue-500 hover:underline"
            >
              {lang === 'ar' ? `الرجوع إلى (${baseCode})` : `Reset to ${baseCode}`}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SUPPORTED_CURRENCIES.map((curr) => {
            const active = selectedCurrency === curr.code;
            const ratePerBase = rates[curr.code] ?? 1;
            return (
              <button
                key={curr.code}
                type="button"
                onClick={() => {
                  onSelectDisplayCurrency(curr.code);
                  if (curr.code !== fromCode) {
                    setToCode(curr.code);
                  }
                }}
                data-testid={`currency-select-${curr.code}`}
                className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-start transition ${
                  active
                    ? 'border-blue-500 ring-2 ring-blue-500/25 tech-surface-muted'
                    : 'tech-surface hover:border-blue-500/40'
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-mono-tabular text-xs font-extrabold">
                    {curr.code} ({curr.symbol})
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-blue-500" />}
                </div>
                <span className="tech-text-secondary text-[11px] truncate w-full">
                  {lang === 'ar' ? curr.labelAr : curr.labelEn}
                </span>
                <span className="font-mono-tabular text-[10px] font-bold text-blue-500">
                  1 {baseCode} = {ratePerBase >= 1 ? ratePerBase.toFixed(2) : ratePerBase.toFixed(4)}{' '}
                  {curr.code}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Currency Converter Calculator */}
      <div className="tech-surface-muted rounded-2xl border p-4 space-y-3">
        <h3 className="text-xs sm:text-sm font-extrabold">
          {lang === 'ar' ? 'حاسبة تحويل العملات الفورية' : 'Instant Currency Converter'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-end gap-2.5">
          <div className="space-y-1">
            <label htmlFor="converter-amount-input" className="block text-[11px] font-bold tech-text-secondary">
              {lang === 'ar' ? 'المبلغ' : 'Amount'}
            </label>
            <div className="flex gap-1.5">
              <input
                id="converter-amount-input"
                type="number"
                min="0"
                step="any"
                dir="ltr"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                data-testid="converter-amount-input"
                className="tech-surface w-full rounded-xl border px-3 py-2 text-sm font-mono-tabular font-bold outline-none focus:border-blue-500"
              />
              <select
                aria-label={lang === 'ar' ? 'من عملة' : 'From currency'}
                value={fromCode}
                onChange={(e) => setFromCode(e.target.value as CurrencyCode)}
                data-testid="converter-from-select"
                className="tech-surface rounded-xl border px-2.5 py-2 text-xs font-extrabold outline-none focus:border-blue-500"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSwap}
            aria-label={lang === 'ar' ? 'تبديل العملتين' : 'Swap currencies'}
            data-testid="converter-swap-btn"
            className="tech-surface mx-auto flex h-9 w-9 items-center justify-center rounded-xl border transition hover:border-blue-500/50"
          >
            <ArrowLeftRight className="h-4 w-4 text-blue-500" />
          </button>

          <div className="space-y-1">
            <label htmlFor="converter-to-select" className="block text-[11px] font-bold tech-text-secondary">
              {lang === 'ar' ? 'إلى عملة' : 'Convert To'}
            </label>
            <div className="flex items-center gap-1.5">
              <div
                data-testid="converter-result-value"
                dir="ltr"
                className="tech-surface flex-1 rounded-xl border px-3 py-2 text-sm font-mono-tabular font-extrabold text-blue-600 dark:text-sky-400"
              >
                {formattedResult} {toDescriptor.symbol}
              </div>
              <select
                id="converter-to-select"
                value={toCode}
                onChange={(e) => setToCode(e.target.value as CurrencyCode)}
                data-testid="converter-to-select"
                className="tech-surface rounded-xl border px-2.5 py-2 text-xs font-extrabold outline-none focus:border-blue-500"
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <p className="tech-text-secondary text-[11px] font-mono-tabular" dir="ltr">
          1 {fromCode} = {unitRate >= 1 ? unitRate.toFixed(2) : unitRate.toFixed(4)} {toCode}
        </p>
      </div>

      {/* Live Store Product Conversion Preview */}
      {previewProducts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-extrabold">
            {lang === 'ar'
              ? `معاينة أسعار المنتجات بعملة (${toCode})`
              : `Live Product Prices in ${toCode}`}
          </p>
          <div className="space-y-1.5">
            {previewProducts.map((prod) => {
              const baseFinal = calculateDiscountedPrice(prod.price, prod.discountPercent);
              const converted = formatStorePriceDisplay(
                baseFinal,
                baseCurrencyLabel,
                toCode,
                rates,
                lang
              );
              return (
                <div
                  key={prod.id}
                  className="tech-surface flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs"
                >
                  <span className="truncate font-bold">
                    {lang === 'ar' ? prod.nameAr : prod.nameEn}
                  </span>
                  <div className="shrink-0 text-end font-mono-tabular">
                    <span className="font-extrabold text-blue-600 dark:text-sky-400">
                      {converted.formattedNumber} {converted.currencyUnit}
                    </span>
                    {converted.isConverted && (
                      <span className="tech-text-secondary ms-1.5 text-[10px]">
                        ({baseFinal.toLocaleString('en-US')} {baseCurrencyLabel})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
