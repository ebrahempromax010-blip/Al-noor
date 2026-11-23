import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CloudDownload,
  Download,
  Edit3,
  FolderKanban,
  ImagePlus,
  Infinity as InfinityIcon,
  Loader2,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { DEFAULT_STORE_DATA } from '../data/defaultStoreData';
import {
  BranchInfo,
  Category,
  CloudSyncStatus,
  KaratType,
  Language,
  MarketRates,
  MetalType,
  PricingMode,
  Product,
  PromoBannerConfig,
  StoreData,
} from '../types/store';
import { t } from '../utils/i18n';
import { compressImageToUnder120KB } from '../utils/imageCompressor';
import {
  calculateProductPrice,
  filterAdminProducts,
  formatCurrency,
  removeProductsByIds,
  upsertProductList,
  validateStoreBackup,
} from '../utils/storeLogic';

interface AdminDashboardProps {
  lang: Language;
  storeData: StoreData;
  syncStatus: CloudSyncStatus;
  cloudError: string | null;
  isRefreshingMarket: boolean;
  onSaveStoreData: (nextData: StoreData) => Promise<{ ok: boolean; error?: string }>;
  onUpdateStoreData: (
    updater: (latest: StoreData) => StoreData
  ) => Promise<{ ok: boolean; error?: string }>;
  onFetchFromFirebase: () => Promise<{ ok: boolean; error?: string }>;
  onRefreshMarketRates: () => Promise<{ ok: boolean; rates?: MarketRates; error?: string }>;
  onExitAdmin: () => void;
}

type AdminTab = 'products' | 'rates' | 'categories' | 'banner' | 'branch';

