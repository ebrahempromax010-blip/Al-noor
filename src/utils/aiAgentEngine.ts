export interface AgentCatalogProduct {
  id: string;
  nameAr: string;
  nameEn: string;
  brand?: string;
  specsAr?: string;
  specsEn?: string;
  categoryGroup?: string;
  subType?: string;
  price: number;
  discountPercent: number;
  inStock: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isComingSoon?: boolean;
  createdAt?: string;
  imageUrl?: string;
}

export interface AgentDeletedProduct {
  id: string;
  nameAr: string;
  nameEn: string;
  specsSummary?: string;
  deletedAt?: string;
}

export interface AgentSystemUpdate {
  badgeAr?: string;
  badgeEn?: string;
  textAr?: string;
  textEn?: string;
}

export interface AgentOSDownload {
  titleAr?: string;
  titleEn?: string;
  vendor?: string;
  officialUrl?: string;
}

export interface AgentPublicContext {
  storeNameAr?: string;
  storeNameEn?: string;
  currency?: string;
  branchAddress?: string;
  workingHours?: string;
  socialLinks?: Record<string, string>;
  systemUpdates?: AgentSystemUpdate[];
  osDownloads?: AgentOSDownload[];
  products?: AgentCatalogProduct[];
  deletedProductsHistory?: AgentDeletedProduct[];
}

export interface AgentChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export type AgentLangCode = 'ar' | 'fr' | 'es' | 'de' | 'tr' | 'en';
export type AgentUseCase =
  | 'gaming'
  | 'engineering_3d'
  | 'coding_business'
  | 'peripherals_setup'
  | 'software_os'
  | 'general';

export type AgentPrimaryIntent =
  | 'security_sensitive'
  | 'greeting_smalltalk'
  | 'branch_and_hours'
  | 'os_downloads_help'
  | 'order_delivery_help'
  | 'new_arrivals_offers'
  | 'deleted_or_out_of_stock'
  | 'comparison_and_recommendation'
  | 'general_question';

export interface AnalyzedCustomerIntent {
  detectedLang: AgentLangCode;
  isEgyptianDialect: boolean;
  primaryIntent: AgentPrimaryIntent;
  useCase: AgentUseCase;
  budgetMax: number;
  wantsLaptop: boolean;
  wantsDesktop: boolean;
  wantsComparison: boolean;
  wantsLowerPrice: boolean;
  isFollowUpTurn: boolean;
  asksNewArrivals: boolean;
  asksOffers: boolean;
  matchedProducts: AgentCatalogProduct[];
  matchedDeleted: AgentDeletedProduct[];
  outOfStockMatch: AgentCatalogProduct | null;
}

export const GENERIC_AI_STOPWORDS = new Set([
  'gaming',
  'laptop',
  'desktop',
  'computer',
  'screen',
  'monitor',
  'pro',
  'oled',
  'usb',
  'ssd',
  'ram',
  'rgb',
  'ecran',
  'ordinateur',
  'pc',
  'gpu',
  'rtx',
  'gtx',
  'cpu',
  'كمبيوتر',
  'لابتوب',
  'شاشة',
  'كارت',
  'كرت',
  'جيمينج',
  'احترافي',
  'بوصة',
  'أصلية',
  'اصليه',
  'عايز',
  'مقارنة',
  'مقارنه',
  'بين',
  'المتاحة',
  'المتاحه',
  'عندكم',
  'حدود',
  'ألف',
  'الف',
  'للشغل',
  'الثقيل',
  'باشا',
  'دلوقتي',
  'متاح',
  'في',
  'من',
  'على',
  'عن',
  'إلى',
  'الى',
  'مع',
  'يا',
  'هل',
  'ايه',
  'إيه',
  'كام',
  'بكام',
  'لو',
  'سمحت',
  'عاوز',
  'ممكن',
  'اريد',
  'أريد',
  'أفضل',
  'افضل',
  'انسب',
  'أنسب',
  'شغل',
  'ثقيل',
  'حاجة',
  'حاجه',
  'جهاز',
  'اجهزة',
  'أجهزة',
  'the',
  'and',
  'for',
  'with',
  'under',
  'around',
  'budget',
  'compare',
  'best',
  'between',
  'laptops',
  'computers',
  'available',
  'want',
  'need',
  'looking',
  'help',
  'please',
  'what',
  'which',
  'have',
]);

