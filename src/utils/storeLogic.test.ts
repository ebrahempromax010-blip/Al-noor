import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_SECRET_PIN,
  buildWhatsAppCartUrl,
  buildWhatsAppProductUrl,
  calculateCartSummary,
  calculateProductPrice,
  computeDiamondPrices,
  computeRatesFromSpot,
  filterAdminProducts,
  filterProducts,
  getEffectiveSiteIdentity,
  getWishlistProducts,
  normalizeWebsiteUrl,
  removeProductsByIds,
  reorderItems,
  sanitizeForFirestore,
  sanitizeIconUrl,
  toggleWishlistItem,
  upsertProductList,
  validateStoreBackup,
} from './storeLogic';
import { DEFAULT_STORE_DATA } from '../data/defaultStoreData';
import { Product, StoreData } from '../types/store';

test('admin pin matches required secret code', () => {
  assert.equal(ADMIN_SECRET_PIN, '8492710536');
});

test('auto-linked pricing calculates weight * (karatRate + makingCharge) and applies discount', () => {
  const sampleProduct: Product = {
    id: 'test-1',
    code: 'AG-100',
    nameAr: 'خاتم',
    nameEn: 'Ring',
    categoryId: 'women',
    metal: 'gold',
    karat: '21',
    weightGrams: 10,
    makingChargePerGram: 200,
    pricingMode: 'auto',
    manualPrice: 50000,
    discountPercent: 10,
    imageUrl: '',
  };

  const rates = { ...DEFAULT_STORE_DATA.rates, gold21: 3800 };
  const breakdown = calculateProductPrice(sampleProduct, rates, true);

  assert.equal(breakdown.originalPrice, 40000);
  assert.equal(breakdown.finalPrice, 36000);
  assert.equal(breakdown.discountAmount, 4000);
  assert.equal(breakdown.hasDiscount, true);
});

test('manual pricing ignores auto rate when pricingMode is manual', () => {
  const manualProduct: Product = {
    id: 'test-2',
    code: 'AG-200',
    nameAr: 'ساعة',
    nameEn: 'Watch',
    categoryId: 'men',
    metal: 'gold',
    karat: '18',
    weightGrams: 20,
    makingChargePerGram: 200,
    pricingMode: 'manual',
    manualPrice: 75000,
    discountPercent: 0,
    imageUrl: '',
  };

  const breakdown = calculateProductPrice(manualProduct, DEFAULT_STORE_DATA.rates, true);
  assert.equal(breakdown.originalPrice, 75000);
  assert.equal(breakdown.finalPrice, 75000);
  assert.equal(breakdown.hasDiscount, false);
});

test('computeRatesFromSpot derives 24K, 21K, 18K, gold pound and silver accurately', () => {
  const spot = computeRatesFromSpot(2680, 31.1, 50);
  // 2680 / 31.1034768 * 50 ≈ 4308
  assert.ok(spot.gold24 > 4250 && spot.gold24 < 4350);
  assert.equal(spot.gold21, Math.round(spot.gold24 * (21 / 24)));
  assert.equal(spot.gold18, Math.round(spot.gold24 * (18 / 24)));
  assert.equal(spot.goldPound, Math.round(spot.gold21 * 8));
  assert.ok(spot.silver925 > 0 && spot.silverSwiss >= spot.silver925);
});

test('calculateCartSummary totals items, subtotal, and savings correctly', () => {
  const products = DEFAULT_STORE_DATA.products;
  const cart = [
    { productId: products[0].id, quantity: 2 },
    { productId: products[3].id, quantity: 1 },
  ];
  const summary = calculateCartSummary(
    cart,
    products,
    DEFAULT_STORE_DATA.rates,
    DEFAULT_STORE_DATA.rates.autoLinkPrices
  );
  assert.equal(summary.totalItems, 3);
  assert.equal(summary.lines.length, 2);
  assert.ok(summary.subtotal > 0);
  assert.ok(summary.totalSavings > 0);
});

