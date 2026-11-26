import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_ADMIN_PIN, DEFAULT_TECH_PRODUCTS } from '../data/defaultStoreData.ts';
import {
  applyPermanentProductDelete,
  applyRemoteStoreData,
  buildWhatsappOrderUrl,
  calculateDiscountedPrice,
  filterAndSortTechProducts,
  findRestockMatches,
  formatWhatsappOrderMessage,
  isDesktopDevice,
  isValidAdminPin,
  normalizeWhatsappDigits,
  restoreDefaultProducts,
  sanitizeForFirestore,
  sanitizeOrderPayload,
  sanitizeStoreDataForCloud,
  searchCatalogProductsForAI,
} from './storeLogic.ts';

test('isDesktopDevice allows Windows/Mac desktops and blocks Android/iOS mobile devices', () => {
  assert.equal(
    isDesktopDevice(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
      0,
      1440
    ),
    true
  );
  assert.equal(
    isDesktopDevice(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      0,
      1280
    ),
    true
  );
  assert.equal(
    isDesktopDevice(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
      5,
      390
    ),
    false
  );
  assert.equal(
    isDesktopDevice(
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36',
      5,
      412
    ),
    false
  );
  assert.equal(
    isDesktopDevice(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      5,
      1024
    ),
    false
  );
});

test('isValidAdminPin validates exact 10-digit PINs', () => {
  assert.equal(isValidAdminPin(DEFAULT_ADMIN_PIN), true);
  assert.equal(isValidAdminPin('9876543210'), true);
  assert.equal(isValidAdminPin('12345'), false);
  assert.equal(isValidAdminPin('123456789a'), false);
});

test('filterAndSortTechProducts filters computers, accessories, offers and sorts by price', () => {
  const computers = filterAndSortTechProducts(DEFAULT_TECH_PRODUCTS, {
    categoryTab: 'computers',
    searchQuery: '',
    sortBy: 'price_asc',
  });
  assert.ok(computers.length >= 3);
  assert.ok(computers.every((p) => p.categoryGroup === 'computers'));
  assert.ok(
    calculateDiscountedPrice(computers[0].price, computers[0].discountPercent) <=
      calculateDiscountedPrice(computers[1].price, computers[1].discountPercent)
  );

  const offers = filterAndSortTechProducts(DEFAULT_TECH_PRODUCTS, {
    categoryTab: 'offers',
    searchQuery: '',
    sortBy: 'offers_only',
  });
  assert.ok(offers.every((p) => p.discountPercent > 0));
});

test('applyPermanentProductDelete tracks deleted default IDs and keeps them deleted across remote merges', () => {
  const target = DEFAULT_TECH_PRODUCTS[0];
  const afterDelete = applyPermanentProductDelete(DEFAULT_TECH_PRODUCTS, [], [], [target.id]);

  assert.equal(afterDelete.products.some((p) => p.id === target.id), false);
  assert.ok(afterDelete.deletedDefaultIds.includes(target.id));
  assert.equal(afterDelete.deletedProductsHistory[0].id, target.id);

  // Even if remote snapshot somehow still contained the product ID alongside deletedDefaultIds,
  // applyRemoteStoreData keeps it permanently removed.
  const rehydrated = applyRemoteStoreData({
    products: DEFAULT_TECH_PRODUCTS,
    deletedDefaultIds: afterDelete.deletedDefaultIds,
    deletedProductsHistory: afterDelete.deletedProductsHistory,
  });
  assert.equal(rehydrated.products.some((p) => p.id === target.id), false);

  // Restoring defaults puts it back cleanly without duplicating existing products
  const restored = restoreDefaultProducts(rehydrated.products, DEFAULT_TECH_PRODUCTS);
  assert.equal(restored.deletedDefaultIds.length, 0);
  assert.equal(restored.products.filter((p) => p.id === target.id).length, 1);
});

test('findRestockMatches triggers alert when admin adds a product matching customer watch query', () => {
  const watches = [
    {
      id: 'w-1',
      query: 'ASUS ROG i9',
      matchedDeletedProductId: 'prod-laptop-razer-pro',
      createdAt: new Date().toISOString(),
      notified: false,
    },
  ];
  const matches = findRestockMatches(DEFAULT_TECH_PRODUCTS, watches);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].watchId, 'w-1');
  assert.equal(matches[0].product.id, 'prod-laptop-razer-pro');
});

