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
  filterProducts,
  validateStoreBackup,
} from './storeLogic';
import { DEFAULT_STORE_DATA } from '../data/defaultStoreData';
import { Product } from '../types/store';

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
