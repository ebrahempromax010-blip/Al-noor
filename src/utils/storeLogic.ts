import {
  CartItem,
  KaratType,
  Language,
  MarketRates,
  Product,
  StoreData,
} from '../types/store';

export const ADMIN_SECRET_PIN = '8492710536';

export function getRateForKarat(karat: KaratType, rates: MarketRates): number {
  switch (karat) {
    case '24':
      return rates.gold24;
    case '21':
      return rates.gold21;
    case '18':
      return rates.gold18;
    case '925':
      return rates.silver925;
    case '999':
      return rates.silverSwiss;
    default:
      return rates.gold21;
  }
}

export interface ProductPriceBreakdown {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  hasDiscount: boolean;
}

export function calculateProductPrice(
  product: Product,
  rates: MarketRates,
  globalAutoLink: boolean
): ProductPriceBreakdown {
  const gramRate = getRateForKarat(product.karat, rates);
  const weight = Math.max(0, Number(product.weightGrams) || 0);
  const making = Math.max(0, Number(product.makingChargePerGram) || 0);
  const autoComputed = Math.round(weight * (gramRate + making));

  const useAuto = globalAutoLink && product.pricingMode === 'auto';
  const basePrice = useAuto
    ? autoComputed
    : product.manualPrice > 0
      ? Math.round(product.manualPrice)
      : autoComputed;

  const discountPct = Math.min(90, Math.max(0, Number(product.discountPercent) || 0));
  if (discountPct > 0) {
    const finalPrice = Math.round(basePrice * (1 - discountPct / 100));
    return {
      originalPrice: basePrice,
      finalPrice,
      discountAmount: Math.max(0, basePrice - finalPrice),
      hasDiscount: true,
    };
  }

  return {
    originalPrice: basePrice,
    finalPrice: basePrice,
    discountAmount: 0,
    hasDiscount: false,
  };
}

export interface CartSummaryLine {
  product: Product;
  quantity: number;
  unitPrice: number;
  unitOriginalPrice: number;
  lineTotal: number;
  lineSavings: number;
}

export interface CartSummary {
  lines: CartSummaryLine[];
  totalItems: number;
  subtotal: number;
  totalSavings: number;
}

export function calculateCartSummary(
  cart: CartItem[],
  products: Product[],
  rates: MarketRates,
  globalAutoLink: boolean
): CartSummary {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const lines: CartSummaryLine[] = [];
  let totalItems = 0;
  let subtotal = 0;
  let totalSavings = 0;

  for (const item of cart) {
    if (item.quantity <= 0) continue;
    const product = productMap.get(item.productId);
    if (!product) continue;

    const price = calculateProductPrice(product, rates, globalAutoLink);
    const lineTotal = price.finalPrice * item.quantity;
    const lineSavings = price.discountAmount * item.quantity;

    lines.push({
      product,
      quantity: item.quantity,
      unitPrice: price.finalPrice,
      unitOriginalPrice: price.originalPrice,
      lineTotal,
      lineSavings,
    });

    totalItems += item.quantity;
    subtotal += lineTotal;
    totalSavings += lineSavings;
  }

  return { lines, totalItems, subtotal, totalSavings };
}

export function computeRatesFromSpot(
  ounceUsd: number,
  silverOunceUsd: number,
  usdEgp: number
): Pick<
  MarketRates,
  'gold24' | 'gold21' | 'gold18' | 'goldPound' | 'silver925' | 'silverSwiss' | 'ounceUsd' | 'silverOunceUsd' | 'usdEgp'
> {
  const TROY_OUNCE_GRAMS = 31.1034768;
  const safeGoldOunce = Math.max(100, ounceUsd);
  const safeSilverOunce = Math.max(1, silverOunceUsd);
  const safeUsdEgp = Math.max(1, usdEgp);

  const gold24 = Math.round((safeGoldOunce / TROY_OUNCE_GRAMS) * safeUsdEgp);
  const gold21 = Math.round(gold24 * (21 / 24));
  const gold18 = Math.round(gold24 * (18 / 24));
  const goldPound = Math.round(gold21 * 8);

  const silverSwiss = Math.round(((safeSilverOunce / TROY_OUNCE_GRAMS) * safeUsdEgp) * 1.25);
  const silver925 = Math.round(silverSwiss * 0.925);

  return {
    gold24,
    gold21,
    gold18,
    goldPound,
    silver925,
    silverSwiss,
    ounceUsd: Number(safeGoldOunce.toFixed(2)),
    silverOunceUsd: Number(safeSilverOunce.toFixed(2)),
    usdEgp: Number(safeUsdEgp.toFixed(2)),
  };
}

export interface DiamondPrices {
  carat1Usd: number;
  carat1Egp: number;
  halfCaratEgp: number;
  quarterCaratEgp: number;
}