test('filterProducts handles offers tab and search by karat or code', () => {
  const offers = filterProducts(DEFAULT_STORE_DATA.products, 'offers', '');
  assert.ok(offers.every((p) => p.discountPercent > 0));

  const byCode = filterProducts(DEFAULT_STORE_DATA.products, 'all', 'AG-S925');
  assert.equal(byCode.length, 1);
  assert.equal(byCode[0].id, 'ag-silver-ring-5');
});

test('WhatsApp URL builders encode product and invoice text cleanly', () => {
  const url = buildWhatsAppProductUrl('01012345678', DEFAULT_STORE_DATA.products[0], 120000, 'ar');
  assert.ok(url.startsWith('https://wa.me/201012345678?text='));

  const brandedUrl = buildWhatsAppProductUrl(
    '01012345678',
    DEFAULT_STORE_DATA.products[0],
    120000,
    'en',
    'Palace Gold'
  );
  assert.ok(decodeURIComponent(brandedUrl).includes('Hello Palace Gold'));

  const summary = calculateCartSummary(
    [{ productId: DEFAULT_STORE_DATA.products[0].id, quantity: 1 }],
    DEFAULT_STORE_DATA.products,
    DEFAULT_STORE_DATA.rates,
    true
  );
  const cartUrl = buildWhatsAppCartUrl('201000000000', summary, 'أشرف جولد', 'ar');
  assert.ok(cartUrl.includes('https://wa.me/201000000000?text='));
});

test('validateStoreBackup rejects invalid JSON and accepts valid store schema', () => {
  const bad = validateStoreBackup('{"foo": "bar"}');
  assert.equal(bad.ok, false);

  const good = validateStoreBackup(JSON.stringify(DEFAULT_STORE_DATA));
  assert.equal(good.ok, true);
});

test('computeDiamondPrices scales 1ct, 0.5ct, and 0.25ct dynamically with USD/EGP exchange', () => {
  const d = computeDiamondPrices(4000, 50);
  assert.equal(d.carat1Usd, 4000);
  assert.equal(d.carat1Egp, 200000);
  assert.equal(d.halfCaratEgp, 84000);
  assert.equal(d.quarterCaratEgp, 38000);
});

test('upsertProductList and removeProductsByIds allow unlimited additions, edits, and deletions', () => {
  let list = [...DEFAULT_STORE_DATA.products];
  const initialCount = list.length;

  // Add 15 products consecutively (no daily or total limit)
  for (let i = 1; i <= 15; i += 1) {
    list = upsertProductList(
      list,
      {
        ...DEFAULT_STORE_DATA.products[0],
        id: `custom-${i}`,
        code: `AG-C${i}`,
        nameAr: `منتج مخصص ${i}`,
        nameEn: `Custom Product ${i}`,
      },
      false
    );
  }
  assert.equal(list.length, initialCount + 15);
  assert.equal(list[0].id, 'custom-15');

  // Edit one
  list = upsertProductList(
    list,
    { ...list[0], nameEn: 'Custom Product 15 Edited' },
    true
  );
  assert.equal(list.length, initialCount + 15);
  assert.equal(list[0].nameEn, 'Custom Product 15 Edited');

  // Delete single and multiple
  list = removeProductsByIds(list, ['custom-15', 'custom-14', 'custom-13']);
  assert.equal(list.length, initialCount + 12);
  assert.equal(filterAdminProducts(list, 'AG-C15').length, 0);
  assert.equal(filterAdminProducts(list, 'AG-C12').length, 1);
});

test('sanitizeForFirestore converts undefined, functions, and NaN to null or safe defaults across objects and arrays', () => {
  const dirty = {
    a: 1,
    b: undefined,
    fn: () => 'ignored',
    badNum: Number.NaN,
    nested: { ok: 'yes', drop: undefined },
    arr: [{ x: 10, y: undefined }, undefined, () => 42],
  };
  const clean = sanitizeForFirestore(dirty);
  assert.deepEqual(clean, {
    a: 1,
    b: null,
    fn: null,
    badNum: 0,
    nested: { ok: 'yes', drop: null },
    arr: [{ x: 10, y: null }, null, null],
  });
  assert.equal(JSON.stringify(clean).includes('undefined'), false);
});