const EMPTY_PRODUCT_FORM = {
  id: '',
  code: '',
  nameAr: '',
  nameEn: '',
  categoryId: 'women',
  metal: 'gold' as MetalType,
  karat: '21' as KaratType,
  weightGrams: 5,
  makingChargePerGram: 180,
  pricingMode: 'auto' as PricingMode,
  manualPrice: 20000,
  discountPercent: 0,
  imageUrl: '',
  descriptionAr: '',
  descriptionEn: '',
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  storeData,
  syncStatus,
  cloudError,
  isRefreshingMarket,
  onSaveStoreData,
  onUpdateStoreData,
  onFetchFromFirebase,
  onRefreshMarketRates,
  onExitAdmin,
}) => {
  const copy = t(lang);
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Product Form & Unlimited Management State
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [compressedInfo, setCompressedInfo] = useState<string | null>(null);
  const [adminProductSearch, setAdminProductSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // Rates Form State
  const [ratesForm, setRatesForm] = useState<MarketRates>(storeData.rates);

  // Categories Form State
  const [newCatAr, setNewCatAr] = useState('');
  const [newCatEn, setNewCatEn] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('sparkles');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatAr, setEditingCatAr] = useState('');
  const [editingCatEn, setEditingCatEn] = useState('');

  // Banner Form State
  const [bannerForm, setBannerForm] = useState<PromoBannerConfig>(storeData.banner);

  // Branch Form State
  const [branchForm, setBranchForm] = useState<BranchInfo>(storeData.branch);
  const [defaultLangForm, setDefaultLangForm] = useState<Language>(
    storeData.defaultLanguage || 'ar'
  );

  useEffect(() => {
    setRatesForm(storeData.rates);
    setBannerForm(storeData.banner);
    setBranchForm(storeData.branch);
    if (storeData.defaultLanguage) {
      setDefaultLangForm(storeData.defaultLanguage);
    }
    setSelectedProductIds((prev) =>
      prev.filter((id) => storeData.products.some((p) => p.id === id))
    );
  }, [storeData]);

  const importInputRef = useRef<HTMLInputElement>(null);

  const syncLocalForms = (data: StoreData) => {
    setRatesForm(data.rates);
    setBannerForm(data.banner);
    setBranchForm(data.branch);
  };

  const commitToCloud = async (nextData: StoreData, successMsg: string) => {
    setIsSaving(true);
    setStatusMessage(null);
    const res = await onSaveStoreData({
      ...nextData,
      updatedAt: new Date().toISOString(),
    });
    setIsSaving(false);
    if (res.ok) {
      syncLocalForms(nextData);
      setStatusMessage({ type: 'success', text: successMsg });
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || (lang === 'ar' ? 'حدث خطأ أثناء الحفظ في سحابة Firebase.' : 'Failed to save to Firebase Cloud.'),
      });
    }
  };

  const commitMutatedToCloud = async (
    updater: (latest: StoreData) => StoreData,
    successMsg: string
  ) => {
    setIsSaving(true);
    setStatusMessage(null);
    const res = await onUpdateStoreData(updater);
    setIsSaving(false);
    if (res.ok) {
      setStatusMessage({ type: 'success', text: successMsg });
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || (lang === 'ar' ? 'حدث خطأ أثناء الحفظ في سحابة Firebase.' : 'Failed to save to Firebase Cloud.'),
      });
    }
    return res.ok;
  };

  const handleFetchCloud = async () => {
    setStatusMessage(null);
    const res = await onFetchFromFirebase();
    if (res.ok) {
      setStatusMessage({
        type: 'success',
        text: 'تم جلب أحدث البيانات من Firebase بنجاح ومزامنتها.',
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: res.error || 'تعذر جلب البيانات من Firebase.',
      });
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(storeData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ashraf-gold-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const check = validateStoreBackup(String(reader.result || ''));
      if (!check.ok) {
        setStatusMessage({ type: 'error', text: check.error });
        return;
      }
      await commitToCloud(check.data, 'تم استيراد نسخة المتجر ونشرها على السحابة بنجاح.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Image Upload Compression (<120KB)
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl, sizeKB } = await compressImageToUnder120KB(file);
      setProductForm((prev) => ({ ...prev, imageUrl: dataUrl }));
      setCompressedInfo(`تم ضغط الصورة بنجاح (${sizeKB} KB) وجاهزة للحفظ السحابي.`);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'فشل ضغط الصورة.',
      });
    }
  };

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl, sizeKB } = await compressImageToUnder120KB(file);
      setBannerForm((prev) => ({ ...prev, imageUrl: dataUrl }));
      setStatusMessage({
        type: 'success',
        text: `تم ضغط صورة البنر (${sizeKB} KB). اضغط "حفظ ونشر فوري" لاعتمادها.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'فشل ضغط صورة البنر.',
      });
    }
  };

  // Product Submit (Unlimited daily additions & edits)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawAr = productForm.nameAr.trim();
    const rawEn = productForm.nameEn.trim();
    if (!rawAr && !rawEn) {
      setStatusMessage({
        type: 'error',
        text:
          lang === 'ar'
            ? 'يرجى إدخال اسم المنتج بالعربية أو الإنجليزية على الأقل.'
            : 'Please enter a product name (Arabic or English).',
      });
      return;
    }

    const resolvedNameAr = rawAr || rawEn;
    const resolvedNameEn = rawEn || rawAr;

    const code =
      productForm.code.trim() ||
      `AG-${Math.floor(1000 + Math.random() * 9000)}`;

    const newProduct: Product = {
      id: isEditingProduct ? productForm.id : `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code,
      nameAr: resolvedNameAr,
      nameEn: resolvedNameEn,
      categoryId: productForm.categoryId,
      metal: productForm.metal,
      karat: productForm.karat,
      weightGrams: Number(productForm.weightGrams) || 0,
      makingChargePerGram: Number(productForm.makingChargePerGram) || 0,
      pricingMode: productForm.pricingMode,
      manualPrice: Number(productForm.manualPrice) || 0,
      discountPercent: Math.min(90, Math.max(0, Number(productForm.discountPercent) || 0)),
      imageUrl:
        productForm.imageUrl.trim() ||
        '/src/assets/images/product_womens_gold_set_1795458830291.jpg',
      descriptionAr: productForm.descriptionAr.trim(),
      descriptionEn: productForm.descriptionEn.trim(),
    };

    const success = await commitMutatedToCloud(
      (latest) => ({
        ...latest,
        products: upsertProductList(latest.products, newProduct, isEditingProduct),
      }),
      isEditingProduct
        ? lang === 'ar'
          ? 'تم تعديل المنتج ونشره فوراً لجميع المستخدمين.'
          : 'Product updated and published instantaneously to all users.'
        : lang === 'ar'
          ? 'تمت إضافة المنتج الجديد ونشره فوراً على السحابة.'
          : 'New product added and published instantaneously to Firebase Cloud.'
    );

    if (success) {
      setProductForm(EMPTY_PRODUCT_FORM);
      setIsEditingProduct(false);
      setCompressedInfo(null);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setDeletingProductId(id);
    if (isEditingProduct && productForm.id === id) {
      setProductForm(EMPTY_PRODUCT_FORM);
      setIsEditingProduct(false);
      setCompressedInfo(null);
    }
    await commitMutatedToCloud(
      (latest) => ({
        ...latest,
        products: removeProductsByIds(latest.products, [id]),
      }),
      lang === 'ar'
        ? 'تم حذف المنتج ومزامنة التحديث فوراً مع الجميع على السحابة.'
        : 'Product deleted and synced immediately for all users.'
    );
    setSelectedProductIds((prev) => prev.filter((item) => item !== id));
    setDeletingProductId(null);
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedProductIds.length === 0) return;
    const count = selectedProductIds.length;
    if (isEditingProduct && selectedProductIds.includes(productForm.id)) {
      setProductForm(EMPTY_PRODUCT_FORM);
      setIsEditingProduct(false);
    }
    const ok = await commitMutatedToCloud(
      (latest) => ({
        ...latest,
        products: removeProductsByIds(latest.products, selectedProductIds),
      }),
      lang === 'ar'
        ? `تم حذف ${count} منتجاً ومزامنة المتجر فوراً لجميع الزوار.`
        : `Deleted ${count} selected products and synced live to all users.`
    );
    if (ok) {
      setSelectedProductIds([]);
    }
  };

  const handleDeleteAllProducts = async () => {
    setConfirmClearAll(false);
    setProductForm(EMPTY_PRODUCT_FORM);
    setIsEditingProduct(false);
    setSelectedProductIds([]);
    await commitMutatedToCloud(
      (latest) => ({ ...latest, products: [] }),
      lang === 'ar'
        ? 'تم حذف جميع المنتجات ونشر التحديث فوراً على السحابة.'
        : 'All products deleted and synced instantaneously to Firebase Cloud.'
    );
  };

  const handleRestoreDefaultProducts = async () => {
    setConfirmClearAll(false);
    await commitMutatedToCloud(
      (latest) => ({ ...latest, products: DEFAULT_STORE_DATA.products }),
      lang === 'ar'
        ? 'تمت استعادة المنتجات الافتراضية ونشرها فوراً على السحابة.'
        : 'Default products restored and published instantaneously to Firebase Cloud.'
    );
  };

  const filteredAdminProducts = filterAdminProducts(
    storeData.products,
    adminProductSearch
  );

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedRates: MarketRates = {
      ...ratesForm,
      lastUpdated: new Date().toISOString(),
    };
    await commitToCloud(
      { ...storeData, rates: updatedRates },
      'تم حفظ أسعار البورصة ونشرها فوراً على جميع الأجهزة.'
    );
  };

  const handleSpotRefreshInAdmin = async () => {
    const res = await onRefreshMarketRates();
    if (res.ok && res.rates) {
      setRatesForm(res.rates);
      setStatusMessage({
        type: 'success',
        text: 'تم جلب أحدث أسعار البورصة العالمية وحفظها على السحابة.',
      });
    } else if (res.error) {
      setStatusMessage({ type: 'error', text: res.error });
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatAr.trim() || !newCatEn.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'يرجى إدخال اسم الفئة بالعربية والإنجليزية.',
      });
      return;
    }
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      nameAr: newCatAr.trim(),
      nameEn: newCatEn.trim(),
      icon: newCatIcon,
    };
    await commitToCloud(
      { ...storeData, categories: [...storeData.categories, newCat] },
      'تمت إضافة الفئة الجديدة ونشرها على السحابة.'
    );
    setNewCatAr('');
    setNewCatEn('');
  };

  const handleSaveCategoryEdit = async (catId: string) => {
    if (!editingCatAr.trim() || !editingCatEn.trim()) return;
    const nextCats = storeData.categories.map((c) =>
      c.id === catId ? { ...c, nameAr: editingCatAr.trim(), nameEn: editingCatEn.trim() } : c
    );
    await commitToCloud(
      { ...storeData, categories: nextCats },
      'تم تعديل اسم الفئة ومزامنتها فوراً.'
    );
    setEditingCatId(null);
  };

  const handleDeleteCategory = async (catId: string) => {
    const nextCats = storeData.categories.filter((c) => c.id !== catId);
    await commitToCloud(
      { ...storeData, categories: nextCats },
      'تم حذف الفئة ومزامنة المتجر.'
    );
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    await commitToCloud(
      { ...storeData, banner: bannerForm },
      'تم حفظ إعدادات البنر والعروض ونشرها فوراً.'
    );
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    await commitToCloud(
      { ...storeData, branch: branchForm, defaultLanguage: defaultLangForm },
      'تم تحديث بيانات الفرع وإعدادات اللغة ونشرها فوراً على السحابة.'
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-6 pb-28 sm:px-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-amber-300">
            {copy.adminTitle}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'ar'
              ? 'إدارة مركزية سحابية لحظية — Cloud Firestore Live Sync'
              : 'Real-time Cloud Firestore Store Management'}
          </p>
        </div>

        <button
          type="button"
          onClick={onExitAdmin}
          className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-[#131A26] px-4 py-2 text-xs sm:text-sm font-bold text-slate-200 hover:border-amber-400 hover:text-white cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span>{copy.adminExit}</span>
        </button>
      </div>

      {/* Cloud Status Card */}
      <section className="rounded-2xl border border-amber-500/30 bg-[#131A26] p-5 sm:p-6 shadow-xl mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="text-sm sm:text-base font-bold text-amber-400">
              {copy.projectConnected} <span className="font-mono-tabular">ashraf-gold</span>
            </div>

            <div
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-semibold ${
                syncStatus === 'error' || cloudError
                  ? 'border-rose-500/35 bg-rose-500/10 text-rose-300'
                  : 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300'
              }`}
            >
              {syncStatus === 'error' || cloudError ? (
                <AlertCircle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              <span>
                {cloudError
                  ? cloudError
                  : copy.cloudActiveBanner}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleFetchCloud}
              className="flex min-h-[42px] items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow hover:bg-blue-500 cursor-pointer"
            >
              <CloudDownload className="h-4 w-4" />
              <span>{copy.fetchLatestFirebase}</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="flex min-h-[42px] items-center gap-2 rounded-xl bg-[#10B981] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow hover:bg-emerald-500 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{copy.exportJson}</span>
            </button>

            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportJson}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="flex min-h-[42px] items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/15 px-4 py-2 text-xs sm:text-sm font-bold text-amber-200 hover:bg-amber-500/25 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>{copy.importJson}</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            role="status"
            className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs sm:text-sm font-semibold ${
              statusMessage.type === 'success'
                ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200'
                : 'border-rose-500/35 bg-rose-500/15 text-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </section>

      {/* Admin Tabs */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-3 mb-5">
        {(
          [
            { id: 'products', label: copy.tabProducts, icon: <Package className="h-4 w-4" /> },
            { id: 'rates', label: copy.tabRates, icon: <TrendingUp className="h-4 w-4" /> },
            { id: 'categories', label: copy.tabCategories, icon: <FolderKanban className="h-4 w-4" /> },
            { id: 'banner', label: copy.tabBanner, icon: <Sparkles className="h-4 w-4" /> },
            { id: 'branch', label: copy.tabBranch, icon: <MapPin className="h-4 w-4" /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex min-h-[42px] items-center gap-2 rounded-xl border px-4 py-2 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 transition cursor-pointer ${
              activeTab === tab.id
                ? 'border-amber-400 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-slate-950'
                : 'border-amber-500/20 bg-[#131A26] text-slate-300 hover:border-amber-400/50 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: PRODUCTS CRUD */}
      {activeTab === 'products' && (
        <div className="space-y-5">
          {/* Unlimited Daily Edits/Additions/Deletions Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-200">
            <div className="flex items-center gap-2.5 font-semibold">
              <InfinityIcon className="h-5 w-5 shrink-0 text-emerald-400" />
              <span>
                {lang === 'ar'
                  ? 'تحكم مفتوح بلا قيود يومية: يمكنك إضافة، تعديل، أو حذف أي عدد من المنتجات في أي وقت مع نشر فوري على Firebase للجميع.'
                  : 'Unlimited Daily Operations: Add, edit, or delete any number of products anytime — synced instantaneously via Firebase Cloud for every visitor.'}
              </span>
            </div>
            <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-100 font-mono-tabular">
              {lang === 'ar'
                ? `${storeData.products.length} منتج منشور`
                : `${storeData.products.length} Live Products`}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <form
              onSubmit={handleSaveProduct}
              className="rounded-2xl border border-amber-500/20 bg-[#131A26] p-5 space-y-4 lg:col-span-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-amber-300">
                  {isEditingProduct
                    ? lang === 'ar'
                      ? 'تعديل المنتج'
                      : 'Edit Product'
                    : lang === 'ar'
                      ? 'إضافة منتج جديد'
                      : 'Add New Product'}
                </h2>
                {isEditingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductForm(EMPTY_PRODUCT_FORM);
                      setIsEditingProduct(false);
                      setCompressedInfo(null);
                    }}
                    className="text-xs font-semibold text-amber-300 hover:underline cursor-pointer"
                  >
                    {lang === 'ar' ? '+ منتج جديد' : '+ New Product'}
                  </button>
                )}
              </div>

              {/* Compressed Image Upload or URL */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  {lang === 'ar'
                    ? 'صورة المنتج (ضغط تلقائي < 120KB أو رابط مباشر)'
                    : 'Product Image (Auto-compressed < 120KB or direct URL)'}
                </label>
                <div className="flex items-center gap-3">
                  {productForm.imageUrl && (
                    <img
                      src={productForm.imageUrl}
                      alt="Preview"
                      className="h-16 w-16 rounded-xl object-cover border border-amber-500/30 shrink-0"
                    />
                  )}
                  <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/40 bg-[#0B0F17] px-4 py-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/10">
                    <ImagePlus className="h-4 w-4" />
                    <span>
                      {lang === 'ar' ? 'اختر صورة من الهاتف / الجهاز' : 'Upload Photo from Device'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProductImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <input
                  type="url"
                  placeholder={
                    lang === 'ar'
                      ? 'أو الصق رابط صورة مباشر (اختياري)...'
                      : 'Or paste an image URL (optional)...'
                  }
                  value={productForm.imageUrl.startsWith('data:') ? '' : productForm.imageUrl}
                  onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                  className="h-9 w-full rounded-xl border border-amber-500/20 bg-[#0B0F17] px-3 text-xs text-slate-200 placeholder:text-slate-500"
                />
                {compressedInfo && (
                  <p className="text-[11px] text-emerald-300">{compressedInfo}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prod-name-ar" className="block text-xs text-slate-300 mb-1">
                    {lang === 'ar' ? 'اسم المنتج (عربي)' : 'Product Name (AR)'}
                  </label>
                  <input
                    id="prod-name-ar"
                    type="text"
                    value={productForm.nameAr}
                    onChange={(e) => setProductForm({ ...productForm, nameAr: e.target.value })}
                    placeholder={lang === 'ar' ? 'مثال: طقم شبكة عيار 21' : 'Arabic name (optional if EN set)'}
                    className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
                  />
                </div>
                <div>
                  <label htmlFor="prod-name-en" className="block text-xs text-slate-300 mb-1">
                    {lang === 'ar' ? 'اسم المنتج (إنجليزي)' : 'Product Name (EN)'}
                  </label>
                  <input
                    id="prod-name-en"
                    type="text"
                    value={productForm.nameEn}
                    onChange={(e) => setProductForm({ ...productForm, nameEn: e.target.value })}
                    placeholder={lang === 'ar' ? 'اختياري عند كتابة العربي' : 'e.g. Royal 21K Gold Set'}
                    className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prod-category" className="block text-xs text-slate-300 mb-1">
                    {lang === 'ar' ? 'القسم / الفئة' : 'Category'}
                  </label>
                  <select
                    id="prod-category"
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                    className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
                  >
                    {storeData.categories
                      .filter((c) => c.id !== 'all' && c.id !== 'offers')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {lang === 'ar' ? c.nameAr : c.nameEn}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="prod-code" className="block text-xs text-slate-300 mb-1">
                    {lang === 'ar' ? 'كود المنتج' : 'Product Code'}
                  </label>
                  <input
                    id="prod-code"
                    type="text"
                    placeholder="AG-2105"
                    value={productForm.code}
                    onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                    className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label htmlFor="prod-metal" className="block text-xs text-slate-300 mb-1">
                    {lang === 'ar' ? 'المعدن' : 'Metal'}
                  </label>
                  <select
                    id="prod-metal"
                    value={productForm.metal}
                    onChange={(e) =>
                      setProductForm({ ...productForm, metal: e.target.value as MetalType })
                    }
                    className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-2.5 text-sm text-white"
                  >
                    <option value="gold">{lang === 'ar' ? 'ذهب' : 'Gold'}</option>
                    <option value="silver">{lang === 'ar' ? 'فضة' : 'Silver'}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="prod-karat" className="block text-xs text-slate-300 mb-1">
                    {lang === 'ar' ? 'العيار' : 'Karat'}
                  </label>
                  <select
                    id="prod-karat"
                    value={productForm.karat}
                    onChange={(e) =>
                      setProductForm({ ...productForm, karat: e.target.value as KaratType })
                    }
                    className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-2.5 text-sm text-white"
                  >
                    <option value="24">24</option>
                    <option value="21">21</option>
                    <option value="18">18</option>
                    <option value="925">925</option>
                    <option value="999">999</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="prod-weight" className="block text-xs text-slate-300 mb-1">
                    {lang === 'ar' ? 'الوزن (جم)' : 'Weight (g)'}
                  </label>
                  <input
                    id="prod-weight"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={productForm.weightGrams}
                    onChange={(e) =>
                      setProductForm({ ...productForm, weightGrams: Number(e.target.value) })
                    }
                    className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label htmlFor="prod-pricing-mode" className="block text-xs text-slate-300 mb-1">
                    {lang === 'ar' ? 'نظام السعر' : 'Pricing Mode'}
                  </label>
                  <select
                    id="prod-pricing-mode"
                    value={productForm.pricingMode}
                    onChange={(e) =>
                      setProductForm({ ...productForm, pricingMode: e.target.value as PricingMode })
                    }
                    className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-2 text-xs text-white"
                  >
                    <option value="auto">{lang === 'ar' ? 'تلقائي بالجرام' : 'Auto / Gram'}</option>
                    <option value="manual">{lang === 'ar' ? 'سعر يدوي' : 'Manual Price'}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="prod-price-input" className="block text-xs text-slate-300 mb-1">
                    {productForm.pricingMode === 'auto'
                      ? lang === 'ar'
                        ? 'المصنعية/جم'
                        : 'Making / g'
                      : lang === 'ar'
                        ? 'السعر اليدوي'
                        : 'Manual Price'}
                  </label>
                  {productForm.pricingMode === 'auto' ? (
                    <input
                      id="prod-price-input"
                      type="number"
                      min="0"
                      value={productForm.makingChargePerGram}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          makingChargePerGram: Number(e.target.value),
                        })
                      }
                      className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white font-mono-tabular"
                    />
                  ) : (
                    <input
                      id="prod-price-input"
                      type="number"
                      min="0"
                      value={productForm.manualPrice}
                      onChange={(e) =>
                        setProductForm({ ...productForm, manualPrice: Number(e.target.value) })
                      }
                      className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white font-mono-tabular"
                    />
                  )}
                </div>
                <div>
                  <label htmlFor="prod-discount" className="block text-xs text-slate-300 mb-1">
                    {lang === 'ar' ? 'نسبة الخصم %' : 'Discount %'}
                  </label>
                  <input
                    id="prod-discount"
                    type="number"
                    min="0"
                    max="90"
                    value={productForm.discountPercent}
                    onChange={(e) =>
                      setProductForm({ ...productForm, discountPercent: Number(e.target.value) })
                    }
                    className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white font-mono-tabular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prod-desc-ar" className="block text-xs text-slate-300 mb-1">
                    {lang === 'ar' ? 'وصف المنتج (اختياري)' : 'Description AR (optional)'}
                  </label>
                  <input
                    id="prod-desc-ar"
                    type="text"
                    value={productForm.descriptionAr}
                    onChange={(e) =>
                      setProductForm({ ...productForm, descriptionAr: e.target.value })
                    }
                    className="h-9 w-full rounded-xl border border-amber-500/20 bg-[#0B0F17] px-3 text-xs text-white"
                  />
                </div>
                <div>
                  <label htmlFor="prod-desc-en" className="block text-xs text-slate-300 mb-1">
                    {lang === 'ar' ? 'الوصف بالإنجليزية (اختياري)' : 'Description EN (optional)'}
                  </label>
                  <input
                    id="prod-desc-en"
                    type="text"
                    value={productForm.descriptionEn}
                    onChange={(e) =>
                      setProductForm({ ...productForm, descriptionEn: e.target.value })
                    }
                    className="h-9 w-full rounded-xl border border-amber-500/20 bg-[#0B0F17] px-3 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] px-4 py-2.5 text-sm font-bold text-slate-950 hover:brightness-110 disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>
                    {isEditingProduct
                      ? lang === 'ar'
                        ? 'حفظ التعديلات ونشرها فوراً'
                        : 'Save Changes & Publish Live'
                      : copy.saveAndPublish}
                  </span>
                </button>
                {isEditingProduct && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductForm(EMPTY_PRODUCT_FORM);
                      setIsEditingProduct(false);
                      setCompressedInfo(null);
                    }}
                    className="rounded-xl border border-white/15 px-4 text-xs font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                  >
                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                )}
              </div>
            </form>

            {/* Products Inventory List with Search, Single/Bulk Delete & Restore */}
            <div className="rounded-2xl border border-amber-500/20 bg-[#131A26] p-5 lg:col-span-7 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-white">
                  {lang === 'ar'
                    ? `المنتجات الحالية (${storeData.products.length})`
                    : `Current Products (${storeData.products.length})`}
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedProductIds.length > 0 && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleBulkDeleteSelected}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/30 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>
                        {lang === 'ar'
                          ? `حذف المحدد (${selectedProductIds.length})`
                          : `Delete Selected (${selectedProductIds.length})`}
                      </span>
                    </button>
                  )}

                  {storeData.products.length > 0 && !confirmClearAll && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => setConfirmClearAll(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{lang === 'ar' ? 'حذف الكل' : 'Delete All'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleRestoreDefaultProducts}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 py-1.5 text-xs font-semibold text-amber-200 hover:border-amber-400 disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{lang === 'ar' ? 'استعادة الافتراضي' : 'Restore Defaults'}</span>
                  </button>
                </div>
              </div>

              {confirmClearAll && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3.5 py-2.5 text-xs text-rose-100">
                  <span className="font-semibold">
                    {lang === 'ar'
                      ? 'تأكيد حذف جميع المنتجات من المتجر والسحابة فوراً؟'
                      : 'Confirm deleting all products from the store & Firebase Cloud immediately?'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteAllProducts}
                      className="rounded-lg bg-rose-600 px-3 py-1 font-bold text-white hover:bg-rose-500 cursor-pointer"
                    >
                      {lang === 'ar' ? 'نعم، احذف الكل' : 'Yes, Delete All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearAll(false)}
                      className="rounded-lg border border-white/20 px-3 py-1 font-semibold text-slate-200 hover:bg-slate-800 cursor-pointer"
                    >
                      {lang === 'ar' ? 'تراجع' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}

              {/* Search inside Admin Products */}
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={adminProductSearch}
                  onChange={(e) => setAdminProductSearch(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'ابحث داخل المنتجات بالاسم أو الكود أو العيار...'
                      : 'Search admin products by name, code, or karat...'
                  }
                  aria-label={lang === 'ar' ? 'بحث في منتجات الأدمن' : 'Search admin products'}
                  className="h-10 w-full rounded-xl border border-amber-500/20 bg-[#0B0F17] ps-9 pe-3 text-xs sm:text-sm text-white placeholder:text-slate-500"
                />
              </div>

              {filteredAdminProducts.length === 0 ? (
                <div className="rounded-xl border border-amber-500/15 bg-[#0B0F17] py-10 px-4 text-center text-xs sm:text-sm text-slate-400">
                  {storeData.products.length === 0
                    ? lang === 'ar'
                      ? 'لا توجد منتجات حالياً. أضف أي منتج جديد من النموذج الجانبي ليظهر فوراً لجميع المستخدمين.'
                      : 'No products currently in catalog. Add any new product using the form to publish live to all users.'
                    : lang === 'ar'
                      ? 'لا توجد منتجات مطابقة لعبارة البحث.'
                      : 'No products match your search query.'}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pe-1">
                  {filteredAdminProducts.map((prod) => {
                    const price = calculateProductPrice(
                      prod,
                      storeData.rates,
                      storeData.rates.autoLinkPrices
                    );
                    const displayTitle = lang === 'ar' ? prod.nameAr : prod.nameEn;
                    const isChecked = selectedProductIds.includes(prod.id);
                    const isDeletingThis = deletingProductId === prod.id;

                    return (
                      <div
                        key={prod.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/15 bg-[#0B0F17] p-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProductIds((prev) => [...prev, prod.id]);
                              } else {
                                setSelectedProductIds((prev) =>
                                  prev.filter((item) => item !== prod.id)
                                );
                              }
                            }}
                            aria-label={
                              lang === 'ar'
                                ? `تحديد ${displayTitle}`
                                : `Select ${displayTitle}`
                            }
                            className="h-4 w-4 shrink-0 accent-amber-500 cursor-pointer"
                          />
                          <img
                            src={prod.imageUrl}
                            alt={displayTitle}
                            className="h-14 w-14 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">
                              {displayTitle}
                            </div>
                            <div className="text-xs text-slate-400 font-mono-tabular">
                              {prod.code} · {lang === 'ar' ? `عيار ${prod.karat}` : `${prod.karat}K`} ·{' '}
                              {prod.weightGrams} {copy.gram} ·{' '}
                              <span className="text-amber-300 font-bold">
                                {formatCurrency(price.finalPrice, lang)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setProductForm({
                                ...prod,
                                descriptionAr: prod.descriptionAr || '',
                                descriptionEn: prod.descriptionEn || '',
                              });
                              setIsEditingProduct(true);
                            }}
                            aria-label={
                              lang === 'ar'
                                ? `تعديل ${displayTitle}`
                                : `Edit ${displayTitle}`
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/25 text-amber-300 hover:bg-amber-500/15 cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={isDeletingThis}
                            onClick={() => handleDeleteProduct(prod.id)}
                            aria-label={
                              lang === 'ar'
                                ? `حذف ${displayTitle}`
                                : `Delete ${displayTitle}`
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-rose-500/25 text-rose-400 hover:bg-rose-500/15 disabled:opacity-50 cursor-pointer"
                          >
                            {isDeletingThis ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MARKET RATES */}
      {activeTab === 'rates' && (
        <form
          onSubmit={handleSaveRates}
          className="rounded-2xl border border-amber-500/20 bg-[#131A26] p-5 sm:p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-bold text-amber-300">
              أسعار الذهب والفضة والبورصة العالمية
            </h2>
            <button
              type="button"
              onClick={handleSpotRefreshInAdmin}
              disabled={isRefreshingMarket}
              className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2 text-xs sm:text-sm font-bold text-amber-200 hover:bg-amber-500/25 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshingMarket ? 'animate-spin' : ''}`} />
              <span>{copy.refreshMarketBtn}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {(
              [
                ['gold24', 'ذهب عيار 24 (ج.م)'],
                ['gold21', 'ذهب عيار 21 (ج.م)'],
                ['gold18', 'ذهب عيار 18 (ج.م)'],
                ['goldPound', 'الجنيه الذهب (ج.م)'],
                ['silver925', 'فضة إيطالي 925 (ج.م)'],
                ['silverSwiss', 'فضة سويسري (ج.م)'],
                ['diamondCaratUsd', 'مؤشر الألماس/قيراط ($)'],
                ['ounceUsd', 'الأونصة العالمية ($)'],
                ['silverOunceUsd', 'أونصة الفضة ($)'],
                ['usdEgp', 'دولار الصاغة (ج.م)'],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs text-slate-300 mb-1.5">{label}</label>
                <input
                  type="number"
                  step="0.01"
                  value={ratesForm[field]}
                  onChange={(e) =>
                    setRatesForm({ ...ratesForm, [field]: Number(e.target.value) })
                  }
                  className="font-mono-tabular h-11 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm font-bold text-white"
                />
              </div>
            ))}
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-[#0B0F17] p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={ratesForm.autoLinkPrices}
              onChange={(e) =>
                setRatesForm({ ...ratesForm, autoLinkPrices: e.target.checked })
              }
              className="h-4 w-4 accent-amber-500"
            />
            <span className="text-sm font-semibold text-slate-200">
              تفعيل الربط التلقائي لأسعار المنتجات بسعر الجرام اللحظي والمصنعية
            </span>
          </label>

          <button
            type="submit"
            disabled={isSaving}
            className="flex min-h-[46px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] px-6 py-2.5 text-sm font-bold text-slate-950 hover:brightness-110 cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{copy.saveAndPublish}</span>
          </button>
        </form>
      )}

      {/* TAB 3: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={handleAddCategory}
            className="rounded-2xl border border-amber-500/20 bg-[#131A26] p-5 space-y-4 lg:col-span-5"
          >
            <h2 className="text-base font-bold text-amber-300">إضافة فئة / قسم جديد</h2>
            <div>
              <label className="block text-xs text-slate-300 mb-1">اسم القسم (عربي)</label>
              <input
                type="text"
                required
                value={newCatAr}
                onChange={(e) => setNewCatAr(e.target.value)}
                className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Category Name (EN)</label>
              <input
                type="text"
                required
                value={newCatEn}
                onChange={(e) => setNewCatEn(e.target.value)}
                className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">الأيقونة</label>
              <select
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              >
                <option value="crown">تاج (Crown)</option>
                <option value="gem">جوهرة (Gem)</option>
                <option value="watch">ساعة (Watch)</option>
                <option value="heart">قلب (Heart)</option>
                <option value="coins">سبائك (Coins)</option>
                <option value="sparkles">تألق (Sparkles)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] px-4 py-2.5 text-sm font-bold text-slate-950 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة ونشر الفئة</span>
            </button>
          </form>

          <div className="rounded-2xl border border-amber-500/20 bg-[#131A26] p-5 space-y-3 lg:col-span-7">
            <h2 className="text-base font-bold text-white">الأقسام الحالية</h2>
            {storeData.categories.map((cat) => (
              <div
                key={cat.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/15 bg-[#0B0F17] p-3"
              >
                {editingCatId === cat.id ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={editingCatAr}
                      onChange={(e) => setEditingCatAr(e.target.value)}
                      className="h-9 flex-1 min-w-[120px] rounded-lg border border-amber-500/30 bg-[#131A26] px-2.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={editingCatEn}
                      onChange={(e) => setEditingCatEn(e.target.value)}
                      className="h-9 flex-1 min-w-[120px] rounded-lg border border-amber-500/30 bg-[#131A26] px-2.5 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveCategoryEdit(cat.id)}
                      className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 cursor-pointer"
                    >
                      حفظ
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="text-sm font-bold text-white">{cat.nameAr}</span>
                      <span className="mx-2 text-slate-500">·</span>
                      <span className="text-xs text-slate-400">{cat.nameEn}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditingCatAr(cat.nameAr);
                          setEditingCatEn(cat.nameEn);
                        }}
                        aria-label={`تعديل ${cat.nameAr}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/25 text-amber-300 hover:bg-amber-500/15 cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      {!cat.isSystem && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          aria-label={`حذف ${cat.nameAr}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/25 text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BANNER & OFFERS */}
      {activeTab === 'banner' && (
        <form
          onSubmit={handleSaveBanner}
          className="rounded-2xl border border-amber-500/20 bg-[#131A26] p-5 sm:p-6 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base sm:text-lg font-bold text-amber-300">
              إدارة البنر الترويجي والعروض الموسمية
            </h2>
            <label className="flex items-center gap-2 text-sm font-semibold text-white cursor-pointer">
              <input
                type="checkbox"
                checked={bannerForm.enabled}
                onChange={(e) => setBannerForm({ ...bannerForm, enabled: e.target.checked })}
                className="h-4 w-4 accent-amber-500"
              />
              <span>تفعيل البنر في الواجهة الرئيسية</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">العنوان الرئيسي (عربي)</label>
              <input
                type="text"
                value={bannerForm.titleAr}
                onChange={(e) => setBannerForm({ ...bannerForm, titleAr: e.target.value })}
                className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Headline (EN)</label>
              <input
                type="text"
                value={bannerForm.titleEn}
                onChange={(e) => setBannerForm({ ...bannerForm, titleEn: e.target.value })}
                className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">الوصف (عربي)</label>
              <textarea
                rows={2}
                value={bannerForm.subtitleAr}
                onChange={(e) => setBannerForm({ ...bannerForm, subtitleAr: e.target.value })}
                className="w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] p-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Subtitle (EN)</label>
              <textarea
                rows={2}
                value={bannerForm.subtitleEn}
                onChange={(e) => setBannerForm({ ...bannerForm, subtitleEn: e.target.value })}
                className="w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] p-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">نسبة الخصم %</label>
              <input
                type="number"
                min="0"
                max="90"
                value={bannerForm.discountPercent}
                onChange={(e) =>
                  setBannerForm({ ...bannerForm, discountPercent: Number(e.target.value) })
                }
                className="font-mono-tabular h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">صورة البنر (ضغط &lt; 120KB)</label>
              <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/40 bg-[#0B0F17] px-3 text-xs font-semibold text-amber-300 hover:bg-amber-500/10">
                <ImagePlus className="h-4 w-4" />
                <span>رفع صورة بنر جديدة</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex min-h-[46px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] px-6 py-2.5 text-sm font-bold text-slate-950 cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{copy.saveAndPublish}</span>
          </button>
        </form>
      )}

      {/* TAB 5: BRANCH & CONTACT */}
      {activeTab === 'branch' && (
        <form
          onSubmit={handleSaveBranch}
          className="rounded-2xl border border-amber-500/20 bg-[#131A26] p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-base sm:text-lg font-bold text-amber-300">
            معلومات الفرع وأرقام التواصل
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">اسم المتجر (عربي)</label>
              <input
                type="text"
                value={branchForm.storeNameAr}
                onChange={(e) => setBranchForm({ ...branchForm, storeNameAr: e.target.value })}
                className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Store Name (EN)</label>
              <input
                type="text"
                value={branchForm.storeNameEn}
                onChange={(e) => setBranchForm({ ...branchForm, storeNameEn: e.target.value })}
                className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">عنوان الفرع (عربي)</label>
              <input
                type="text"
                value={branchForm.addressAr}
                onChange={(e) => setBranchForm({ ...branchForm, addressAr: e.target.value })}
                className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Branch Address (EN)</label>
              <input
                type="text"
                value={branchForm.addressEn}
                onChange={(e) => setBranchForm({ ...branchForm, addressEn: e.target.value })}
                className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">رقم الواتساب (بدون +)</label>
              <input
                type="text"
                value={branchForm.whatsappNumber}
                onChange={(e) => setBranchForm({ ...branchForm, whatsappNumber: e.target.value })}
                className="font-mono-tabular h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">رقم الاتصال الهاتفي</label>
              <input
                type="text"
                value={branchForm.phoneNumber}
                onChange={(e) => setBranchForm({ ...branchForm, phoneNumber: e.target.value })}
                className="font-mono-tabular h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">لغة المتجر الافتراضية للزوار (Language Settings)</label>
              <select
                value={defaultLangForm}
                onChange={(e) => setDefaultLangForm(e.target.value as Language)}
                className="h-10 w-full rounded-xl border border-amber-500/25 bg-[#0B0F17] px-3 text-sm text-white"
              >
                <option value="ar">العربية (RTL)</option>
                <option value="en">English (LTR)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex min-h-[46px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] px-6 py-2.5 text-sm font-bold text-slate-950 cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{copy.saveAndPublish}</span>
          </button>
        </form>
      )}
    </div>
  );
};