export function normalizeAgentSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/اللابتوبات|لابتوبات|لاب توب/g, 'لابتوب')
    .replace(/الكمبيوترات|كمبيوترات/g, 'كمبيوتر')
    .replace(/الشاشات|شاشات/g, 'شاشة')
    .replace(/الاكسسوارات|إكسسوارات/g, 'اكسسوار')
    .replace(/الجيمنج|جيمنج|للألعاب|للالعاب|الألعاب|الالعاب/g, 'gaming')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeAgentFinalPrice(price: number, discountPercent: number): number {
  const cleanPrice = Number.isFinite(price) && price > 0 ? price : 0;
  const cleanDiscount =
    Number.isFinite(discountPercent) && discountPercent > 0
      ? Math.min(95, Math.max(0, discountPercent))
      : 0;
  return cleanDiscount > 0
    ? Math.round(cleanPrice * (1 - cleanDiscount / 100))
    : Math.round(cleanPrice);
}

export function detectAgentLanguage(text: string, fallbackUiLang: 'ar' | 'en'): AgentLangCode {
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  const lower = ` ${text.toLowerCase()} `;
  if (
    /[àâçéèêëîïôùûüÿœ]/.test(lower) ||
    /\b(bonjour|merci|quel|quelle|écran|ordinateur|taux|conseillez|vous|salut)\b/.test(lower)
  ) {
    return 'fr';
  }
  if (
    /[ñ¿¡áéíóú]/.test(lower) ||
    /\b(hola|gracias|precio|computadora|pantalla|busco|recomienda)\b/.test(lower)
  ) {
    return 'es';
  }
  if (
    /[äöüß]/.test(lower) ||
    /\b(hallo|danke|preis|bildschirm|welcher|suche|empfehlen)\b/.test(lower)
  ) {
    return 'de';
  }
  if (
    /[çğıİöşü]/.test(lower) ||
    /\b(merhaba|fiyat|bilgisayar|ekran|tavsiye|arıyorum)\b/.test(lower)
  ) {
    return 'tr';
  }
  if (/[a-z]/i.test(text)) return 'en';
  return fallbackUiLang;
}

export function detectEgyptianDialect(text: string): boolean {
  return /يا باشا|يا فندم|عايز|عاوز|ايه|إيه|بكام|كام|دلوقتي|عشان|عشان كدة|مش |ممكن تقولي|احسن|أحسن|ازاي|إزاي|فين|عندكم|هاتلي|محتاج حاجة|الفلوس|تقريبا|شوية|برضه|بتاع|اللي/i.test(
    text || ''
  );
}

export function extractBudgetFromText(text: string): number {
  const raw = text || '';
  const arabicThousandsMatch = raw.match(
    /(\d+(?:[.,]\d+)?)\s*(?:ألف|الف|الاف|آلاف|k|K)(?=\s|$|[.!؟،])/
  );
  if (arabicThousandsMatch) {
    return Math.round(parseFloat(arabicThousandsMatch[1].replace(',', '.')) * 1000);
  }
  const explicitBudgetMatch = raw.match(
    /(?:ميزانية|ميزانيتي|حدود|تحت|اقل من|أقل من|بسعر|budget|under|around|max|upto)\s*(\d{4,6})(?=\s|$|[.!؟،])/i
  );
  if (explicitBudgetMatch) {
    return parseInt(explicitBudgetMatch[1], 10);
  }
  return 0;
}

export function findMatchingCatalogAndDeleted(
  query: string,
  products: AgentCatalogProduct[],
  deletedList: AgentDeletedProduct[],
  opts?: { categoryGroup?: string; maxPrice?: number; inStockOnly?: boolean }
) {
  const cleanQuery = normalizeAgentSearchText(query);
  const queryTokens = cleanQuery
    .split(' ')
    .filter(
      (t) =>
        (t.length >= 3 || /^[a-z]\d$/i.test(t)) &&
        !/^\d{1,3}$/.test(t) &&
        !GENERIC_AI_STOPWORDS.has(t)
    );

  const matchedProducts = products.filter((p) => {
    if (opts?.inStockOnly && !p.inStock) return false;
    if (opts?.categoryGroup && p.categoryGroup !== opts.categoryGroup) return false;
    const fp = computeAgentFinalPrice(p.price, p.discountPercent || 0);
    if (opts?.maxPrice && opts.maxPrice > 0 && fp > opts.maxPrice) return false;
    if (!queryTokens.length) return true;
    const hay = normalizeAgentSearchText(
      `${p.nameAr} ${p.nameEn} ${p.brand || ''} ${p.specsAr || ''} ${p.specsEn || ''} ${p.categoryGroup || ''} ${p.subType || ''}`
    );
    return queryTokens.some((tok) => hay.includes(tok));
  });

  const activeInStockIds = new Set(products.filter((p) => p.inStock).map((p) => p.id));
  const activeInStockNames = new Set(
    products
      .filter((p) => p.inStock)
      .flatMap((p) => [
        normalizeAgentSearchText(p.nameAr),
        normalizeAgentSearchText(p.nameEn),
      ])
      .filter(Boolean)
  );
  const specificTokens = cleanQuery
    .split(' ')
    .filter((t) => t.length >= 2 && !GENERIC_AI_STOPWORDS.has(t));

  const matchedDeleted = deletedList.filter((item) => {
    if (activeInStockIds.has(item.id)) return false;
    const normAr = normalizeAgentSearchText(item.nameAr);
    const normEn = normalizeAgentSearchText(item.nameEn);
    if (
      (normAr && activeInStockNames.has(normAr)) ||
      (normEn && activeInStockNames.has(normEn))
    ) {
      return false;
    }
    const hay = normalizeAgentSearchText(
      `${item.nameAr} ${item.nameEn} ${item.specsSummary || ''}`
    );
    if (!hay || !specificTokens.length) return false;
    if ((normAr && cleanQuery.includes(normAr)) || (normEn && cleanQuery.includes(normEn))) {
      return true;
    }
    const overlap = specificTokens.filter((tok) => hay.includes(tok));
    return overlap.length >= Math.min(2, specificTokens.length);
  });

  return {
    matchedProducts: matchedProducts.slice(0, 6),
    matchedDeleted: matchedDeleted.slice(0, 4),
  };
}

