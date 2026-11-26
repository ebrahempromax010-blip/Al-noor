import { Language } from '../types/store';

export type CurrencyCode = 'EGP' | 'USD' | 'EUR' | 'SAR' | 'AED' | 'GBP' | 'KWD';

export interface CurrencyDescriptor {
  code: CurrencyCode;
  symbol: string;
  labelAr: string;
  labelEn: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyDescriptor[] = [
  { code: 'EGP', symbol: 'ج.م', labelAr: 'جنيه مصري', labelEn: 'Egyptian Pound', decimals: 0 },
  { code: 'USD', symbol: '$', labelAr: 'دولار أمريكي', labelEn: 'US Dollar', decimals: 2 },
  { code: 'EUR', symbol: '€', labelAr: 'يورو', labelEn: 'Euro', decimals: 2 },
  { code: 'SAR', symbol: 'ر.س', labelAr: 'ريال سعودي', labelEn: 'Saudi Riyal', decimals: 2 },
  { code: 'AED', symbol: 'د.إ', labelAr: 'درهم إماراتي', labelEn: 'UAE Dirham', decimals: 2 },
  { code: 'GBP', symbol: '£', labelAr: 'جنيه إسترليني', labelEn: 'British Pound', decimals: 2 },
  { code: 'KWD', symbol: 'د.ك', labelAr: 'دينار كويتي', labelEn: 'Kuwaiti Dinar', decimals: 2 },
];

export const SUPPORTED_CURRENCY_CODES: CurrencyCode[] = SUPPORTED_CURRENCIES.map((c) => c.code);

/**
 * Fallback reference rates anchored to 1 EGP (used only if upstream live rate API is unreachable).
 */
export const FALLBACK_RATES_FROM_EGP: Record<CurrencyCode, number> = {
  EGP: 1,
  USD: 0.0201,
  EUR: 0.019,
  SAR: 0.0754,
  AED: 0.0738,
  GBP: 0.0159,
  KWD: 0.00618,
};

export function isSupportedCurrencyCode(value: string | null | undefined): value is CurrencyCode {
  if (!value) return false;
  return SUPPORTED_CURRENCY_CODES.includes(value.trim().toUpperCase() as CurrencyCode);
}

export function resolveBaseCurrencyCode(rawStoreCurrency: string | null | undefined): CurrencyCode {
  const clean = (rawStoreCurrency || '').trim().toUpperCase();
  if (isSupportedCurrencyCode(clean)) return clean;
  if (/ج\.?\s*م|جنيه|EGP/.test(rawStoreCurrency || '')) return 'EGP';
  if (/\$|USD|دولار/.test(rawStoreCurrency || '')) return 'USD';
  if (/€|EUR|يورو/.test(rawStoreCurrency || '')) return 'EUR';
  if (/ر\.?\s*س|SAR|ريال/.test(rawStoreCurrency || '')) return 'SAR';
  if (/د\.?\s*إ|AED|درهم/.test(rawStoreCurrency || '')) return 'AED';
  if (/£|GBP|إسترليني|استرليني/.test(rawStoreCurrency || '')) return 'GBP';
  if (/د\.?\s*ك|KWD|كويتي/.test(rawStoreCurrency || '')) return 'KWD';
  return 'EGP';
}

export function getCurrencyDescriptor(code: CurrencyCode): CurrencyDescriptor {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) || SUPPORTED_CURRENCIES[0];
}

export function buildRelativeRateTable(
  baseCode: CurrencyCode,
  rawRatesFromBase: Partial<Record<string, number>> | null | undefined
): Record<CurrencyCode, number> {
  const fallbackBaseInEgp = FALLBACK_RATES_FROM_EGP[baseCode] || 1;
  const table = {} as Record<CurrencyCode, number>;

  for (const code of SUPPORTED_CURRENCY_CODES) {
    if (code === baseCode) {
      table[code] = 1;
      continue;
    }
    const candidate = rawRatesFromBase?.[code];
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      table[code] = candidate;
    } else {
      table[code] = (FALLBACK_RATES_FROM_EGP[code] || 1) / fallbackBaseInEgp;
    }
  }
  return table;
}

export function convertCurrencyAmount(
  amount: number,
  fromCode: CurrencyCode,
  toCode: CurrencyCode,
  ratesTable: Record<CurrencyCode, number>,
  tableBaseCode: CurrencyCode
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (fromCode === toCode) return amount;

  const fromRate = fromCode === tableBaseCode ? 1 : ratesTable[fromCode];
  const toRate = toCode === tableBaseCode ? 1 : ratesTable[toCode];
  if (!Number.isFinite(fromRate) || fromRate <= 0 || !Number.isFinite(toRate) || toRate <= 0) {
    return 0;
  }

  const amountInTableBase = amount / fromRate;
  return amountInTableBase * toRate;
}

export interface FormattedStorePrice {
  amount: number;
  formattedNumber: string;
  currencyUnit: string;
  code: CurrencyCode;
  isConverted: boolean;
}

export function formatStorePriceDisplay(
  baseAmount: number,
  rawBaseCurrencyLabel: string,
  targetCode: CurrencyCode | null | undefined,
  ratesTable: Record<CurrencyCode, number>,
  lang: Language
): FormattedStorePrice {
  const baseCode = resolveBaseCurrencyCode(rawBaseCurrencyLabel);
  const resolvedTarget: CurrencyCode =
    targetCode && isSupportedCurrencyCode(targetCode) ? targetCode : baseCode;
  const cleanAmount = Number.isFinite(baseAmount) && baseAmount > 0 ? baseAmount : 0;

  if (resolvedTarget === baseCode) {
    const rounded = Math.round(cleanAmount);
    return {
      amount: rounded,
      formattedNumber: rounded.toLocaleString('en-US'),
      currencyUnit: rawBaseCurrencyLabel || (lang === 'ar' ? 'ج.م' : 'EGP'),
      code: baseCode,
      isConverted: false,
    };
  }

  const converted = convertCurrencyAmount(cleanAmount, baseCode, resolvedTarget, ratesTable, baseCode);
  const descriptor = getCurrencyDescriptor(resolvedTarget);
  const decimals = converted >= 1000 ? 0 : descriptor.decimals;
  const formattedNumber = converted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return {
    amount: Number(converted.toFixed(descriptor.decimals)),
    formattedNumber,
    currencyUnit: lang === 'ar' ? `${descriptor.symbol} (${descriptor.code})` : descriptor.code,
    code: resolvedTarget,
    isConverted: true,
  };
}