test('sanitizeOrderPayload validates required fields and builds background order payload', () => {
  const invalid = sanitizeOrderPayload({
    customerName: 'أ',
    customerAddress: 'شارع',
    customerPhone: '123',
    items: [],
    currency: 'ج.م',
  });
  assert.equal(invalid.ok, false);

  const valid = sanitizeOrderPayload({
    customerName: 'محمد أحمد',
    customerAddress: 'القاهرة - مدينة نصر - شارع عباس العقاد عمارة 12',
    customerPhone: '01001234567',
    note: 'التوصيل مساءً',
    items: [
      {
        productId: 'prod-1',
        nameAr: 'لابتوب برو',
        nameEn: 'Pro Laptop',
        quantity: 2,
        unitPrice: 40000,
      },
    ],
    currency: 'ج.م',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.order.total, 80000);
    assert.equal(valid.order.status, 'new');
  }
});

test('sanitizeForFirestore and sanitizeStoreDataForCloud remove undefined values and preserve defaultLanguage', () => {
  const dirty = {
    a: undefined,
    b: Number.NaN,
    nested: { ok: 'yes', fn: () => 1 },
  };
  const clean = sanitizeForFirestore(dirty);
  assert.equal(clean.a, null);
  assert.equal(clean.b, 0);
  assert.equal(clean.nested.fn, null);

  const cloud = sanitizeStoreDataForCloud(
    {
      settings: {
        storeNameAr: 'أشرف تك',
        storeNameEn: 'Ashraf Tech',
        taglineAr: '',
        taglineEn: '',
        siteUrl: '',
        storeIconUrl: '',
        defaultLanguage: undefined as unknown as 'ar',
        currency: 'ج.م',
        heroTitleAr: '',
        heroTitleEn: '',
        heroSubtitleAr: '',
        heroSubtitleEn: '',
        promoBannerImageUrl: '',
        promoBadgeAr: '',
        promoBadgeEn: '',
        layoutStyle: 'modern_grid',
      },
    },
    'ar'
  );
  assert.equal(cloud.settings.defaultLanguage, 'ar');
  assert.equal(cloud.adminPin, DEFAULT_ADMIN_PIN);
});

test('formatWhatsappOrderMessage includes customer name, phone, address, items and total', () => {
  const msg = formatWhatsappOrderMessage({
    id: 'ORD-1234',
    customerName: 'كريم محمود',
    customerAddress: 'الجيزة - المهندسين - شارع جامعة الدول',
    customerPhone: '01099887766',
    note: 'الاتصال قبل الوصول',
    items: [
      {
        productId: 'prod-1',
        nameAr: 'لابتوب برو',
        nameEn: 'Pro Laptop',
        quantity: 1,
        unitPrice: 78760,
      },
    ],
    total: 78760,
    currency: 'ج.م',
    status: 'new',
    createdAt: '2026-11-25T12:00:00.000Z',
  });
  assert.ok(msg.includes('كريم محمود'));
  assert.ok(msg.includes('01099887766'));
  assert.ok(msg.includes('78,760'));
  assert.ok(msg.includes('ORD-1234'));
});

test('searchCatalogProductsForAI matches bilingual products and deleted history cleanly', () => {
  const result = searchCatalogProductsForAI('ASUS ROG laptop', DEFAULT_TECH_PRODUCTS, [
    {
      id: 'del-mac',
      nameAr: 'ماك بوك برو M3',
      nameEn: 'MacBook Pro M3',
      categoryGroup: 'computers',
      specsSummary: 'Apple M3 Pro 18GB',
      deletedAt: '2026-11-20T00:00:00.000Z',
    },
  ]);
  assert.ok(result.matches.some((p) => p.id === 'prod-laptop-razer-pro'));

  const deletedRes = searchCatalogProductsForAI('MacBook M3', DEFAULT_TECH_PRODUCTS, [
    {
      id: 'del-mac',
      nameAr: 'ماك بوك برو M3',
      nameEn: 'MacBook Pro M3',
      categoryGroup: 'computers',
      specsSummary: 'Apple M3 Pro 18GB',
      deletedAt: '2026-11-20T00:00:00.000Z',
    },
  ]);
  assert.equal(deletedRes.deletedMatches[0]?.id, 'del-mac');
});

test('normalizeWhatsappDigits and buildWhatsappOrderUrl build valid wa.me links with customer order details', () => {
  assert.equal(normalizeWhatsappDigits('01025134582'), '201025134582');
  assert.equal(normalizeWhatsappDigits('+20 102 513 4582'), '201025134582');
  assert.equal(normalizeWhatsappDigits(''), '201025134582');

  const url = buildWhatsappOrderUrl('01025134582', 'طلب جديد من: أحمد\nالإجمالي: 10,000 ج.م');
  assert.ok(url.startsWith('https://wa.me/201025134582?text='));
  assert.ok(decodeURIComponent(url).includes('طلب جديد من: أحمد'));
});