test('reorderItems moves elements up and down immutably within bounds', () => {
  const arr = ['p1', 'p2', 'p3'];
  assert.deepEqual(reorderItems(arr, 1, 'up'), ['p2', 'p1', 'p3']);
  assert.deepEqual(reorderItems(arr, 1, 'down'), ['p1', 'p3', 'p2']);
  assert.deepEqual(reorderItems(arr, 0, 'up'), ['p1', 'p2', 'p3']);
  assert.deepEqual(reorderItems(arr, 2, 'down'), ['p1', 'p2', 'p3']);
  assert.deepEqual(arr, ['p1', 'p2', 'p3']);
});

test('toggleWishlistItem toggles product presence and getWishlistProducts resolves matching items', () => {
  const initial: string[] = [];
  const p1 = DEFAULT_STORE_DATA.products[0].id;
  const p2 = DEFAULT_STORE_DATA.products[2].id;

  const addedOne = toggleWishlistItem(initial, p1);
  assert.deepEqual(addedOne, [p1]);
  assert.deepEqual(initial, []); // Pure, non-mutating

  const addedTwo = toggleWishlistItem(addedOne, p2);
  assert.deepEqual(addedTwo, [p1, p2]);

  const savedProducts = getWishlistProducts(DEFAULT_STORE_DATA.products, addedTwo);
  assert.equal(savedProducts.length, 2);
  assert.equal(savedProducts[0].id, p1);
  assert.equal(savedProducts[1].id, p2);

  const removedOne = toggleWishlistItem(addedTwo, p1);
  assert.deepEqual(removedOne, [p2]);
  assert.equal(getWishlistProducts(DEFAULT_STORE_DATA.products, removedOne).length, 1);
});

test('normalizeWebsiteUrl, sanitizeIconUrl, and getEffectiveSiteIdentity validate and resolve branding safely', () => {
  assert.equal(normalizeWebsiteUrl('ashrafgold.com'), 'https://ashrafgold.com');
  assert.equal(normalizeWebsiteUrl('https://shop.ashrafgold.com/gold'), 'https://shop.ashrafgold.com/gold');
  assert.equal(normalizeWebsiteUrl('javascript:alert(1)'), '');
  assert.equal(normalizeWebsiteUrl('data:text/html,evil'), '');
  assert.equal(normalizeWebsiteUrl('not a url'), '');

  assert.equal(sanitizeIconUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeIconUrl('/icon.svg'), '/icon.svg');
  assert.equal(sanitizeIconUrl('data:image/png;base64,AAA'), 'data:image/png;base64,AAA');
  assert.equal(sanitizeIconUrl('https://cdn.example.com/logo.png'), 'https://cdn.example.com/logo.png');

  const customized: StoreData = {
    ...DEFAULT_STORE_DATA,
    branch: {
      ...DEFAULT_STORE_DATA.branch,
      storeNameAr: 'تاج الصاغة',
      storeNameEn: 'Crown Sagha',
      websiteUrl: 'crownsagha.com',
      websiteIconUrl: '',
      websitePresetIcon: 'gem',
    },
  };

  const arIdentity = getEffectiveSiteIdentity(customized, 'ar');
  assert.equal(arIdentity.name, 'تاج الصاغة');
  assert.equal(arIdentity.url, 'https://crownsagha.com');
  assert.equal(arIdentity.presetIcon, 'gem');
  assert.ok(arIdentity.faviconHref.startsWith('data:image/svg+xml;utf8,'));

  const enIdentity = getEffectiveSiteIdentity(customized, 'en');
  assert.equal(enIdentity.name, 'Crown Sagha');
});



