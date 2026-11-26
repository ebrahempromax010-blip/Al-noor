export type Language = 'ar' | 'en';

export type ThemeMode = 'light' | 'evening' | 'dark' | 'night';

export type LayoutStyle = 'modern_grid' | 'executive_wide' | 'compact_cards';

export type MainNavTab = 'home' | 'catalog' | 'cart' | 'admin';

export type CatalogCategoryTab = 'all' | 'computers' | 'accessories' | 'offers';

export type CatalogSortOption = 'latest' | 'price_asc' | 'price_desc' | 'offers_only';

export type ProductCategoryGroup = 'computers' | 'accessories' | 'software';

export type ProductSubType =
  | 'laptop'
  | 'desktop_case'
  | 'custom_build'
  | 'monitor'
  | 'headset'
  | 'mic'
  | 'keyboard_mouse'
  | 'bag'
  | 'software';

export interface Product {
  id: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  brand: string;
  specsAr: string;
  specsEn: string;
  categoryGroup: ProductCategoryGroup;
  subType: ProductSubType;
  price: number;
  discountPercent: number;
  inStock: boolean;
  isFeatured?: boolean;
  isDefault?: boolean;
  imageUrl: string;
  videoUrl?: string;
  createdAt?: string;
}

export interface SystemUpdateNotice {
  id: string;
  textAr: string;
  textEn: string;
  badgeAr: string;
  badgeEn: string;
  tone: 'microsoft' | 'apple' | 'driver' | 'security';
}

export interface OSDownloadItem {
  id: string;
  titleAr: string;
  titleEn: string;
  vendor: 'Microsoft' | 'Apple' | 'NVIDIA' | 'AMD' | 'Other';
  version: string;
  sizeLabel: string;
  descriptionAr: string;
  descriptionEn: string;
  officialUrl: string;
}

export interface DeletedProductRecord {
  id: string;
  nameAr: string;
  nameEn: string;
  categoryGroup: ProductCategoryGroup;
  specsSummary: string;
  deletedAt: string;
}

export interface RestockWatchRequest {
  id: string;
  query: string;
  matchedDeletedProductId?: string | null;
  createdAt: string;
  notified: boolean;
  notifiedProductId?: string;
}

export interface OrderItem {
  productId: string;
  nameAr: string;
  nameEn: string;
  quantity: number;
  unitPrice: number;
}

export type WhatsappDispatchStatus =
  | 'opened_whatsapp_client'
  | 'sent_via_cloud_api'
  | 'sent_via_gateway'
  | 'sent_via_webhook'
  | 'saved_in_admin';

export interface CustomerOrder {
  id: string;
  customerName: string;
  customerAddress: string;
  customerPhone: string;
  note: string;
  items: OrderItem[];
  total: number;
  currency: string;
  status: 'new' | 'contacted' | 'delivered';
  whatsappDispatchStatus?: WhatsappDispatchStatus;
  whatsappMessageText?: string;
  createdAt: string;
}

export interface SocialLinks {
  facebookUrl: string;
  youtubeUrl: string;
  instagramUrl: string;
  tiktokUrl: string;
}

export interface StoreWallpaper {
  id: string;
  labelAr: string;
  labelEn: string;
  imageUrl: string;
}

export interface BranchInfo {
  addressAr: string;
  addressEn: string;
  branchMapUrl: string;
  publicWhatsappNumber: string;
  secretOrdersPhone: string;
  orderWebhookUrl: string;
  phoneNumber: string;
  workingHoursAr: string;
  workingHoursEn: string;
}

export interface StoreSettings {
  storeNameAr: string;
  storeNameEn: string;
  taglineAr: string;
  taglineEn: string;
  siteUrl: string;
  storeIconUrl: string;
  defaultLanguage: Language;
  currency: string;
  heroTitleAr: string;
  heroTitleEn: string;
  heroSubtitleAr: string;
  heroSubtitleEn: string;
  promoBannerImageUrl: string;
  promoBadgeAr: string;
  promoBadgeEn: string;
  layoutStyle: LayoutStyle;
}

export interface UploadedAppBinary {
  fileUrl: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface UploadedAppFiles {
  androidApk?: UploadedAppBinary | null;
  iosApp?: UploadedAppBinary | null;
}

export interface StoreData {
  settings: StoreSettings;
  branch: BranchInfo;
  socialLinks: SocialLinks;
  adminPin: string;
  systemUpdates: SystemUpdateNotice[];
  osDownloads: OSDownloadItem[];
  products: Product[];
  deletedDefaultIds: string[];
  deletedProductsHistory: DeletedProductRecord[];
  wallpapers: StoreWallpaper[];
  orders: CustomerOrder[];
  uploadedAppFiles?: UploadedAppFiles;
  updatedAt?: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface ChatRecommendedProduct {
  id: string;
  nameAr: string;
  nameEn: string;
  brand: string;
  price: number;
  discountPercent: number;
  finalPrice: number;
  imageUrl: string;
  inStock: boolean;
}

export interface ChatGroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
  isRestockAlert?: boolean;
  recommendedProducts?: ChatRecommendedProduct[];
  sources?: ChatGroundingSource[];
}
