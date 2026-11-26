import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildRelativeRateTable,
  convertCurrencyAmount,
  FALLBACK_RATES_FROM_EGP,
  formatStorePriceDisplay,
  resolveBaseCurrencyCode,
} from './currencyLogic.ts';

test('resolveBaseCurrencyCode maps Arabic and ISO currency labels cleanly', () => {
  assert.equal(resolveBaseCurrencyCode('ج.م'), 'EGP');
  assert.equal(resolveBaseCurrencyCode('EGP'), 'EGP');
  assert.equal(resolveBaseCurrencyCode('ر.س'), 'SAR');
  assert.equal(resolveBaseCurrencyCode('USD'), 'USD');
  assert.equal(resolveBaseCurrencyCode('€'), 'EUR');
  assert.equal(resolveBaseCurrencyCode(''), 'EGP');
});

test('convertCurrencyAmount converts accurately across base and cross currencies', () => {
  const table = buildRelativeRateTable('EGP', {
    EGP: 1,
    USD: 0.02,
    EUR: 0.0185,
    SAR: 0.075,
  });

  assert.equal(convertCurrencyAmount(50000, 'EGP', 'USD', table, 'EGP'), 1000);
  assert.equal(convertCurrencyAmount(1000, 'USD', 'EGP', table, 'EGP'), 50000);
  const usdToSar = convertCurrencyAmount(100, 'USD', 'SAR', table, 'EGP');
  assert.ok(Math.abs(usdToSar - 375) < 0.001);
  assert.equal(convertCurrencyAmount(-10, 'EGP', 'USD', table, 'EGP'), 0);
});

test('formatStorePriceDisplay preserves native EGP and formats USD/EUR/SAR cleanly', () => {
  const table = buildRelativeRateTable('EGP', {
    ...FALLBACK_RATES_FROM_EGP,
    USD: 0.02,
    EUR: 0.019,
    SAR: 0.075,
  });

  const native = formatStorePriceDisplay(78760, 'ج.م', 'EGP', table, 'ar');
  assert.equal(native.isConverted, false);
  assert.equal(native.formattedNumber, '78,760');
  assert.equal(native.currencyUnit, 'ج.م');

  const usdHigh = formatStorePriceDisplay(78760, 'ج.م', 'USD', table, 'en');
  assert.equal(usdHigh.isConverted, true);
  assert.equal(usdHigh.code, 'USD');
  assert.equal(usdHigh.formattedNumber, '1,575');
  assert.equal(usdHigh.currencyUnit, 'USD');

  const usdLow = formatStorePriceDisplay(2760, 'ج.م', 'USD', table, 'ar');
  assert.equal(usdLow.isConverted, true);
  assert.equal(usdLow.formattedNumber, '55.20');
  assert.equal(usdLow.currencyUnit, '$ (USD)');
});
