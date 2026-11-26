import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Cpu,
  Globe,
  Image as ImageIcon,
  KeyRound,
  LayoutGrid,
  LogOut,
  MapPin,
  MonitorDown,
  Package,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  Video,
} from 'lucide-react';
import {
  DEFAULT_STORE_DATA,
  DEFAULT_STORE_ICON_URL,
  DEFAULT_TECH_PRODUCTS,
} from '../data/defaultStoreData';
import {
  CustomerOrder,
  Language,
  LayoutStyle,
  OSDownloadItem,
  Product,
  ProductCategoryGroup,
  ProductSubType,
  StoreData,
} from '../types/store';
import { compressImageToUnder120KB } from '../utils/imageCompressor';
import {
  applyPermanentProductDelete,
  isValidAdminPin,
  restoreDefaultProducts,
} from '../utils/storeLogic';

interface AdminDashboardProps {
  lang: Language;
  storeData: StoreData;
  savingCloud: boolean;
  cloudError: string | null;
  onSaveStoreData: (nextData: StoreData, successMsg: string) => Promise<void>;
  onLogout: () => void;
}

type AdminTab = 'orders' | 'products' | 'identity' | 'contacts' | 'branch';

const IMAGE_PRESETS = [
  {
    label: 'Gaming Laptop',
    url: '/src/assets/images/prod_gaming_laptop_1795638128447.jpg',
  },
  {
    label: 'RTX Workstation PC',
    url: '/src/assets/images/prod_rtx_workstation_pc_1795638127988.jpg',
  },
  {
    label: 'Accessories Bundle',
    url: '/src/assets/images/prod_accessories_bundle_1795638127995.jpg',
  },
  {
    label: '34" OLED Monitor',
    url: '/src/assets/images/prod_ultrawide_monitor_1795638127287.jpg',
  },
  {
    label: 'Tech Workstation',
    url: '/src/assets/images/hero_tech_workstation_1795638127434.jpg',
  },
  {
    label: 'Store Icon 512px',
    url: '/pwa-512x512.png',
  },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  storeData,
  savingCloud,
  cloudError,
  onSaveStoreData,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string }>({
    configured: false,
    model: 'gemini-4-hydrogen',
  });
  const [whatsappStatus, setWhatsappStatus] = useState<{
    mode: string;
    automatedChannelConfigured: boolean;
  }>({
    mode: 'background_queue',
    automatedChannelConfigured: false,
  });
  const [statusMessage, setStatusMessage] = useState('');

  // Product Form State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pNameAr, setPNameAr] = useState('');
  const [pNameEn, setPNameEn] = useState('');
  const [pBrand, setPBrand] = useState('');
  const [pSku, setPSku] = useState('');
  const [pSpecsAr, setPSpecsAr] = useState('');
  const [pSpecsEn, setPSpecsEn] = useState('');
  const [pCategoryGroup, setPCategoryGroup] = useState<ProductCategoryGroup>('computers');
  const [pSubType, setPSubType] = useState<ProductSubType>('laptop');
  const [pPrice, setPPrice] = useState('');
  const [pDiscount, setPDiscount] = useState('0');
  const [pInStock, setPInStock] = useState(true);
  const [pImageUrl, setPImageUrl] = useState(IMAGE_PRESETS[0].url);
  const [pVideoUrl, setPVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Identity & Wallpapers Draft
  const [identityDraft, setIdentityDraft] = useState(storeData.settings);
  const [newWpLabelAr, setNewWpLabelAr] = useState('');
  const [newWpLabelEn, setNewWpLabelEn] = useState('');

  // Contacts, Social, OS Downloads Draft
  const [branchDraft, setBranchDraft] = useState(storeData.branch);
  const [socialDraft, setSocialDraft] = useState(storeData.socialLinks);
  const [newOsTitleAr, setNewOsTitleAr] = useState('');
  const [newOsTitleEn, setNewOsTitleEn] = useState('');
  const [newOsVendor, setNewOsVendor] = useState<OSDownloadItem['vendor']>('Microsoft');
  const [newOsVersion, setNewOsVersion] = useState('');
  const [newOsUrl, setNewOsUrl] = useState('');

  // Security PIN Change Draft
  const [newPin, setNewPin] = useState(storeData.adminPin);
  const [confirmPin, setConfirmPin] = useState(storeData.adminPin);

  useEffect(() => {
    setIdentityDraft(storeData.settings);
    setBranchDraft(storeData.branch);
    setSocialDraft(storeData.socialLinks);
  }, [storeData.settings, storeData.branch, storeData.socialLinks]);

  useEffect(() => {
    fetch('/api/assistant/status')
      .then((r) => r.json())
      .then((d: { configured?: boolean; model?: string }) => {
        setAiStatus({
          configured: Boolean(d.configured),
          model: d.model || 'gemini-4-hydrogen',
        });
      })
      .catch(() => {
        // Ignore silent status check error
      });

    fetch('/api/orders/whatsapp-status')
      .then((r) => r.json())
      .then((d: { mode?: string; automatedChannelConfigured?: boolean }) => {
        setWhatsappStatus({
          mode: d.mode || 'background_queue',
          automatedChannelConfigured: Boolean(d.automatedChannelConfigured),
        });
      })
      .catch(() => {
        // Ignore silent status check error
      });
  }, []);

  const flashNotice = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const resetProductForm = () => {
    setEditingProductId(null);
    setPNameAr('');
    setPNameEn('');
    setPBrand('');
    setPSku('');
    setPSpecsAr('');
    setPSpecsEn('');
    setPCategoryGroup('computers');
    setPSubType('laptop');
    setPPrice('');
    setPDiscount('0');
    setPInStock(true);
    setPImageUrl(IMAGE_PRESETS[0].url);
    setPVideoUrl('');
  };

  const startEditingProduct = (p: Product) => {
    setEditingProductId(p.id);
    setPNameAr(p.nameAr);
    setPNameEn(p.nameEn);
    setPBrand(p.brand);
    setPSku(p.sku);
    setPSpecsAr(p.specsAr);
    setPSpecsEn(p.specsEn);
    setPCategoryGroup(p.categoryGroup);
    setPSubType(p.subType);
    setPPrice(String(p.price));
    setPDiscount(String(p.discountPercent || 0));
    setPInStock(p.inStock);
    setPImageUrl(p.imageUrl);
    setPVideoUrl(p.videoUrl || '');
    setActiveTab('products');
  };

  const handleProductImageUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { dataUrl } = await compressImageToUnder120KB(file);
      setPImageUrl(dataUrl);
      flashNotice(lang === 'ar' ? 'تم ضغط الصورة وتجهيزها بنجاح.' : 'Image compressed cleanly.');
    } catch (err) {
      flashNotice(err instanceof Error ? err.message : 'Failed to compress image.');
    }
  };

  const handleProductVideoUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      flashNotice(
        lang === 'ar'
          ? 'حجم الفيديو يتجاوز 25 ميجابايت.'
          : 'Video file size exceeds 25MB limit.'
      );
      return;
    }
    setUploadingVideo(true);
    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'video/mp4',
        },
        body: file,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Video upload failed.');
      }
      setPVideoUrl(data.url);
      flashNotice(
        lang === 'ar'
          ? 'تم رفع الفيديو الترويجي بنجاح! اضغط حفظ المنتج لاعتماده.'
          : 'Promo video uploaded cleanly! Save product to apply.'
      );
    } catch (err) {
      flashNotice(err instanceof Error ? err.message : 'Video upload failed.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericPrice = Math.max(0, Number(pPrice) || 0);
    const numericDiscount = Math.min(95, Math.max(0, Number(pDiscount) || 0));
    if (!pNameAr.trim() || numericPrice <= 0) {
      flashNotice(
        lang === 'ar'
          ? 'يرجى إدخال اسم المنتج وسعر صالح.'
          : 'Please enter a product name and valid price.'
      );
      return;
    }

    const existing = editingProductId
      ? storeData.products.find((p) => p.id === editingProductId)
      : undefined;

    const productPayload: Product = {
      id: editingProductId || `prod-${Date.now().toString(36)}`,
      sku: pSku.trim() || `TECH-${Date.now().toString().slice(-4)}`,
      nameAr: pNameAr.trim(),
      nameEn: pNameEn.trim() || pNameAr.trim(),
      brand: pBrand.trim() || 'Tech Pro',
      specsAr: pSpecsAr.trim() || pNameAr.trim(),
      specsEn: pSpecsEn.trim() || pSpecsAr.trim() || pNameEn.trim() || pNameAr.trim(),
      categoryGroup: pCategoryGroup,
      subType: pSubType,
      price: numericPrice,
      discountPercent: numericDiscount,
      inStock: pInStock,
      isFeatured: existing?.isFeatured ?? true,
      isDefault: existing?.isDefault ?? false,
      imageUrl: pImageUrl.trim() || IMAGE_PRESETS[0].url,
      videoUrl: pVideoUrl.trim() || '',
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    const nextProducts = editingProductId
      ? storeData.products.map((p) => (p.id === editingProductId ? productPayload : p))
      : [productPayload, ...storeData.products];

    await onSaveStoreData(
      {
        ...storeData,
        products: nextProducts,
      },
      editingProductId
        ? lang === 'ar'
          ? 'تم تحديث المنتج ومزامنته سحابياً بنجاح.'
          : 'Product updated & synced cleanly.'
        : lang === 'ar'
          ? 'تمت إضافة المنتج الجديد ونشره فوراً لجميع الزوار.'
          : 'Product added & published live.'
    );
    resetProductForm();
  };

  const handlePermanentDeleteProduct = async (productId: string) => {
    const result = applyPermanentProductDelete(
      storeData.products,
      storeData.deletedDefaultIds,
      storeData.deletedProductsHistory,
      [productId]
    );
    await onSaveStoreData(
      {
        ...storeData,
        products: result.products,
        deletedDefaultIds: result.deletedDefaultIds,
        deletedProductsHistory: result.deletedProductsHistory,
      },
      lang === 'ar'
        ? 'تم حذف المنتج نهائياً وتحديث سجل خدمة العملاء الذكية.'
        : 'Product permanently deleted & AI out-of-stock log updated.'
    );
  };

  const handleRestoreDefaults = async () => {
    const restored = restoreDefaultProducts(storeData.products, DEFAULT_TECH_PRODUCTS);
    await onSaveStoreData(
      {
        ...storeData,
        products: restored.products,
        deletedDefaultIds: restored.deletedDefaultIds,
      },
      lang === 'ar'
        ? 'تمت استعادة جميع المنتجات الافتراضية بنجاح.'
        : 'Default products restored cleanly.'
    );
  };

  const handleMoveProduct = async (index: number, delta: number) => {
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= storeData.products.length) return;
    const copy = [...storeData.products];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    await onSaveStoreData(
      { ...storeData, products: copy },
      lang === 'ar' ? 'تم تحديث ترتيب المنتجات.' : 'Product order updated.'
    );
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    nextStatus: CustomerOrder['status']
  ) => {
    const nextOrders = storeData.orders.map((o) =>
      o.id === orderId ? { ...o, status: nextStatus } : o
    );
    await onSaveStoreData(
      { ...storeData, orders: nextOrders },
      lang === 'ar' ? 'تم تحديث حالة الطلب.' : 'Order status updated.'
    );
  };

  const handleDeleteOrder = async (orderId: string) => {
    const nextOrders = storeData.orders.filter((o) => o.id !== orderId);
    await onSaveStoreData(
      { ...storeData, orders: nextOrders },
      lang === 'ar' ? 'تم حذف سجل الطلب.' : 'Order removed.'
    );
  };

  const handleUploadStoreIcon = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { dataUrl } = await compressImageToUnder120KB(file);
      setIdentityDraft((prev) => ({ ...prev, storeIconUrl: dataUrl }));
      flashNotice(lang === 'ar' ? 'تم تجهيز أيقونة المتجر.' : 'Store icon ready.');
    } catch (err) {
      flashNotice(err instanceof Error ? err.message : 'Icon compression failed.');
    }
  };

  const handleUploadWallpaper = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { dataUrl } = await compressImageToUnder120KB(file);
      const nextWp = {
        id: `wp-${Date.now()}`,
        labelAr: newWpLabelAr.trim() || 'خلفية مخصصة',
        labelEn: newWpLabelEn.trim() || 'Custom Wallpaper',
        imageUrl: dataUrl,
      };
      await onSaveStoreData(
        {
          ...storeData,
          wallpapers: [nextWp, ...storeData.wallpapers],
        },
        lang === 'ar' ? 'تم رفع الخلفية وإتاحتها للزوار.' : 'Wallpaper uploaded & published.'
      );
      setNewWpLabelAr('');
      setNewWpLabelEn('');
    } catch (err) {
      flashNotice(err instanceof Error ? err.message : 'Wallpaper upload failed.');
    }
  };

  const handleDeleteWallpaper = async (wpId: string) => {
    await onSaveStoreData(
      {
        ...storeData,
        wallpapers: storeData.wallpapers.filter((w) => w.id !== wpId),
      },
      lang === 'ar' ? 'تم حذف الخلفية.' : 'Wallpaper removed.'
    );
  };

  const handleAddOsDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOsTitleAr.trim() || !newOsUrl.trim()) return;
    const item: OSDownloadItem = {
      id: `os-${Date.now()}`,
      titleAr: newOsTitleAr.trim(),
      titleEn: newOsTitleEn.trim() || newOsTitleAr.trim(),
      vendor: newOsVendor,
      version: newOsVersion.trim() || 'Latest Official',
      sizeLabel: 'Official Link',
      descriptionAr: 'رابط رسمي مضاف من لوحة الإدارة.',
      descriptionEn: 'Official link configured by Store Admin.',
      officialUrl: newOsUrl.trim(),
    };
    await onSaveStoreData(
      {
        ...storeData,
        osDownloads: [...storeData.osDownloads, item],
      },
      lang === 'ar' ? 'تمت إضافة رابط التحديث الرسمي.' : 'Official download added.'
    );
    setNewOsTitleAr('');
    setNewOsTitleEn('');
    setNewOsVersion('');
    setNewOsUrl('');
  };

  const handleDeleteOsDownload = async (id: string) => {
    await onSaveStoreData(
      {
        ...storeData,
        osDownloads: storeData.osDownloads.filter((o) => o.id !== id),
      },
      lang === 'ar' ? 'تم حذف رابط التحميل.' : 'Download link removed.'
    );
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidAdminPin(newPin)) {
      flashNotice(
        lang === 'ar'
          ? 'يجب أن يتكون الرمز السري من 10 أرقام بالضبط.'
          : 'Admin PIN must be exactly 10 digits.'
      );
      return;
    }
    if (newPin !== confirmPin) {
      flashNotice(
        lang === 'ar' ? 'الرقمان غير متطابقين.' : 'PIN confirmation does not match.'
      );
      return;
    }
    await onSaveStoreData(
      {
        ...storeData,
        branch: branchDraft,
        adminPin: newPin.trim(),
      },
      lang === 'ar'
        ? 'تم حفظ بيانات الفرع وتحديث الرمز السري المكون من 10 أرقام.'
        : 'Branch info and 10-digit PIN updated cleanly.'
    );
  };

  const newOrdersCount = storeData.orders.filter((o) => o.status === 'new').length;

  return (
    <section
      className="mx-auto max-w-6xl space-y-5 px-3 py-5 sm:px-6"
      data-testid="admin-dashboard"
    >
      {/* Admin Header */}
      <div className="tech-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-500" />
            <span>{lang === 'ar' ? 'لوحة الإدارة السحابية' : 'Cloud Admin Panel'}</span>
          </h2>
          <p className="tech-text-secondary text-xs">
            {lang === 'ar'
              ? 'جميع التعديلات تُحفظ وتظهر فوراً على كل الأجهزة عبر Firebase Firestore.'
              : 'Every change syncs in real time across all customer devices via Firebase Firestore.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savingCloud && (
            <span className="rounded-lg bg-blue-600/15 px-3 py-1.5 text-xs font-bold text-blue-500">
              {lang === 'ar' ? 'جاري المزامنة...' : 'Syncing...'}
            </span>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-bold text-rose-500 hover:bg-rose-500/20"
          >
            <LogOut className="h-4 w-4" />
            <span>{lang === 'ar' ? 'قفل الإدارة' : 'Lock Admin'}</span>
          </button>
        </div>
      </div>

      {(statusMessage || cloudError) && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-bold ${
            cloudError
              ? 'border-rose-500/40 bg-rose-500/15 text-rose-500'
              : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
          }`}
        >
          {cloudError || statusMessage}
        </div>
      )}

      {/* Admin Sub-Navigation Tabs */}
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        {[
          {
            id: 'orders' as AdminTab,
            labelAr: `الطلبات الواردة (${newOrdersCount} جديد)`,
            labelEn: `Incoming Orders (${newOrdersCount} new)`,
            Icon: ClipboardList,
          },
          {
            id: 'products' as AdminTab,
            labelAr: `المنتجات (${storeData.products.length})`,
            labelEn: `Products (${storeData.products.length})`,
            Icon: Package,
          },
          {
            id: 'identity' as AdminTab,
            labelAr: 'الهوية والخلفيات والتصميم',
            labelEn: 'Identity, Layout & Wallpapers',
            Icon: LayoutGrid,
          },
          {
            id: 'contacts' as AdminTab,
            labelAr: 'الأرقام والروابط والأنظمة',
            labelEn: 'Phones, Links & OS',
            Icon: Globe,
          },
          {
            id: 'branch' as AdminTab,
            labelAr: 'الفرع والرمز السري',
            labelEn: 'Branch & 10-Digit PIN',
            Icon: KeyRound,
          },
        ].map(({ id, labelAr, labelEn, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            data-testid={`admin-tab-${id}`}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
              activeTab === id ? 'tech-accent-btn shadow-sm' : 'tech-surface border'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{lang === 'ar' ? labelAr : labelEn}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="tech-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4">
            <div className="flex items-center gap-2.5 text-xs">
              <ShieldAlert className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'رقم واتساب المتجر لاستقبال طلبات العملاء:'
                  : 'Store WhatsApp Number Receiving Customer Orders:'}{' '}
                <strong className="font-mono-tabular text-blue-500" dir="ltr">
                  {storeData.branch.secretOrdersPhone ||
                    storeData.branch.publicWhatsappNumber ||
                    '201025134582'}
                </strong>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-emerald-500">
                {whatsappStatus.mode === 'customer_whatsapp_client' ||
                whatsappStatus.automatedChannelConfigured
                  ? lang === 'ar'
                    ? 'إرسال الطلبات عبر واتساب العميل مفعل'
                    : 'Customer WhatsApp Order Checkout Active'
                  : lang === 'ar'
                    ? 'استقبال الطلبات عبر واتساب وحفظها سحابياً'
                    : 'WhatsApp Checkout + Cloud Archive Ready'}
              </span>
              {aiStatus.configured && (
                <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-emerald-500">
                  Gemini AI ({aiStatus.model}) + Google Search
                </span>
              )}
            </div>
          </div>

          {storeData.orders.length === 0 ? (
            <div className="tech-surface rounded-2xl border p-10 text-center text-sm tech-text-secondary">
              {lang === 'ar'
                ? 'لا توجد طلبات عملاء واردة حتى الآن.'
                : 'No customer orders submitted yet.'}
            </div>
          ) : (
            <div className="space-y-3">
              {storeData.orders.map((order) => (
                <div
                  key={order.id}
                  data-testid={`admin-order-${order.id}`}
                  className="tech-surface rounded-2xl border p-4 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tabular text-xs font-extrabold text-blue-500">
                          {order.id}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            order.status === 'new'
                              ? 'bg-amber-500/20 text-amber-500'
                              : order.status === 'contacted'
                                ? 'bg-blue-500/20 text-blue-500'
                                : 'bg-emerald-500/20 text-emerald-500'
                          }`}
                        >
                          {order.status === 'new'
                            ? lang === 'ar'
                              ? 'جديد'
                              : 'New'
                            : order.status === 'contacted'
                              ? lang === 'ar'
                                ? 'تم التواصل'
                                : 'Contacted'
                              : lang === 'ar'
                                ? 'تم التسليم'
                                : 'Delivered'}
                        </span>
                      </div>
                      <h3 className="text-sm font-extrabold mt-1">{order.customerName}</h3>
                      <p className="tech-text-secondary text-xs">
                        {order.customerAddress} •{' '}
                        <span className="font-mono-tabular" dir="ltr">
                          {order.customerPhone}
                        </span>
                      </p>
                      {order.note && (
                        <p className="mt-1 text-xs text-amber-500">
                          {lang === 'ar' ? 'ملحوظة:' : 'Note:'} {order.note}
                        </p>
                      )}
                    </div>

                    <div className="text-end">
                      <p className="font-mono-tabular text-base font-extrabold text-blue-600 dark:text-sky-400">
                        {order.total.toLocaleString('en-US')} {order.currency}
                      </p>
                      <p className="tech-text-secondary text-[11px]">
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="tech-surface-muted rounded-xl border p-3 text-xs space-y-1">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span>
                          {lang === 'ar' ? item.nameAr : item.nameEn} × {item.quantity}
                        </span>
                        <span className="font-mono-tabular font-bold">
                          {(item.unitPrice * item.quantity).toLocaleString('en-US')}{' '}
                          {order.currency}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span
                      data-testid={`order-dispatch-badge-${order.id}`}
                      className={`rounded-lg px-2.5 py-1 font-bold ${
                        order.whatsappDispatchStatus === 'opened_whatsapp_client' ||
                        order.whatsappDispatchStatus === 'sent_via_cloud_api' ||
                        order.whatsappDispatchStatus === 'sent_via_gateway'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : order.whatsappDispatchStatus === 'sent_via_webhook'
                            ? 'bg-blue-500/15 text-blue-500'
                            : 'bg-slate-500/15 tech-text-secondary'
                      }`}
                    >
                      {order.whatsappDispatchStatus === 'opened_whatsapp_client'
                        ? lang === 'ar'
                          ? 'تم فتح واتساب العميل للإرسال المباشر'
                          : 'Opened in Customer WhatsApp'
                        : order.whatsappDispatchStatus === 'sent_via_cloud_api'
                          ? lang === 'ar'
                            ? 'تم الإرسال تلقائياً عبر WhatsApp API'
                            : 'Auto-Sent via WhatsApp Cloud API'
                          : order.whatsappDispatchStatus === 'sent_via_gateway'
                            ? lang === 'ar'
                              ? 'تم الإرسال تلقائياً عبر البوابة'
                              : 'Auto-Sent via WhatsApp Gateway'
                            : order.whatsappDispatchStatus === 'sent_via_webhook'
                              ? lang === 'ar'
                                ? 'تم الإرسال تلقائياً عبر Webhook'
                                : 'Auto-Sent via Webhook'
                              : lang === 'ar'
                                ? 'مجهز للإرسال ومؤرشف باللوحة'
                                : 'Formatted & Archived in Panel'}
                    </span>
                  </div>

                  {order.whatsappMessageText && (
                    <pre
                      data-testid={`order-whatsapp-preview-${order.id}`}
                      className="tech-surface-muted whitespace-pre-wrap rounded-xl border p-3 text-[11px] leading-relaxed tech-text-secondary font-sans"
                    >
                      {order.whatsappMessageText}
                    </pre>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {(['new', 'contacted', 'delivered'] as CustomerOrder['status'][]).map(
                        (st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, st)}
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-bold border ${
                              order.status === st
                                ? 'tech-accent-btn border-transparent'
                                : 'tech-surface-muted'
                            }`}
                          >
                            {st === 'new'
                              ? lang === 'ar'
                                ? 'جديد'
                                : 'New'
                              : st === 'contacted'
                                ? lang === 'ar'
                                  ? 'تم التواصل'
                                  : 'Contacted'
                                : lang === 'ar'
                                  ? 'تم التسليم'
                                  : 'Delivered'}
                          </button>
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{lang === 'ar' ? 'حذف' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRODUCTS CRUD + VIDEO UPLOAD + PERMANENT DELETE + RESTORE */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveProduct}
            className="tech-surface rounded-2xl border p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-extrabold">
                {editingProductId
                  ? lang === 'ar'
                    ? 'تعديل بيانات المنتج'
                    : 'Edit Product'
                  : lang === 'ar'
                    ? 'إضافة منتج جديد (كمبيوتر / لابتوب / إكسسوار / برنامج)'
                    : 'Add New Product'}
              </h3>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="text-xs font-bold text-blue-500 hover:underline"
                >
                  {lang === 'ar' ? 'إلغاء التعديل' : 'Cancel Edit'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'اسم المنتج (عربي) *' : 'Product Name (AR) *'}
                </label>
                <input
                  type="text"
                  required
                  value={pNameAr}
                  onChange={(e) => setPNameAr(e.target.value)}
                  data-testid="admin-prod-name-ar"
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'اسم المنتج (إنجليزي)' : 'Product Name (EN)'}
                </label>
                <input
                  type="text"
                  value={pNameEn}
                  onChange={(e) => setPNameEn(e.target.value)}
                  data-testid="admin-prod-name-en"
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'الماركة / البراند' : 'Brand'}
                </label>
                <input
                  type="text"
                  value={pBrand}
                  onChange={(e) => setPBrand(e.target.value)}
                  placeholder="ASUS / Lenovo / HP / Logitech"
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'التصنيف الرئيسي' : 'Main Category'}
                </label>
                <select
                  value={pCategoryGroup}
                  onChange={(e) => setPCategoryGroup(e.target.value as ProductCategoryGroup)}
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none"
                >
                  <option value="computers">{lang === 'ar' ? 'كمبيوترات' : 'Computers'}</option>
                  <option value="accessories">{lang === 'ar' ? 'إكسسوارات' : 'Accessories'}</option>
                  <option value="software">{lang === 'ar' ? 'برمجيات وأنظمة' : 'Software'}</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'النوع الفرعي' : 'Device Subtype'}
                </label>
                <select
                  value={pSubType}
                  onChange={(e) => setPSubType(e.target.value as ProductSubType)}
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none"
                >
                  <option value="laptop">Laptop</option>
                  <option value="desktop_case">PC Case / Desktop</option>
                  <option value="custom_build">Custom Workstation Build</option>
                  <option value="monitor">Monitor</option>
                  <option value="headset">Headset</option>
                  <option value="mic">Microphone</option>
                  <option value="keyboard_mouse">Keyboard & Mouse</option>
                  <option value="bag">Laptop Bag</option>
                  <option value="software">Software / License</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'كود المنتج (SKU)' : 'SKU'}
                </label>
                <input
                  type="text"
                  value={pSku}
                  onChange={(e) => setPSku(e.target.value)}
                  placeholder="LAP-001"
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm font-mono-tabular outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? `السعر (${storeData.settings.currency}) *` : 'Price *'}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={pPrice}
                  onChange={(e) => setPPrice(e.target.value)}
                  data-testid="admin-prod-price"
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm font-mono-tabular outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'نسبة الخصم (%)' : 'Discount (%)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={95}
                  value={pDiscount}
                  onChange={(e) => setPDiscount(e.target.value)}
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm font-mono-tabular outline-none"
                />
              </div>

              <div className="flex items-end pb-1.5">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={pInStock}
                    onChange={(e) => setPInStock(e.target.checked)}
                    className="h-4 w-4 rounded accent-blue-600"
                  />
                  <span>{lang === 'ar' ? 'متوفر بالمخزون' : 'In Stock'}</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'المواصفات (عربي)' : 'Specs (AR)'}
                </label>
                <input
                  type="text"
                  value={pSpecsAr}
                  onChange={(e) => setPSpecsAr(e.target.value)}
                  placeholder="Core i7 • RTX 4060 • 16GB RAM • 1TB SSD"
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'المواصفات (إنجليزي)' : 'Specs (EN)'}
                </label>
                <input
                  type="text"
                  value={pSpecsEn}
                  onChange={(e) => setPSpecsEn(e.target.value)}
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            {/* Image + Promo Video Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-inherit pt-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold">
                  {lang === 'ar' ? 'صورة المنتج (رفع من الجهاز أو اختيار جاهز)' : 'Product Image'}
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="tech-surface-muted inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold hover:border-blue-500/40">
                    <Upload className="h-3.5 w-3.5 text-blue-500" />
                    <span>{lang === 'ar' ? 'رفع صورة (<120KB)' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleProductImageUpload(e.target.files?.[0])}
                    />
                  </label>
                  <select
                    value={pImageUrl}
                    onChange={(e) => setPImageUrl(e.target.value)}
                    className="tech-surface-muted rounded-xl border px-3 py-2 text-xs font-bold outline-none"
                  >
                    {IMAGE_PRESETS.map((preset) => (
                      <option key={preset.url} value={preset.url}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={pImageUrl}
                  onChange={(e) => setPImageUrl(e.target.value)}
                  placeholder="/src/assets/images/..."
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-xs font-mono-tabular outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-bold">
                  <Video className="h-3.5 w-3.5 text-blue-500" />
                  <span>
                    {lang === 'ar'
                      ? 'فيديو ترويجي للمنتج (رفع من الاستوديو أو رابط مباشر)'
                      : 'Promo Video (Upload from Device or Direct URL)'}
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="tech-surface-muted inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold hover:border-blue-500/40">
                    <Upload className="h-3.5 w-3.5 text-blue-500" />
                    <span>
                      {uploadingVideo
                        ? lang === 'ar'
                          ? 'جاري رفع الفيديو...'
                          : 'Uploading...'
                        : lang === 'ar'
                          ? 'رفع فيديو MP4/WebM'
                          : 'Upload Video'}
                    </span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={(e) => handleProductVideoUpload(e.target.files?.[0])}
                    />
                  </label>
                  {pVideoUrl && (
                    <button
                      type="button"
                      onClick={() => setPVideoUrl('')}
                      className="text-xs font-bold text-rose-500 hover:underline"
                    >
                      {lang === 'ar' ? 'إزالة الفيديو' : 'Clear Video'}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  dir="ltr"
                  value={pVideoUrl}
                  onChange={(e) => setPVideoUrl(e.target.value)}
                  placeholder="/uploads/promo_... or https://..."
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-xs font-mono-tabular outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingCloud || uploadingVideo}
              data-testid="admin-save-product-btn"
              className="tech-accent-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold"
            >
              <Plus className="h-4 w-4" />
              <span>
                {editingProductId
                  ? lang === 'ar'
                    ? 'حفظ التعديلات على المنتج'
                    : 'Save Product Changes'
                  : lang === 'ar'
                    ? 'إضافة ونشر المنتج الآن'
                    : 'Add & Publish Product'}
              </span>
            </button>
          </form>

          {/* Products List + Permanent Delete + Restore Defaults */}
          <div className="tech-surface rounded-2xl border p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold">
                  {lang === 'ar' ? 'قائمة المنتجات الحالية' : 'Current Store Products'}
                </h3>
                <p className="tech-text-secondary text-xs">
                  {lang === 'ar'
                    ? `محذوفات مسجلة لخدمة العملاء الذكية: ${storeData.deletedProductsHistory.length}`
                    : `Deleted items tracked for AI support: ${storeData.deletedProductsHistory.length}`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRestoreDefaults}
                data-testid="restore-defaults-btn"
                className="tech-surface-muted inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-extrabold hover:border-blue-500/50"
              >
                <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                <span>
                  {lang === 'ar' ? 'استعادة المنتجات الافتراضية' : 'Restore Default Products'}
                </span>
              </button>
            </div>

            <div className="space-y-2.5">
              {storeData.products.map((prod, index) => (
                <div
                  key={prod.id}
                  data-testid={`admin-prod-row-${prod.id}`}
                  className="tech-surface-muted flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={prod.imageUrl}
                      alt={prod.nameAr}
                      className="h-14 w-16 shrink-0 rounded-lg object-cover bg-slate-900"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold">
                        {lang === 'ar' ? prod.nameAr : prod.nameEn}
                      </p>
                      <p className="tech-text-secondary text-xs font-mono-tabular">
                        {prod.price.toLocaleString('en-US')} {storeData.settings.currency}
                        {prod.discountPercent > 0 ? ` (-${prod.discountPercent}%)` : ''} •{' '}
                        {prod.inStock
                          ? lang === 'ar'
                            ? 'متاح'
                            : 'In Stock'
                          : lang === 'ar'
                            ? 'نفذ'
                            : 'Out'}
                        {prod.videoUrl ? ' • 🎬 Video' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveProduct(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="tech-surface rounded-lg border p-2 disabled:opacity-40"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveProduct(index, 1)}
                      disabled={index === storeData.products.length - 1}
                      aria-label="Move down"
                      className="tech-surface rounded-lg border p-2 disabled:opacity-40"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditingProduct(prod)}
                      className="tech-surface inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold"
                    >
                      <Pencil className="h-3.5 w-3.5 text-blue-500" />
                      <span>{lang === 'ar' ? 'تعديل' : 'Edit'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePermanentDeleteProduct(prod.id)}
                      data-testid={`admin-delete-prod-${prod.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-500/25"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{lang === 'ar' ? 'حذف نهائي' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IDENTITY, LAYOUT & WALLPAPERS */}
      {activeTab === 'identity' && (
        <div className="space-y-6">
          <div className="tech-surface rounded-2xl border p-5 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold">
              {lang === 'ar'
                ? 'هوية المتجر، الأيقونة، ونمط التصميم'
                : 'Store Identity, Icon & UI Layout'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'اسم المتجر (عربي)' : 'Store Name (AR)'}
                </label>
                <input
                  type="text"
                  value={identityDraft.storeNameAr}
                  onChange={(e) =>
                    setIdentityDraft((prev) => ({ ...prev, storeNameAr: e.target.value }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'اسم المتجر (إنجليزي)' : 'Store Name (EN)'}
                </label>
                <input
                  type="text"
                  value={identityDraft.storeNameEn}
                  onChange={(e) =>
                    setIdentityDraft((prev) => ({ ...prev, storeNameEn: e.target.value }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'رابط الموقع' : 'Website URL'}
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={identityDraft.siteUrl}
                  onChange={(e) =>
                    setIdentityDraft((prev) => ({ ...prev, siteUrl: e.target.value }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm font-mono-tabular outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'نمط عرض واجهة المتجر' : 'Storefront Layout Style'}
                </label>
                <select
                  value={identityDraft.layoutStyle}
                  onChange={(e) =>
                    setIdentityDraft((prev) => ({
                      ...prev,
                      layoutStyle: e.target.value as LayoutStyle,
                    }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm font-bold outline-none"
                >
                  <option value="modern_grid">
                    {lang === 'ar' ? 'شبكة أمازون التقنية الحديثة' : 'Modern Tech Grid'}
                  </option>
                  <option value="executive_wide">
                    {lang === 'ar' ? 'بطاقات عريضة تفصيلية' : 'Executive Wide Cards'}
                  </option>
                  <option value="compact_cards">
                    {lang === 'ar' ? 'شبكة مضغوطة سريعة (4 أعمدة)' : 'Compact 4-Column Grid'}
                  </option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-inherit pt-4">
              <img
                src={identityDraft.storeIconUrl || DEFAULT_STORE_ICON_URL}
                alt="Store Icon"
                className="h-14 w-14 rounded-2xl border border-blue-500/30 object-cover"
              />
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="tech-surface-muted inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold">
                    <Upload className="h-3.5 w-3.5 text-blue-500" />
                    <span>{lang === 'ar' ? 'رفع أيقونة جديدة' : 'Upload New Icon'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleUploadStoreIcon(e.target.files?.[0])}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setIdentityDraft((prev) => ({
                        ...prev,
                        storeIconUrl: DEFAULT_STORE_ICON_URL,
                      }))
                    }
                    className="text-xs font-bold text-blue-500 hover:underline"
                  >
                    {lang === 'ar' ? 'استعادة أيقونة 512×512 PNG الافتراضية' : 'Restore 512px PNG Icon'}
                  </button>
                </div>
                <input
                  type="text"
                  dir="ltr"
                  value={identityDraft.storeIconUrl}
                  onChange={(e) =>
                    setIdentityDraft((prev) => ({ ...prev, storeIconUrl: e.target.value }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-1.5 text-xs font-mono-tabular outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-inherit pt-4">
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'عنوان البانر الرئيسي (عربي)' : 'Hero Banner Title (AR)'}
                </label>
                <input
                  type="text"
                  value={identityDraft.heroTitleAr}
                  onChange={(e) =>
                    setIdentityDraft((prev) => ({ ...prev, heroTitleAr: e.target.value }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'عنوان البانر الرئيسي (إنجليزي)' : 'Hero Banner Title (EN)'}
                </label>
                <input
                  type="text"
                  value={identityDraft.heroTitleEn}
                  onChange={(e) =>
                    setIdentityDraft((prev) => ({ ...prev, heroTitleEn: e.target.value }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onSaveStoreData(
                  { ...storeData, settings: identityDraft },
                  lang === 'ar' ? 'تم حفظ إعدادات الهوية والتصميم.' : 'Identity & layout saved.'
                )
              }
              className="tech-accent-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold"
            >
              <Save className="h-4 w-4" />
              <span>{lang === 'ar' ? 'حفظ الهوية والتصميم' : 'Save Identity & Layout'}</span>
            </button>
          </div>

          {/* Wallpapers Upload Management */}
          <div className="tech-surface rounded-2xl border p-5 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-blue-500" />
              <span>
                {lang === 'ar'
                  ? 'إدارة خلفيات المتجر للزوار'
                  : 'Storefront Wallpaper Gallery Manager'}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'اسم الخلفية (عربي)' : 'Wallpaper Label (AR)'}
                </label>
                <input
                  type="text"
                  value={newWpLabelAr}
                  onChange={(e) => setNewWpLabelAr(e.target.value)}
                  placeholder="خلفية سيت أب احترافي"
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'اسم الخلفية (إنجليزي)' : 'Wallpaper Label (EN)'}
                </label>
                <input
                  type="text"
                  value={newWpLabelEn}
                  onChange={(e) => setNewWpLabelEn(e.target.value)}
                  placeholder="Pro Setup Wallpaper"
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />
              </div>
              <label className="tech-accent-btn inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold">
                <Upload className="h-4 w-4" />
                <span>{lang === 'ar' ? 'رفع خلفية جديدة' : 'Upload Wallpaper'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUploadWallpaper(e.target.files?.[0])}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {storeData.wallpapers.map((wp) => (
                <div
                  key={wp.id}
                  className="tech-surface-muted overflow-hidden rounded-xl border"
                >
                  <img
                    src={wp.imageUrl}
                    alt={wp.labelAr}
                    className="h-28 w-full object-cover"
                  />
                  <div className="flex items-center justify-between p-2.5 text-xs font-bold">
                    <span className="truncate">{lang === 'ar' ? wp.labelAr : wp.labelEn}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteWallpaper(wp.id)}
                      className="text-rose-500 hover:underline"
                    >
                      {lang === 'ar' ? 'حذف' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PHONES (SECRET VS PUBLIC), SOCIAL LINKS, OS CENTER & GEMINI STATUS */}
      {activeTab === 'contacts' && (
        <div className="space-y-6">
          <div className="tech-surface rounded-2xl border p-5 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-500" />
              <span>
                {lang === 'ar'
                  ? 'أرقام الواتساب (الاستلام السري مقابل التواصل المعلن) وروابط التواصل'
                  : 'Secret Orders Phone vs Public WhatsApp & Social Links'}
              </span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1.5">
                <label className="block text-xs font-extrabold text-amber-500">
                  {lang === 'ar'
                    ? 'رقم واتساب استلام الطلبات المباشر (يفتح للعميل عند إرسال الطلب)'
                    : 'Orders Receiving WhatsApp Number (Customer Sends Here)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={branchDraft.secretOrdersPhone}
                  onChange={(e) =>
                    setBranchDraft((prev) => ({ ...prev, secretOrdersPhone: e.target.value }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm font-mono-tabular outline-none"
                />
                <p className="tech-text-secondary text-[11px]">
                  {lang === 'ar'
                    ? 'عند ضغط العميل على "إرسال الطلب" يتم فتح رسالة الطلب المنسقة عبر حسابه على واتساب لإرسالها لهذا الرقم مباشرة مع حفظ نسخة في لوحة الإدارة.'
                    : 'When a customer clicks Submit Order, their WhatsApp opens with the formatted order directed to this number while saving a copy here.'}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-1.5">
                <label className="block text-xs font-extrabold text-emerald-500">
                  {lang === 'ar'
                    ? 'رقم واتساب التواصل المعلن (مربوط بالزر الدائري العائم)'
                    : 'Public Contact WhatsApp (Floating Button)'}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={branchDraft.publicWhatsappNumber}
                  onChange={(e) =>
                    setBranchDraft((prev) => ({
                      ...prev,
                      publicWhatsappNumber: e.target.value,
                    }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm font-mono-tabular outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold">
                {lang === 'ar'
                  ? 'رابط Webhook اختياري لإرسال الطلبات في الخلفية (HTTPS)'
                  : 'Optional Background Order Webhook URL (HTTPS)'}
              </label>
              <input
                type="url"
                dir="ltr"
                value={branchDraft.orderWebhookUrl}
                onChange={(e) =>
                  setBranchDraft((prev) => ({ ...prev, orderWebhookUrl: e.target.value }))
                }
                placeholder="https://your-webhook.example.com/orders"
                className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-xs font-mono-tabular outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-inherit pt-4">
              {[
                { key: 'facebookUrl', label: 'Facebook URL' },
                { key: 'youtubeUrl', label: 'YouTube URL' },
                { key: 'instagramUrl', label: 'Instagram URL' },
                { key: 'tiktokUrl', label: 'TikTok URL' },
              ].map((item) => (
                <div key={item.key}>
                  <label className="mb-1 block text-xs font-bold">{item.label}</label>
                  <input
                    type="url"
                    dir="ltr"
                    value={socialDraft[item.key as keyof typeof socialDraft]}
                    onChange={(e) =>
                      setSocialDraft((prev) => ({
                        ...prev,
                        [item.key]: e.target.value,
                      }))
                    }
                    className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-xs font-mono-tabular outline-none"
                  />
                </div>
              ))}
            </div>

            {/* Automatic Server-Side Gemini Status (no API key input UI per security policy) */}
            <div className="tech-surface-muted flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="font-extrabold">
                    {lang === 'ar'
                      ? 'مساعد خدمة العملاء الذكي (Gemini AI)'
                      : 'Smart AI Customer Service (Gemini AI)'}
                  </p>
                  <p className="tech-text-secondary">
                    {lang === 'ar'
                      ? 'يدار بأمان عبر متغيرات الخادم دون كشف المفاتيح في المتصفح'
                      : 'Managed securely server-side with zero key exposure in browser'}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-bold ${
                  aiStatus.configured
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : 'bg-amber-500/15 text-amber-500'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>
                  {aiStatus.configured
                    ? `${aiStatus.model} Connected`
                    : 'Server Standby Mode'}
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                onSaveStoreData(
                  {
                    ...storeData,
                    branch: branchDraft,
                    socialLinks: socialDraft,
                  },
                  lang === 'ar'
                    ? 'تم حفظ الأرقام وروابط التواصل بنجاح.'
                    : 'Phones & social links saved.'
                )
              }
              className="tech-accent-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold"
            >
              <Save className="h-4 w-4" />
              <span>{lang === 'ar' ? 'حفظ الأرقام والروابط' : 'Save Phones & Social Links'}</span>
            </button>
          </div>

          {/* OS Download Center Links CRUD */}
          <div className="tech-surface rounded-2xl border p-5 shadow-sm space-y-4">
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <MonitorDown className="h-5 w-5 text-blue-500" />
              <span>
                {lang === 'ar'
                  ? 'إدارة روابط مركز تحديثات وتحميل الأنظمة (للكمبيوتر)'
                  : 'Official OS Download Center Links'}
              </span>
            </h3>

            <form onSubmit={handleAddOsDownload} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end">
              <input
                type="text"
                required
                value={newOsTitleAr}
                onChange={(e) => setNewOsTitleAr(e.target.value)}
                placeholder={lang === 'ar' ? 'العنوان (عربي)' : 'Title (AR)'}
                className="tech-surface-muted rounded-xl border px-3 py-2 text-xs outline-none"
              />
              <input
                type="text"
                value={newOsTitleEn}
                onChange={(e) => setNewOsTitleEn(e.target.value)}
                placeholder={lang === 'ar' ? 'العنوان (إنجليزي)' : 'Title (EN)'}
                className="tech-surface-muted rounded-xl border px-3 py-2 text-xs outline-none"
              />
              <select
                value={newOsVendor}
                onChange={(e) => setNewOsVendor(e.target.value as OSDownloadItem['vendor'])}
                className="tech-surface-muted rounded-xl border px-3 py-2 text-xs font-bold outline-none"
              >
                <option value="Microsoft">Microsoft</option>
                <option value="Apple">Apple</option>
                <option value="NVIDIA">NVIDIA</option>
                <option value="AMD">AMD</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="url"
                required
                dir="ltr"
                value={newOsUrl}
                onChange={(e) => setNewOsUrl(e.target.value)}
                placeholder="https://..."
                className="tech-surface-muted rounded-xl border px-3 py-2 text-xs font-mono-tabular outline-none"
              />
              <button
                type="submit"
                className="tech-accent-btn rounded-xl px-4 py-2 text-xs font-extrabold"
              >
                {lang === 'ar' ? 'إضافة رابط' : 'Add Link'}
              </button>
            </form>

            <div className="space-y-2">
              {storeData.osDownloads.map((osItem) => (
                <div
                  key={osItem.id}
                  className="tech-surface-muted flex items-center justify-between gap-3 rounded-xl border p-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-extrabold truncate">
                      [{osItem.vendor}] {lang === 'ar' ? osItem.titleAr : osItem.titleEn}
                    </p>
                    <p className="tech-text-secondary truncate font-mono-tabular" dir="ltr">
                      {osItem.officialUrl}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteOsDownload(osItem.id)}
                    className="shrink-0 font-bold text-rose-500 hover:underline"
                  >
                    {lang === 'ar' ? 'حذف' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BRANCH LOCATION & 10-DIGIT ADMIN PIN */}
      {activeTab === 'branch' && (
        <form
          onSubmit={handleUpdatePin}
          className="tech-surface rounded-2xl border p-5 shadow-sm space-y-5"
        >
          <div className="space-y-4">
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <span>{lang === 'ar' ? 'موقع الفرع وساعات العمل' : 'Branch Location & Hours'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'عنوان الفرع (عربي)' : 'Address (AR)'}
                </label>
                <input
                  type="text"
                  value={branchDraft.addressAr}
                  onChange={(e) =>
                    setBranchDraft((prev) => ({ ...prev, addressAr: e.target.value }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'عنوان الفرع (إنجليزي)' : 'Address (EN)'}
                </label>
                <input
                  type="text"
                  value={branchDraft.addressEn}
                  onChange={(e) =>
                    setBranchDraft((prev) => ({ ...prev, addressEn: e.target.value }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'رابط الخريطة (Google Maps)' : 'Google Maps URL'}
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={branchDraft.branchMapUrl}
                  onChange={(e) =>
                    setBranchDraft((prev) => ({ ...prev, branchMapUrl: e.target.value }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-xs font-mono-tabular outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'مواعيد العمل (عربي)' : 'Working Hours (AR)'}
                </label>
                <input
                  type="text"
                  value={branchDraft.workingHoursAr}
                  onChange={(e) =>
                    setBranchDraft((prev) => ({ ...prev, workingHoursAr: e.target.value }))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-inherit pt-4 space-y-3">
            <h3 className="text-base font-extrabold flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-500" />
              <span>
                {lang === 'ar'
                  ? 'الرمز السري للدخول إلى الإدارة (10 أرقام)'
                  : '10-Digit Admin Security PIN'}
              </span>
            </h3>
            <p className="tech-text-secondary text-xs">
              {lang === 'ar'
                ? `الرمز الافتراضي الأولي: ${DEFAULT_STORE_DATA.adminPin} — يمكنك تغييره إلى أي 10 أرقام.`
                : `Initial default PIN: ${DEFAULT_STORE_DATA.adminPin} — change to any 10 digits.`}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'الرمز السري الجديد (10 أرقام)' : 'New 10-Digit PIN'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={10}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm font-mono-tabular tracking-widest outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'تأكيد الرمز السري' : 'Confirm 10-Digit PIN'}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={10}
                  value={confirmPin}
                  onChange={(e) =>
                    setConfirmPin(e.target.value.replace(/[^\d]/g, '').slice(0, 10))
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3 py-2 text-sm font-mono-tabular tracking-widest outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="tech-accent-btn inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-extrabold"
          >
            <Save className="h-4 w-4" />
            <span>
              {lang === 'ar' ? 'حفظ موقع الفرع والرمز السري' : 'Save Branch & Security PIN'}
            </span>
          </button>
        </form>
      )}
    </section>
  );
};
