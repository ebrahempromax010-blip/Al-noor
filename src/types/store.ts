export type Language = 'ar' | 'en';

export type MetalType = 'gold' | 'silver';

export type KaratType = '24' | '21' | '18' | '925' | '999';

export type PricingMode = 'auto' | 'manual';

export interface MarketRates {
  gold24: number;
  gold21: number;
  gold18: number;
  goldPound: number;
  silver925: number;
  silverSwiss: number;
  diamondCaratUsd: number;
  ounceUsd: number;
  silverOunceUsd: number;
  usdEgp: number;
  autoLinkPrices: boolean;
  lastUpdated: string;
}

export interface Category {
  id: string;
  nameAr: string;
  nameEn: string;
  icon: string;
  isSystem?: boolean;
}

export interface Product {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  categoryId: string;
  metal: MetalType;
  karat: KaratType;
  weightGrams: number;
  makingChargePerGram: number;
  pricingMode: PricingMode;
  manualPrice: number;
  discountPercent: number;
  imageUrl: string;
  descriptionAr?: string;
  descriptionEn?: string;
}

export interface PromoBannerConfig {
  enabled: boolean;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  badgeTextAr: string;
  badgeTextEn: string;
  discountPercent: number;
  imageUrl: string;
}

export type WebsitePresetIcon = 'crown' | 'gem' | 'sparkles' | 'star';

export interface BranchInfo {
  storeNameAr: string;
  storeNameEn: string;
  websiteUrl?: string;
  websiteIconUrl?: string;
  websitePresetIcon?: WebsitePresetIcon;
  addressAr: string;
  addressEn: string;
  whatsappNumber: string;
  phoneNumber: string;
  workingHoursAr: string;
  workingHoursEn: string;
}

export interface StoreData {
  rates: MarketRates;
  categories: Category[];
  products: Product[];
  banner: PromoBannerConfig;
  branch: BranchInfo;
  defaultLanguage?: Language;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export type CloudSyncStatus = 'connecting' | 'synced' | 'saving' | 'error' | 'offline';