export function computeDiamondPrices(
  diamondCaratUsd: number,
  usdEgp: number
): DiamondPrices {
  const safeUsd = Math.max(100, Number(diamondCaratUsd) || 3850);
  const safeRate = Math.max(1, Number(usdEgp) || 50);
  const carat1Egp = Math.round(safeUsd * safeRate);
  // Half carat & quarter carat reflect standard Rapaport carat-weight tiering
  const halfCaratEgp = Math.round(safeUsd * 0.42 * safeRate);
  const quarterCaratEgp = Math.round(safeUsd * 0.19 * safeRate);
  return {
    carat1Usd: Number(safeUsd.toFixed(2)),
    carat1Egp,
    halfCaratEgp,
    quarterCaratEgp,
  };
}

export function formatCurrency(amount: number, lang: Language): string {
  const formatted = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US').format(
    Math.round(amount)
  );
  return lang === 'ar' ? `${formatted} ج.م` : `${formatted} EGP`;
}

export function sanitizePhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) return '201000000000';
  if (digits.startsWith('01') && digits.length === 11) {
    return `2${digits}`;
  }
  return digits;
}

export function buildWhatsAppProductUrl(
  whatsappNumber: string,
  product: Product,
  finalPrice: number,
  lang: Language
): string {
  const cleanPhone = sanitizePhoneForWhatsApp(whatsappNumber);
  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const message =
    lang === 'ar'
      ? `مرحباً أشرف جولد، أرغب في طلب المنتج:\n• ${name}\n• الكود: ${product.code}\n• العيار: ${product.karat}\n• الوزن: ${product.weightGrams} جم\n• السعر المعروض: ${finalPrice.toLocaleString('en-US')} ج.م`
      : `Hello Ashraf Gold, I would like to order:\n• ${name}\n• Code: ${product.code}\n• Karat: ${product.karat}\n• Weight: ${product.weightGrams} g\n• Listed Price: ${finalPrice.toLocaleString('en-US')} EGP`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppCartUrl(
  whatsappNumber: string,
  summary: CartSummary,
  storeName: string,
  lang: Language
): string {
  const cleanPhone = sanitizePhoneForWhatsApp(whatsappNumber);
  const itemLines = summary.lines
    .map((line, index) => {
      const name = lang === 'ar' ? line.product.nameAr : line.product.nameEn;
      return lang === 'ar'
        ? `${index + 1}. ${name} (${line.product.code}) × ${line.quantity} = ${line.lineTotal.toLocaleString('en-US')} ج.م`
        : `${index + 1}. ${name} (${line.product.code}) × ${line.quantity} = ${line.lineTotal.toLocaleString('en-US')} EGP`;
    })
    .join('\n');

  const header =
    lang === 'ar'
      ? `فاتورة طلب جديدة — ${storeName}\n------------------------`
      : `New Order Invoice — ${storeName}\n------------------------`;

  const footer =
    lang === 'ar'
      ? `------------------------\nإجمالي القطع: ${summary.totalItems}\nالإجمالي النهائي: ${summary.subtotal.toLocaleString('en-US')} ج.م`
      : `------------------------\nTotal Items: ${summary.totalItems}\nGrand Total: ${summary.subtotal.toLocaleString('en-US')} EGP`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`${header}\n${itemLines}\n${footer}`)}`;
}

export function filterProducts(
  products: Product[],
  activeCategory: string,
  searchQuery: string
): Product[] {
  const q = searchQuery.trim().toLowerCase();
  return products.filter((product) => {
    const matchesCategory =
      activeCategory === 'all'
        ? true
        : activeCategory === 'offers'
          ? product.discountPercent > 0
          : product.categoryId === activeCategory;

    if (!matchesCategory) return false;
    if (!q) return true;

    const haystack = [
      product.nameAr,
      product.nameEn,
      product.code,
      product.karat,
      `${product.karat}k`,
      `عيار ${product.karat}`,
      product.metal === 'gold' ? 'ذهب gold' : 'فضة silver',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });
}

export function validateStoreBackup(rawJson: string): { ok: true; data: StoreData } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson) as Partial<StoreData>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.rates ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.products) ||
      !parsed.banner ||
      !parsed.branch
    ) {
      return {
        ok: false,
        error: 'ملف JSON غير صالح: يجب أن يحتوي على بيانات الأسعار والفئات والمنتجات والبنر والفرع.',
      };
    }
    return {
      ok: true,
      data: {
        ...parsed,
        updatedAt: new Date().toISOString(),
      } as StoreData,
    };
  } catch {
    return {
      ok: false,
      error: 'تعذر قراءة ملف JSON: تأكد من سلامة التنسيق.',
    };
  }
}