export function detectCustomerUseCase(text: string): AgentUseCase {
  const combined = text || '';
  if (
    /هندسة|اوتوكاد|أوتوكاد|ريفيت|ثري دي|ريندر|مونتاج|بريمير|أفتر|3d|autocad|revit|blender|premiere|render|video edit|cad|architecture|workstation|cinema/i.test(
      combined
    )
  ) {
    return 'engineering_3d';
  }
  if (
    /جيمنج|ألعاب|العاب|بث|ستريم|فريمات|gaming|gamer|stream|fps|esports|rog|rtx|4080|4090/i.test(
      combined
    )
  ) {
    return 'gaming';
  }
  if (
    /برمجة|برمجه|مبرمج|كود|تطوير|بيزنس|أعمال|اعمال|جامعة|كلية|حاسبات|دراسة|سفر|بسافر|تنقل|بطارية|بطاريه|بطاريته|خفيف|شغل|coding|developer|programming|business|thinkpad|battery|student|portable|work/i.test(
      combined
    )
  ) {
    return 'coding_business';
  }
  if (
    /إكسسوار|اكسسوار|شاشة|سماعة|كيبورد|ماوس|ميكروفون|منحنية|oled|monitor|headset|keyboard|mouse|mic|bundle/i.test(
      combined
    )
  ) {
    return 'peripherals_setup';
  }
  if (
    /ويندوز|أوفيس|اوفيس|برمجيات|برامج|تفعيل|تعريف|نسخة|windows|office|license|macos|driver|software/i.test(
      combined
    )
  ) {
    return 'software_os';
  }
  return 'general';
}

