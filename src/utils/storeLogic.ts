import {
  DEFAULT_ADMIN_PIN,
  DEFAULT_STORE_DATA,
  DEFAULT_STORE_ICON_URL,
  DEFAULT_TECH_PRODUCTS,
} from '../data/defaultStoreData';
import {
  CatalogCategoryTab,
  CatalogSortOption,
  CustomerOrder,
  DeletedProductRecord,
  Language,
  OrderItem,
  Product,
  ProductCategoryGroup,
  RestockWatchRequest,
  StoreData,
  StoreSettings,
} from '../types/store';

export const STORE_COLLECTION_PATH = 'computer_tech_store';
export const STORE_DOC_ID = 'main_data';

export function isValidAdminPin(pin: string): boolean {
  return /^\d{10}$/.test(String(pin || '').trim());
}

/**
 * Pure desktop detection guard for the System Updates / OS Download Center.
 * Mobile phones & tablets (Android, iPhone, iPad, or small touch-first viewports) return false.
 */
export function isDesktopDevice(
  userAgent: string,
  maxTouchPoints: number = 0,
  viewportWidth: number = 1280
): boolean {
  const ua = (userAgent || '').toLowerCase();
  const isMobileUa =
    /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/.test(ua);
  const isIpadDesktopMode = /macintosh/.test(ua) && maxTouchPoints > 1;
  if (isMobileUa || isIpadDesktopMode) {
    return false;
  }
  if (viewportWidth > 0 && viewportWidth < 768 && maxTouchPoints > 0) {
    return false;
  }
  return true;
}

export function normalizeSafeUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function sanitizeIconUrl(url: string | null | undefined): string {
  const trimmed = (url || '').trim();
  if (!trimmed) return DEFAULT_STORE_ICON_URL;
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return DEFAULT_STORE_ICON_URL;
}

export function getEffectiveSiteIdentity(settings: StoreSettings, lang: Language) {
  const storeName =
    lang === 'ar'
      ? settings.storeNameAr || DEFAULT_STORE_DATA.settings.storeNameAr
      : settings.storeNameEn || DEFAULT_STORE_DATA.settings.storeNameEn;

  const tagline =
    lang === 'ar'
      ? settings.taglineAr || DEFAULT_STORE_DATA.settings.taglineAr
      : settings.taglineEn || DEFAULT_STORE_DATA.settings.taglineEn;

  const iconUrl = sanitizeIconUrl(settings.storeIconUrl);
  const siteUrl = normalizeSafeUrl(settings.siteUrl);

  return {
    storeName,
    tagline,
    iconUrl,
    siteUrl,
  };
}

export function calculateDiscountedPrice(price: number, discountPercent: number): number {
  const cleanPrice = Number.isFinite(price) && price > 0 ? price : 0;
  const cleanDiscount =
    Number.isFinite(discountPercent) && discountPercent > 0
      ? Math.min(95, Math.max(0, discountPercent))
      : 0;
  if (cleanDiscount <= 0) return Math.round(cleanPrice);
  return Math.round(cleanPrice * (1 - cleanDiscount / 100));
}

export interface CatalogFilterOptions {
  categoryTab: CatalogCategoryTab;
  searchQuery: string;
  sortBy: CatalogSortOption;
  includeSoftwareInAll?: boolean;
}

