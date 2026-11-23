import { computeRatesFromSpot } from './storeLogic';
import { MarketRates } from '../types/store';

export interface LiveMarketFetchResult {
  rates: Partial<MarketRates>;
  source: string;
}

export async function fetchGlobalSpotRates(fallbackUsdEgp = 50.05): Promise<LiveMarketFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const [goldRes, silverRes, fxRes] = await Promise.allSettled([
      fetch('https://api.gold-api.com/price/XAU', { signal: controller.signal }),
      fetch('https://api.gold-api.com/price/XAG', { signal: controller.signal }),
      fetch('https://open.er-api.com/v6/latest/USD', { signal: controller.signal }),
    ]);

    let ounceUsd: number | null = null;
    let silverOunceUsd: number | null = null;
    let usdEgp: number = fallbackUsdEgp;

    if (goldRes.status === 'fulfilled' && goldRes.value.ok) {
      const goldJson = (await goldRes.value.json()) as { price?: number };
      if (typeof goldJson.price === 'number' && goldJson.price > 100) {
        ounceUsd = goldJson.price;
      }
    }

    if (silverRes.status === 'fulfilled' && silverRes.value.ok) {
      const silverJson = (await silverRes.value.json()) as { price?: number };
      if (typeof silverJson.price === 'number' && silverJson.price > 1) {
        silverOunceUsd = silverJson.price;
      }
    }

    if (fxRes.status === 'fulfilled' && fxRes.value.ok) {
      const fxJson = (await fxRes.value.json()) as { rates?: { EGP?: number } };
      if (typeof fxJson?.rates?.EGP === 'number' && fxJson.rates.EGP > 5) {
        usdEgp = fxJson.rates.EGP;
      }
    }

    if (ounceUsd === null) {
      throw new Error('تعذر جلب سعر أونصة الذهب العالمي في الوقت الحالي.');
    }

    const computed = computeRatesFromSpot(
      ounceUsd,
      silverOunceUsd ?? 31.4,
      usdEgp
    );

    return {
      rates: {
        ...computed,
        lastUpdated: new Date().toISOString(),
      },
      source: 'Global Spot Feed (XAU/XAG + USD/EGP)',
    };
  } finally {
    clearTimeout(timer);
  }
}