export function analyzeCustomerIntent(
  rawMessage: string,
  history: AgentChatTurn[],
  products: AgentCatalogProduct[],
  deletedHistory: AgentDeletedProduct[],
  uiLang: 'ar' | 'en'
): AnalyzedCustomerIntent {
  const detectedLang = detectAgentLanguage(rawMessage, uiLang);
  const recentUserText = history
    .filter((h) => h.role === 'user')
    .slice(-3)
    .map((h) => h.text)
    .join(' ');
  const combinedHistoryText = `${recentUserText} ${rawMessage}`.trim();
  const isEgyptianDialect = detectEgyptianDialect(combinedHistoryText);

  const asksSecret =
    /\b(adminpin|secretordersphone|orderwebhookurl|webhook|pin|password|admin\s*panel|admin\s*dashboard|customer\s*orders?|customer\s*list|customer\s*phones?|customer\s*addresses?)\b|رمز الأدمن|كلمة سر|رقم الطلبات السري|رقم الأوردرات|الرقم السري|لوحة الإدارة|إدارة المتجر|الطلبات الواردة|طلبات العملاء|بيانات العملاء|أرقام العملاء|عناوين العملاء|حسابات الإدارة/i.test(
      rawMessage
    );

  const isFollowUpTurn =
    history.length > 0 &&
    /^(طيب|طب|و|طب لو|الأول|الأولاني|التاني|الثاني|أرخص|ارخص|أقوى|اقوى|ايه الفرق|طب في|ماشي|تمام|ok|and|what about|cheaper|better|the first|the second)/i.test(
      rawMessage.trim()
    );

  const budgetFromMsg = extractBudgetFromText(rawMessage);
  const budgetMax = budgetFromMsg > 0 ? budgetFromMsg : isFollowUpTurn ? extractBudgetFromText(recentUserText) : 0;

  const useCaseFromMsg = detectCustomerUseCase(rawMessage);
  const useCase =
    useCaseFromMsg !== 'general'
      ? useCaseFromMsg
      : isFollowUpTurn
        ? detectCustomerUseCase(recentUserText)
        : 'general';

  const wantsLaptop = /لابتوب|لاب\s*توب|laptop|notebook/i.test(
    isFollowUpTurn ? combinedHistoryText : rawMessage
  );
  const wantsDesktop = /كيسة|تجميعة|بي سي|desktop|workstation|pc/i.test(
    isFollowUpTurn ? combinedHistoryText : rawMessage
  );
  const wantsComparison =
    /مقارن|قارن|الفرق|أيهما|انهي|الأول|التاني|compare|vs|versus|difference|better/i.test(
      rawMessage
    );
  const wantsLowerPrice = /أرخص|ارخص|أوفر|اوفر|اقتصادي|ميزانية أقل|cheaper|affordable|save/i.test(
    rawMessage
  );
  const asksNewArrivals = /جديد|وصل|حديث|تحديث|new arrival|latest|updates/i.test(rawMessage);
  const asksOffers = /عرض|عروض|خصم|تخفيض|أوفر|offer|deal|discount/i.test(rawMessage);

  const initialSearch = findMatchingCatalogAndDeleted(
    rawMessage,
    products,
    deletedHistory
  );

  const outOfStockMatch =
    products.find((p) => {
      if (p.inStock) return false;
      const hay = normalizeAgentSearchText(
        `${p.nameAr} ${p.nameEn} ${p.brand || ''} ${p.specsAr || ''} ${p.specsEn || ''}`
      );
      const tokens = normalizeAgentSearchText(rawMessage)
        .split(' ')
        .filter((t) => t.length >= 3 && !GENERIC_AI_STOPWORDS.has(t));
      return tokens.some((t) => hay.includes(t));
    }) || null;

  const deletedHit = initialSearch.matchedDeleted[0] || null;
  const exactModelExistsInStock = deletedHit
    ? products.some((p) => {
        if (!p.inStock) return false;
        const hay = normalizeAgentSearchText(`${p.nameAr} ${p.nameEn}`);
        const delEn = normalizeAgentSearchText(deletedHit.nameEn);
        const delAr = normalizeAgentSearchText(deletedHit.nameAr);
        return (delEn && hay.includes(delEn)) || (delAr && hay.includes(delAr));
      })
    : false;

  const asksBranch =
    /عنوان|الفرع|فين|مكانكم|ساعات العمل|مواعيد|شغالين امتى|خريطة|address|branch|location|hours|open|where are you/i.test(
      rawMessage
    );
  const asksOsCenter =
    /تحميل ويندوز|تحديث ويندوز|مركز الأنظمة|نظام|mac\s*os|windows 11|iso|drivers|تعريفات/i.test(
      rawMessage
    ) && !/حزمة برمجيات|سعر/.test(rawMessage);
  const asksOrderFlow =
    /أطلب ازاي|اطلب ازاي|طريقة الطلب|التوصيل|شحن|دفع|كاش|how to order|shipping|delivery|payment|checkout/i.test(
      rawMessage
    );
  const isGreetingOnly =
    /^(السلام عليكم|أهلا|اهلا|أهلاً|مرحبا|مرحباً|صباح الخير|مساء الخير|ازيك|إزيك|عامل ايه|هاي|hello|hi|hey|bonjour|hola|hallo|merhaba)[!؟?.\s]*$/i.test(
      rawMessage.trim()
    );

  let primaryIntent: AgentPrimaryIntent = 'general_question';
  if (asksSecret) {
    primaryIntent = 'security_sensitive';
  } else if (outOfStockMatch || (deletedHit && !exactModelExistsInStock)) {
    primaryIntent = 'deleted_or_out_of_stock';
  } else if (isGreetingOnly) {
    primaryIntent = 'greeting_smalltalk';
  } else if (asksBranch) {
    primaryIntent = 'branch_and_hours';
  } else if (asksOsCenter) {
    primaryIntent = 'os_downloads_help';
  } else if (asksOrderFlow) {
    primaryIntent = 'order_delivery_help';
  } else if (asksNewArrivals || asksOffers) {
    primaryIntent = 'new_arrivals_offers';
  } else if (
    useCase !== 'general' ||
    budgetMax > 0 ||
    wantsLaptop ||
    wantsDesktop ||
    wantsComparison ||
    wantsLowerPrice ||
    initialSearch.matchedProducts.length > 0
  ) {
    primaryIntent = 'comparison_and_recommendation';
  }

  return {
    detectedLang,
    isEgyptianDialect,
    primaryIntent,
    useCase,
    budgetMax,
    wantsLaptop,
    wantsDesktop,
    wantsComparison,
    wantsLowerPrice,
    isFollowUpTurn,
    asksNewArrivals,
    asksOffers,
    matchedProducts: initialSearch.matchedProducts,
    matchedDeleted: initialSearch.matchedDeleted,
    outOfStockMatch,
  };
}