export function filterAndSortTechProducts(
  products: Product[],
  options: CatalogFilterOptions
): Product[] {
  const { categoryTab, searchQuery, sortBy } = options;
  const query = (searchQuery || '').trim().toLowerCase();

  let list = products.filter((p) => {
    if (categoryTab === 'computers' && p.categoryGroup !== 'computers') {
      return false;
    }
    if (
      categoryTab === 'accessories' &&
      p.categoryGroup !== 'accessories' &&
      p.categoryGroup !== 'software'
    ) {
      return false;
    }
    if (categoryTab === 'offers' && (p.discountPercent || 0) <= 0) {
      return false;
    }
    if (sortBy === 'offers_only' && (p.discountPercent || 0) <= 0) {
      return false;
    }
    if (query) {
      const hay = `${p.nameAr} ${p.nameEn} ${p.brand} ${p.specsAr} ${p.specsEn} ${p.sku} ${p.subType}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  const sorted = [...list];
  if (sortBy === 'price_asc') {
    sorted.sort(
      (a, b) =>
        calculateDiscountedPrice(a.price, a.discountPercent) -
        calculateDiscountedPrice(b.price, b.discountPercent)
    );
  } else if (sortBy === 'price_desc') {
    sorted.sort(
      (a, b) =>
        calculateDiscountedPrice(b.price, b.discountPercent) -
        calculateDiscountedPrice(a.price, a.discountPercent)
    );
  } else if (sortBy === 'offers_only') {
    sorted.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
  } else {
    // 'latest'
    sorted.sort((a, b) => {
      const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
      const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
      return tb - ta;
    });
  }

  return sorted;
}

/**
 * Permanently removes selected products, records default IDs in deletedDefaultIds so they
 * never come back on reload, and stores compact history metadata for AI Customer Service.
 */
export function applyPermanentProductDelete(
  currentProducts: Product[],
  currentDeletedDefaultIds: string[],
  currentHistory: DeletedProductRecord[],
  targetIds: string[]
): {
  products: Product[];
  deletedDefaultIds: string[];
  deletedProductsHistory: DeletedProductRecord[];
} {
  const idSet = new Set(targetIds);
  const removed = currentProducts.filter((p) => idSet.has(p.id));
  const remaining = currentProducts.filter((p) => !idSet.has(p.id));

  const nextDeletedDefaultSet = new Set(currentDeletedDefaultIds);
  const defaultIdSet = new Set(DEFAULT_TECH_PRODUCTS.map((d) => d.id));
  for (const item of removed) {
    if (item.isDefault || defaultIdSet.has(item.id)) {
      nextDeletedDefaultSet.add(item.id);
    }
  }

  const nowIso = new Date().toISOString();
  const existingHistoryMap = new Map(currentHistory.map((h) => [h.id, h]));
  for (const item of removed) {
    existingHistoryMap.set(item.id, {
      id: item.id,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      categoryGroup: item.categoryGroup,
      specsSummary: item.specsAr || item.specsEn || '',
      deletedAt: nowIso,
    });
  }

  return {
    products: remaining,
    deletedDefaultIds: Array.from(nextDeletedDefaultSet),
    deletedProductsHistory: Array.from(existingHistoryMap.values()).slice(-80),
  };
}

/**
 * Restores default tech products cleanly without duplicating custom products already in the catalog.
 */
export function restoreDefaultProducts(
  currentProducts: Product[],
  defaultProducts: Product[] = DEFAULT_TECH_PRODUCTS
): {
  products: Product[];
  deletedDefaultIds: string[];
} {
  const existingIds = new Set(currentProducts.map((p) => p.id));
  const missingDefaults = defaultProducts.filter((dp) => !existingIds.has(dp.id));
  return {
    products: [...missingDefaults, ...currentProducts],
    deletedDefaultIds: [],
  };
}

function tokenizeNormalized(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length >= 2);
}

/**
 * Checks whether a newly added or back-in-stock product matches any pending AI restock watch requests.
 */
export function findRestockMatches(
  activeProducts: Product[],
  watchRequests: RestockWatchRequest[]
): Array<{ watchId: string; product: Product }> {
  const matches: Array<{ watchId: string; product: Product }> = [];
  const inStockProducts = activeProducts.filter((p) => p.inStock);

  for (const watch of watchRequests) {
    if (watch.notified) continue;
    const queryTokens = tokenizeNormalized(watch.query);

    for (const prod of inStockProducts) {
      if (watch.matchedDeletedProductId && prod.id === watch.matchedDeletedProductId) {
        matches.push({ watchId: watch.id, product: prod });
        break;
      }
      const prodText = `${prod.nameAr} ${prod.nameEn} ${prod.brand} ${prod.specsAr} ${prod.specsEn}`.toLowerCase();
      if (!queryTokens.length) continue;

      const cleanQuery = watch.query.trim().toLowerCase();
      if (cleanQuery.length >= 3 && prodText.includes(cleanQuery)) {
        matches.push({ watchId: watch.id, product: prod });
        break;
      }

      const overlap = queryTokens.filter((tok) => prodText.includes(tok));
      const threshold = queryTokens.length === 1 ? 1 : 2;
      if (overlap.length >= threshold) {
        matches.push({ watchId: watch.id, product: prod });
        break;
      }
    }
  }

  return matches;
}

export function sanitizeOrderPayload(input: {
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  note?: string;
  items: OrderItem[];
  currency: string;
}): { ok: true; order: CustomerOrder } | { ok: false; errorAr: string; errorEn: string } {
  const customerName = (input.customerName || '').trim();
  const customerAddress = (input.customerAddress || '').trim();
  const customerPhone = (input.customerPhone || '').trim();
  const note = (input.note || '').trim();

  if (customerName.length < 2) {
    return {
      ok: false,
      errorAr: 'يرجى إدخال الاسم بالكامل.',
      errorEn: 'Please enter your full name.',
    };
  }
  if (customerAddress.length < 5) {
    return {
      ok: false,
      errorAr: 'يرجى إدخال الموقع / العنوان بالتفصيل.',
      errorEn: 'Please enter your full delivery address.',
    };
  }
  const phoneDigits = customerPhone.replace(/[^\d+]/g, '');
  if (phoneDigits.length < 8) {
    return {
      ok: false,
      errorAr: 'يرجى إدخال رقم تليفون صحيح.',
      errorEn: 'Please enter a valid phone number.',
    };
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return {
      ok: false,
      errorAr: 'سلة المشتريات فارغة.',
      errorEn: 'Shopping cart is empty.',
    };
  }

  const sanitizedItems: OrderItem[] = input.items
    .filter((i) => i && i.quantity > 0 && i.unitPrice >= 0)
    .map((i) => ({
      productId: String(i.productId),
      nameAr: String(i.nameAr || ''),
      nameEn: String(i.nameEn || ''),
      quantity: Math.max(1, Math.round(i.quantity)),
      unitPrice: Math.round(i.unitPrice),
    }));

  if (sanitizedItems.length === 0) {
    return {
      ok: false,
      errorAr: 'لا توجد منتجات صالحة في الطلب.',
      errorEn: 'No valid products found in order.',
    };
  }

  const total = sanitizedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  return {
    ok: true,
    order: {
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      customerName,
      customerAddress,
      customerPhone,
      note,
      items: sanitizedItems,
      total,
      currency: input.currency || 'ج.م',
      status: 'new',
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * Recursively strips undefined, functions, Symbols, and NaN/Infinity before Firestore writes.
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
    return null as unknown as T;
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return (Number.isFinite(value) ? value : 0) as unknown as T;
  }
  if (value instanceof Date) {
    return value.toISOString() as unknown as T;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined) as unknown as T;
  }
  if (typeof value === 'object') {
    const cleanObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === undefined || typeof val === 'function' || typeof val === 'symbol') {
        cleanObj[key] = null;
      } else {
        cleanObj[key] = sanitizeForFirestore(val);
      }
    }
    return cleanObj as T;
  }
  return null as unknown as T;
}

export function sanitizeStoreDataForCloud(
  rawData: Partial<StoreData>,
  fallbackLang: Language = 'ar'
): StoreData {
  const safeDefaultLang: Language =
    rawData.settings?.defaultLanguage === 'en' || rawData.settings?.defaultLanguage === 'ar'
      ? rawData.settings.defaultLanguage
      : fallbackLang;

  const validPin = isValidAdminPin(rawData.adminPin || '')
    ? String(rawData.adminPin).trim()
    : DEFAULT_ADMIN_PIN;

  const activeInStockIds = new Set(
    (Array.isArray(rawData.products) ? rawData.products : DEFAULT_STORE_DATA.products)
      .filter((p) => p && p.inStock)
      .map((p) => p.id)
  );
  const cleanDeletedHistory = (
    Array.isArray(rawData.deletedProductsHistory) ? rawData.deletedProductsHistory : []
  ).filter((d) => d && !activeInStockIds.has(d.id));

  const merged: StoreData = {
    settings: {
      ...DEFAULT_STORE_DATA.settings,
      ...(rawData.settings || {}),
      storeIconUrl: sanitizeIconUrl(rawData.settings?.storeIconUrl),
      defaultLanguage: safeDefaultLang,
    },
    branch: {
      ...DEFAULT_STORE_DATA.branch,
      ...(rawData.branch || {}),
    },
    socialLinks: {
      ...DEFAULT_STORE_DATA.socialLinks,
      ...(rawData.socialLinks || {}),
    },
    adminPin: validPin,
    systemUpdates: Array.isArray(rawData.systemUpdates)
      ? rawData.systemUpdates
      : DEFAULT_STORE_DATA.systemUpdates,
    osDownloads: Array.isArray(rawData.osDownloads)
      ? rawData.osDownloads
      : DEFAULT_STORE_DATA.osDownloads,
    products: Array.isArray(rawData.products)
      ? rawData.products
      : DEFAULT_STORE_DATA.products,
    deletedDefaultIds: Array.isArray(rawData.deletedDefaultIds)
      ? rawData.deletedDefaultIds
      : [],
    deletedProductsHistory: cleanDeletedHistory,
    wallpapers: Array.isArray(rawData.wallpapers)
      ? rawData.wallpapers
      : DEFAULT_STORE_DATA.wallpapers,
    orders: Array.isArray(rawData.orders) ? rawData.orders : [],
    updatedAt: new Date().toISOString(),
  };

  return sanitizeForFirestore(merged);
}

/**
 * Merges incoming Firestore data while ensuring deletedDefaultIds stay permanently deleted.
 */
export function applyRemoteStoreData(remote: Partial<StoreData>): StoreData {
  const sanitized = sanitizeStoreDataForCloud(remote, 'ar');
  const deletedSet = new Set(sanitized.deletedDefaultIds || []);

  // Only remove default items explicitly marked deleted
  const cleanProducts = (sanitized.products || []).filter((p) => {
    if (deletedSet.has(p.id)) return false;
    return true;
  });

  return {
    ...sanitized,
    products: cleanProducts,
  };
}

export function getCategoryGroupLabel(group: ProductCategoryGroup, lang: Language): string {
  if (group === 'computers') return lang === 'ar' ? 'كمبيوترات' : 'Computers';
  if (group === 'accessories') return lang === 'ar' ? 'إكسسوارات' : 'Accessories';
  return lang === 'ar' ? 'برمجيات وأنظمة' : 'Software';
}

export function formatWhatsappOrderMessage(order: CustomerOrder): string {
  const lines: string[] = [
    `طلب جديد من: ${order.customerName}`,
    `رقم الطلب: ${order.id}`,
    `رقم تليفون العميل: ${order.customerPhone}`,
    `العنوان بالتفصيل: ${order.customerAddress}`,
    '',
    'المنتجات المطلوبة:',
    ...order.items.map(
      (item, idx) =>
        `${idx + 1}. ${item.nameAr || item.nameEn} × ${item.quantity} — ${(item.unitPrice * item.quantity).toLocaleString('en-US')} ${order.currency}`
    ),
    '',
    `الإجمالي الكلي: ${order.total.toLocaleString('en-US')} ${order.currency}`,
  ];
  if (order.note && order.note.trim()) {
    lines.push(`ملحوظة العميل: ${order.note.trim()}`);
  }
  return lines.join('\n');
}

export const DEFAULT_WHATSAPP_ORDER_NUMBER = '201025134582';

export function normalizeWhatsappDigits(rawPhone: string | null | undefined): string {
  let digits = String(rawPhone || '').replace(/[^\d]/g, '');
  if (digits.startsWith('01') && digits.length === 11) {
    digits = `2${digits}`;
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  return digits.length >= 8 ? digits : DEFAULT_WHATSAPP_ORDER_NUMBER;
}

export function buildWhatsappOrderUrl(
  targetPhone: string | null | undefined,
  formattedOrderText: string
): string {
  const digits = normalizeWhatsappDigits(targetPhone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(formattedOrderText || '')}`;
}

export function searchCatalogProductsForAI(
  query: string,
  products: Product[],
  deletedHistory: DeletedProductRecord[],
  options?: { maxPrice?: number; categoryGroup?: string; inStockOnly?: boolean }
): {
  matches: Product[];
  deletedMatches: DeletedProductRecord[];
} {
  const clean = (query || '').trim().toLowerCase();
  const tokens = clean
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const matches = products.filter((p) => {
    if (options?.inStockOnly && !p.inStock) return false;
    if (options?.categoryGroup && p.categoryGroup !== options.categoryGroup) return false;
    const finalPrice = calculateDiscountedPrice(p.price, p.discountPercent);
    if (options?.maxPrice && options.maxPrice > 0 && finalPrice > options.maxPrice) {
      return false;
    }
    if (!tokens.length) return true;
    const hay = `${p.nameAr} ${p.nameEn} ${p.brand} ${p.specsAr} ${p.specsEn} ${p.categoryGroup} ${p.subType}`.toLowerCase();
    return tokens.some((tok) => hay.includes(tok));
  });

  const activeInStockIds = new Set(products.filter((p) => p.inStock).map((p) => p.id));
  const deletedMatches = deletedHistory.filter((d) => {
    if (activeInStockIds.has(d.id)) return false;
    if (!tokens.length) return false;
    const hay = `${d.nameAr} ${d.nameEn} ${d.specsSummary}`.toLowerCase();
    return tokens.some((tok) => hay.includes(tok));
  });

  return {
    matches: matches.slice(0, 6),
    deletedMatches: deletedMatches.slice(0, 4),
  };
}