export function scoreAndSelectRecommendations(
  products: AgentCatalogProduct[],
  intent: AnalyzedCustomerIntent
): AgentCatalogProduct[] {
  const inStock = products.filter((p) => p.inStock);
  if (inStock.length === 0) return [];

  let candidates =
    intent.matchedProducts.filter((p) => p.inStock).length > 0 &&
    !intent.wantsLowerPrice &&
    !intent.asksOffers
      ? intent.matchedProducts.filter((p) => p.inStock)
      : [...inStock];

  if (intent.wantsLaptop) {
    const laptops = candidates.filter((p) =>
      /لابتوب|laptop/i.test(`${p.nameAr} ${p.nameEn} ${p.subType || ''}`)
    );
    if (laptops.length > 0) candidates = laptops;
  } else if (intent.wantsDesktop) {
    const desktops = candidates.filter((p) =>
      /كيسة|تجميعة|desktop|workstation/i.test(`${p.nameAr} ${p.nameEn} ${p.subType || ''}`)
    );
    if (desktops.length > 0) candidates = desktops;
  } else if (intent.useCase === 'peripherals_setup') {
    const acc = candidates.filter(
      (p) =>
        p.categoryGroup === 'accessories' ||
        /شاشة|monitor|oled/i.test(`${p.nameAr} ${p.nameEn}`)
    );
    if (acc.length > 0) candidates = acc;
  } else if (intent.useCase === 'software_os') {
    const sw = candidates.filter((p) => p.categoryGroup === 'software');
    if (sw.length > 0) candidates = sw;
  } else if (
    intent.useCase === 'gaming' ||
    intent.useCase === 'engineering_3d' ||
    intent.useCase === 'coding_business'
  ) {
    const comp = candidates.filter((p) => p.categoryGroup === 'computers');
    if (comp.length > 0) candidates = comp;
  }

  if (intent.asksOffers) {
    const discounted = candidates.filter((p) => (p.discountPercent || 0) > 0);
    if (discounted.length > 0) candidates = discounted;
  }
  if (intent.asksNewArrivals) {
    const arrivals = candidates.filter((p) => p.isNewArrival);
    if (arrivals.length > 0) candidates = arrivals;
  }

  if (intent.budgetMax > 0) {
    const withinBudget = candidates.filter(
      (p) => computeAgentFinalPrice(p.price, p.discountPercent || 0) <= intent.budgetMax
    );
    if (withinBudget.length > 0) {
      candidates = withinBudget;
    }
  }

  const scored = candidates.map((p) => {
    let score = 0;
    const text = `${p.nameAr} ${p.nameEn} ${p.specsAr || ''} ${p.specsEn || ''}`.toLowerCase();
    const fp = computeAgentFinalPrice(p.price, p.discountPercent || 0);

    if (p.isFeatured) score += 8;
    if (p.isNewArrival) score += 6;
    if ((p.discountPercent || 0) > 0) score += 5;

    if (intent.useCase === 'gaming') {
      if (/rtx\s*40(80|90)|rog|175hz|oled/i.test(text)) score += 35;
      if (/لابتوب|laptop/.test(text) && intent.wantsLaptop) score += 15;
    } else if (intent.useCase === 'engineering_3d') {
      if (/rtx\s*40(80|90)|64gb|32gb|i9|ryzen 9/i.test(text)) score += 35;
    } else if (intent.useCase === 'coding_business') {
      if (/thinkpad|ultra 7|14\s*(?:ساعة|hour)|برمجة|بطارية|business|developer/i.test(text)) score += 45;
      if (fp <= 65000) score += 12;
    } else if (intent.useCase === 'peripherals_setup') {
      if (p.categoryGroup === 'accessories' || /monitor|شاشة/i.test(text)) score += 30;
    } else if (intent.useCase === 'software_os') {
      if (p.categoryGroup === 'software') score += 40;
    }

    if (intent.wantsLowerPrice) {
      score -= fp / 1000;
    } else if (intent.budgetMax > 0) {
      // Closest high-value fit near customer's budget
      score += Math.max(0, 20 - Math.abs(intent.budgetMax - fp) / 4000);
    }

    return { product: p, score, finalPrice: fp };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.product);
}

export function composeIntelligentFallbackResponse(
  rawMessage: string,
  intent: AnalyzedCustomerIntent,
  ctx: AgentPublicContext,
  aiConfigured: boolean
) {
  const lang = intent.detectedLang;
  const currency = ctx.currency || (lang === 'ar' ? 'ج.م' : 'EGP');
  const storeName =
    lang === 'ar' ? ctx.storeNameAr || 'النور للكمبيوتر' : ctx.storeNameEn || 'Al-Nour Computer';
  const products = Array.isArray(ctx.products) ? ctx.products : [];

  if (intent.primaryIntent === 'security_sensitive') {
    return {
      reply:
        lang === 'ar'
          ? 'أهلاً بك يا فندم! جميع بيانات لوحة الإدارة، الطلبات الواردة، وبيانات العملاء والأرقام الداخلية محجوبة وسرية تماماً ولا يمكنني الوصول إليها أو مشاركتها، لكن يسعدني جداً مساعدتك في مقارنة الأجهزة أو الاستفسار عن الأسعار والمواصفات.'
          : 'Welcome! All admin dashboard data, incoming orders, customer details, and private credentials are strictly hidden and confidential. I am happy to help you compare hardware specs, check prices, or explore our available offers.',
      unavailableRequested: false,
      watchQuery: null,
      matchedDeletedProductId: null,
      recommendedProducts: [],
      sources: [],
      aiConfigured,
    };
  }

  if (intent.primaryIntent === 'deleted_or_out_of_stock') {
    const deletedHit = intent.matchedDeleted[0] || null;
    const itemAr = deletedHit?.nameAr || intent.outOfStockMatch?.nameAr || rawMessage;
    const itemEn = deletedHit?.nameEn || intent.outOfStockMatch?.nameEn || rawMessage;

    const restockByLang: Record<AgentLangCode, string> = {
      ar: `عذراً، هذا المنتج (${itemAr}) نفد/تم حذفه حالياً، سأسجل طلبك وسأرسل لك إشعاراً فور توفره.`,
      fr: `Désolé, ce produit (${itemEn || itemAr}) est actuellement épuisé. J'enregistre votre demande et je vous enverrai une notification dès son retour.`,
      es: `Lo siento, este producto (${itemEn || itemAr}) está agotado actualmente. Registraré tu solicitud y te avisaré en cuanto esté disponible.`,
      de: `Entschuldigung, dieses Produkt (${itemEn || itemAr}) ist derzeit vergriffen. Ich merke Ihre Anfrage vor und benachrichtige Sie sofort bei Verfügbarkeit.`,
      tr: `Üzgünüm, bu ürün (${itemEn || itemAr}) şu anda tükendi. Talebinizi kaydediyorum, stoklara girer girmez size bildirim göndereceğim.`,
      en: `Sorry, this product (${itemEn}) is currently out of stock. I've registered your request and will send you a notification as soon as it becomes available.`,
    };

    const altPicks = scoreAndSelectRecommendations(products, {
      ...intent,
      matchedProducts: [],
    }).slice(0, 2);

    let reply = restockByLang[lang] || restockByLang.en;
    if (lang === 'ar' && altPicks.length > 0) {
      const alt = altPicks[0];
      const altPrice = computeAgentFinalPrice(alt.price, alt.discountPercent).toLocaleString('en-US');
      reply += `\n\nولو مستعجل ومحتاج بديل قريب متاح حالياً، عندك **${alt.nameAr}** بسعر ${altPrice} ${currency} (${alt.specsAr || ''}). تحب أضيفه للسلة أو أشرحلك الفروقات؟`;
    }

    return {
      reply,
      unavailableRequested: true,
      watchQuery: rawMessage,
      matchedDeletedProductId: deletedHit?.id || intent.outOfStockMatch?.id || null,
      recommendedProducts: altPicks.map((p) => ({
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        brand: p.brand || '',
        price: p.price,
        discountPercent: p.discountPercent || 0,
        finalPrice: computeAgentFinalPrice(p.price, p.discountPercent || 0),
        imageUrl: p.imageUrl || '/pwa-512x512.png',
        inStock: p.inStock,
      })),
      sources: [],
      aiConfigured,
    };
  }

  if (intent.primaryIntent === 'greeting_smalltalk') {
    return {
      reply:
        lang === 'ar'
          ? `أهلاً بك يا فندم في ${storeName}! منورنا والله.\nأنا معاك لو محتاج ترشيح لابتوب أو تجميعة على قد ميزانيتك، أو عايز تقارن بين مواصفات معينة، أو حتى تسأل عن التوصيل والعنوان. بتفكر في جهاز لإيه تحديداً؟`
          : `Welcome to ${storeName}! Great to have you here.\nTell me what you need your setup for—gaming, engineering, coding, or accessories—and your approximate budget, and I'll tailor the smartest recommendation for you.`,
      unavailableRequested: false,
      watchQuery: null,
      matchedDeletedProductId: null,
      recommendedProducts: [],
      sources: [],
      aiConfigured,
    };
  }

  if (intent.primaryIntent === 'branch_and_hours') {
    const addr = ctx.branchAddress || (lang === 'ar' ? 'القاهرة — مول البستان للكمبيوتر' : 'Cairo — El Bostan Tech Mall');
    const hrs = ctx.workingHours || (lang === 'ar' ? 'يومياً من 11:00 صباحاً حتى 10:30 مساءً' : 'Daily 11:00 AM - 10:30 PM');
    return {
      reply:
        lang === 'ar'
          ? `تشرفنا في أي وقت يا فندم!\n📍 **عنوان الفرع:** ${addr}\n🕒 **مواعيد العمل:** ${hrs}\n\nوكمان تقدر تطلب أونلاين من السلة وهيتسجل طلبك ونتابع معاك التوصيل فوراً.`
          : `We'd love to welcome you anytime!\n📍 **Branch:** ${addr}\n🕒 **Hours:** ${hrs}\n\nYou can also place your order directly via the Cart for quick delivery.`,
      unavailableRequested: false,
      watchQuery: null,
      matchedDeletedProductId: null,
      recommendedProducts: [],
      sources: [],
      aiConfigured,
    };
  }

  if (intent.primaryIntent === 'order_delivery_help') {
    return {
      reply:
        lang === 'ar'
          ? `الطلب عندنا سهل وسريع جداً:\n1. اضغط على **"أضف للسلة"** تحت أي منتج عجبك.\n2. افتح تبويب **"سلة المشتريات"** من الشريط السفلي.\n3. اكتب اسمك، العنوان بالتفصيل، ورقم الموبايل واضغط **"إرسال الطلب"**.\nالطلب بيوصلنا في لحظتها وبنتواصل معاك لتأكيد الموعد والشحن!`
          : `Ordering takes under a minute:\n1. Tap **"Add to Cart"** on the items you want.\n2. Open the **Cart** tab from the bottom bar.\n3. Fill in your name, delivery address, and phone number and tap **Submit Order**—our team receives it immediately!`,
      unavailableRequested: false,
      watchQuery: null,
      matchedDeletedProductId: null,
      recommendedProducts: [],
      sources: [],
      aiConfigured,
    };
  }

  if (intent.primaryIntent === 'os_downloads_help') {
    const osList = (ctx.osDownloads || [])
      .slice(0, 3)
      .map((o) => `• ${lang === 'ar' ? o.titleAr || o.titleEn : o.titleEn || o.titleAr} (${o.vendor || 'Official'})`)
      .join('\n');
    return {
      reply:
        lang === 'ar'
          ? `أكيد! عندنا **مركز الأنظمة الرسمي** في الشريط العلوي تقدر تحمل منه نسخ وتحديثات Windows وmacOS وتعريفات الكروت الأصلية مباشرة من الكمبيوتر.\n${osList ? `المتوفر حالياً:\n${osList}` : ''}\nولو عايز تشتري ترخيص Windows 11 Pro + Office 2024 أصلي مدى الحياة فهو متوفر عندنا في المتجر.`
          : `Sure! You can access our **Official OS & Drivers Center** from the top banner on any desktop PC to grab official Windows, macOS, and GPU driver updates.\n${osList}`,
      unavailableRequested: false,
      watchQuery: null,
      matchedDeletedProductId: null,
      recommendedProducts: products
        .filter((p) => p.categoryGroup === 'software' && p.inStock)
        .slice(0, 1)
        .map((p) => ({
          id: p.id,
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          brand: p.brand || '',
          price: p.price,
          discountPercent: p.discountPercent || 0,
          finalPrice: computeAgentFinalPrice(p.price, p.discountPercent || 0),
          imageUrl: p.imageUrl || '/pwa-512x512.png',
          inStock: p.inStock,
        })),
      sources: [],
      aiConfigured,
    };
  }

  const picks = scoreAndSelectRecommendations(products, intent);
  const picksText = picks
    .map((p, idx) => {
      const fp = computeAgentFinalPrice(p.price, p.discountPercent || 0).toLocaleString('en-US');
      const discountTag =
        (p.discountPercent || 0) > 0
          ? lang === 'ar'
            ? ` (خصم ${p.discountPercent}%)`
            : ` (${p.discountPercent}% OFF)`
          : '';
      const arrivalTag = p.isNewArrival ? (lang === 'ar' ? ' [وصل حديثاً]' : ' [New Arrival]') : '';
      return lang === 'ar'
        ? `${idx + 1}. **${p.nameAr}**${arrivalTag} — ${fp} ${currency}${discountTag}\n   المواصفات: ${p.specsAr || p.specsEn || ''}`
        : `${idx + 1}. **${p.nameEn}**${arrivalTag} — ${fp} ${currency}${discountTag}\n   Specs: ${p.specsEn || p.specsAr || ''}`;
    })
    .join('\n');

  const adviceByUseCaseAr: Record<AgentUseCase, string> = {
    engineering_3d:
      '💡 **نصيحة هندسية عملية:** لبرامج الريندر و3D والمونتاج الثقيل، الأهم هو كارت شاشة RTX بذاكرة عالية مع رامات 32GB على الأقل عشان ميهنجش معاك في المشاريع الكبيرة.',
    gaming:
      '💡 **ترشيحي للجيمنج:** لو هدفك أعلى فريمات على دقة عالية وشاشة ألوانها مبهرة فالأول هيديك أداء جبار، ولو عايز قيمة قوية مقابل السعر التاني ممتاز.',
    coding_business:
      '💡 **نصيحتي للبرمجة والشغل:** الأهم هنا هو عمر البطارية، خفة الوزن في التنقل، وشاشة مريحة للعين — وده بالظبط اللي بيقدمه ThinkPad Core Ultra 7 مع 32GB RAM.',
    peripherals_setup:
      '💡 **لأحسن تجربة ست أب:** سواء بتجدد مكتبك بشاشة OLED فائقة السرعة أو باقة إكسسوارات كاملة، الاختيارات دي بتجمع بين الاستجابة السريعة والخامات الأصلية.',
    software_os:
      '💡 **معلومة سريعة:** الترخيص الأصلي بيضمنلك تحديثات أمان مستمرة واستقرار كامل بدون أي مشاكل تفعيل.',
    general:
      picks.length >= 2
        ? '💡 **رأي مستشارك:** لو حابب أعلى أداء ممكن فالاختيار الأول هو الأقوى، ولو بتدور على توازن ذكي في السعر فالاختيار التاني ممتاز جداً.'
        : 'تحب أوضحلك تفاصيل أكتر أو أرشحلك بديل في فئة سعرية مختلفة؟',
  };

  if (lang === 'ar') {
    const budgetIntro =
      intent.budgetMax > 0
        ? `على ميزانيتك (${intent.budgetMax.toLocaleString('en-US')} ${currency})، `
        : '';
    return {
      reply:
        picks.length > 0
          ? `أهلاً بك يا فندم! ${budgetIntro}شوف الاختيارات الأنسب ليك من مخزون ${storeName} اللحظي:\n\n${picksText}\n\n${adviceByUseCaseAr[intent.useCase]}\nقولي إيه أكتر نقطة بتهمك (السعر ولا القوة ولا التنقل) وهحسمهالك فوراً!`
          : `أهلاً بك يا فندم في ${storeName}! احكيلي بتستخدم الجهاز في إيه وميزانيتك التقريبية كام، وهارشحلك أفضل أجهزة متوفرة عندنا فوراً.`,
      unavailableRequested: false,
      watchQuery: null,
      matchedDeletedProductId: null,
      recommendedProducts: picks.map((p) => ({
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        brand: p.brand || '',
        price: p.price,
        discountPercent: p.discountPercent || 0,
        finalPrice: computeAgentFinalPrice(p.price, p.discountPercent || 0),
        imageUrl: p.imageUrl || '/pwa-512x512.png',
        inStock: p.inStock,
      })),
      sources: [],
      aiConfigured,
    };
  }

  const localizedHeader: Record<Exclude<AgentLangCode, 'ar'>, string> = {
    fr: `Bonjour ! Voici les meilleures options disponibles chez ${storeName} selon votre besoin :\n\n${picksText}\n\nSouhaitez-vous une comparaison détaillée selon votre budget ?`,
    es: `¡Hola! Estas son las mejores opciones disponibles en ${storeName} para lo que buscas:\n\n${picksText}\n\n¿Quieres que comparemos cuál te conviene más según tu presupuesto?`,
    de: `Hallo! Hier sind die besten verfügbaren Optionen bei ${storeName} für Ihren Bedarf:\n\n${picksText}\n\nSoll ich die Vor- und Nachteile für Ihr Budget vergleichen?`,
    tr: `Merhaba! İhtiyacınıza göre ${storeName} mağazamızdaki en iyi seçenekler şunlardır:\n\n${picksText}\n\nBütçenize göre detaylı karşılaştırma yapmamı ister misiniz?`,
    en: `Hi there! Based on what you're looking for, here are the smartest picks currently in stock at ${storeName}:\n\n${picksText}\n\nWould you like me to break down the exact trade-offs or help you pick the best value for your workflow?`,
  };

  return {
    reply:
      picks.length > 0
        ? localizedHeader[lang]
        : `Welcome to ${storeName}! Tell me what tasks or budget you have in mind and I'll recommend the best setup.`,
    unavailableRequested: false,
    watchQuery: null,
    matchedDeletedProductId: null,
    recommendedProducts: picks.map((p) => ({
      id: p.id,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      brand: p.brand || '',
      price: p.price,
      discountPercent: p.discountPercent || 0,
      finalPrice: computeAgentFinalPrice(p.price, p.discountPercent || 0),
      imageUrl: p.imageUrl || '/pwa-512x512.png',
      inStock: p.inStock,
    })),
    sources: [],
    aiConfigured,
  };
}
