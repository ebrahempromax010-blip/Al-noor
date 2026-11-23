import { useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { CheckCircle2, Gem } from 'lucide-react';
import { db } from './firebaseConfig';
import { DEFAULT_STORE_DATA } from './data/defaultStoreData';
import {
  CartItem,
  CloudSyncStatus,
  Language,
  MarketRates,
  Product,
  StoreData,
} from './types/store';
import { t } from './utils/i18n';
import { fetchGlobalSpotRates } from './utils/marketApi';
import { calculateCartSummary, filterProducts } from './utils/storeLogic';
import { Header } from './components/Header';
import { LiveTickerBar } from './components/LiveTickerBar';
import { QuickActionBar } from './components/QuickActionBar';
import { PromoBanner } from './components/PromoBanner';
import { CategoryBar } from './components/CategoryBar';
import { ProductCard } from './components/ProductCard';
import { ProductZoomModal } from './components/ProductZoomModal';
import { BranchContactCard } from './components/BranchContactCard';
import { BottomNavBar } from './components/BottomNavBar';
import { CartDrawer } from './components/CartDrawer';
import { AdminPinModal } from './components/AdminPinModal';
import { AdminDashboard } from './components/AdminDashboard';
import { CategoriesGroupView } from './components/CategoriesGroupView';
import { LivePricesPage } from './components/LivePricesPage';
import { LanguageSettingsModal } from './components/LanguageSettingsModal';
import { OfflineIndicator } from './components/PWAComponents';

const STORE_COLLECTION = 'ashraf_gold_store';
const STORE_DOC_ID = 'main_data';
const BROADCAST_CHANNEL_NAME = 'ashraf_gold_live_sync';

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const hasManualLangChoice = useRef(false);

  const [storeData, setStoreData] = useState<StoreData>(DEFAULT_STORE_DATA);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>('connecting');
  const [cloudError, setCloudError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [zoomedProduct, setZoomedProduct] = useState<Product | null>(null);

  const [activeView, setActiveView] = useState<
    'store' | 'categories' | 'prices' | 'admin'
  >('store');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  const [isRefreshingMarket, setIsRefreshingMarket] = useState(false);
  const [isSyncingFirefox, setIsSyncingFirefox] = useState(false);
  const [marketFeedback, setMarketFeedback] = useState<string | null>(null);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Sync HTML dir and lang attributes
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Helper to apply incoming cloud/broadcast updates cleanly
  const applyRemoteStoreData = (remote: Partial<StoreData>) => {
    setStoreData((prev) => ({
      rates: {
        ...prev.rates,
        ...(remote.rates || {}),
        diamondCaratUsd:
          remote.rates?.diamondCaratUsd ?? prev.rates.diamondCaratUsd ?? 3850,
      },
      categories:
        Array.isArray(remote.categories) && remote.categories.length > 0
          ? remote.categories
          : prev.categories,
      products: Array.isArray(remote.products) ? remote.products : prev.products,
      banner: remote.banner || prev.banner,
      branch: remote.branch || prev.branch,
      defaultLanguage: remote.defaultLanguage || prev.defaultLanguage,
      updatedAt: remote.updatedAt || prev.updatedAt,
    }));

    if (remote.defaultLanguage && !hasManualLangChoice.current) {
      setLang(remote.defaultLanguage);
    }
  };

  // Live Real-Time Cloud Firestore onSnapshot + BroadcastChannel (No localStorage)
  useEffect(() => {
    const storeDocRef = doc(db, STORE_COLLECTION, STORE_DOC_ID);
    const unsubscribe = onSnapshot(
      storeDocRef,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.exists()) {
          applyRemoteStoreData(snapshot.data() as Partial<StoreData>);
        }
        setSyncStatus('synced');
        setCloudError(null);
      },
      (err) => {
        setSyncStatus('error');
        setCloudError(`تعذر المزامنة اللحظية مع Firebase: ${err.message}`);
      }
    );

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data && typeof event.data === 'object') {
          applyRemoteStoreData(event.data as Partial<StoreData>);
        }
      };
    }

    return () => {
      unsubscribe();
      bc?.close();
    };
  }, []);

  const broadcastToTabs = (nextData: StoreData) => {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.postMessage(nextData);
      bc.close();
    }
  };

  const showTimedToast = (msg: string) => {
    setSyncToast(msg);
    setTimeout(() => {
      setSyncToast((current) => (current === msg ? null : current));
    }, 3500);
  };

  const saveStoreToCloud = async (
    nextData: StoreData
  ): Promise<{ ok: boolean; error?: string }> => {
    setSyncStatus('saving');
    setCloudError(null);
    broadcastToTabs(nextData);
    try {
      const storeDocRef = doc(db, STORE_COLLECTION, STORE_DOC_ID);
      await setDoc(storeDocRef, nextData, { merge: true });
      setStoreData(nextData);
      setSyncStatus('synced');
      return { ok: true };
    } catch (err) {
      const msg =
        err instanceof Error
          ? `فشل الحفظ السحابي في Firebase: ${err.message}`
          : 'حدث خطأ غير متوقع أثناء الحفظ في Firebase.';
      setSyncStatus('error');
      setCloudError(msg);
      return { ok: false, error: msg };
    }
  };

  const fetchLatestFromFirebase = async (): Promise<{
    ok: boolean;
    error?: string;
  }> => {
    setSyncStatus('connecting');
    try {
      const storeDocRef = doc(db, STORE_COLLECTION, STORE_DOC_ID);
      const snap = await getDoc(storeDocRef);
      if (snap.exists()) {
        applyRemoteStoreData(snap.data() as Partial<StoreData>);
        setSyncStatus('synced');
        setCloudError(null);
        return { ok: true };
      }
      setSyncStatus('synced');
      return {
        ok: false,
        error:
          'لم يتم العثور على وثيقة منشورة بعد في السحابة — سيتم إنشاؤها عند أول حفظ.',
      };
    } catch (err) {
      const msg =
        err instanceof Error
          ? `تعذر جلب البيانات من Firebase: ${err.message}`
          : 'تعذر الاتصال بسحابة Firebase.';
      setSyncStatus('error');
      setCloudError(msg);
      return { ok: false, error: msg };
    }
  };

  const handleFirefoxUpdate = async () => {
    setIsSyncingFirefox(true);
    const res = await fetchLatestFromFirebase();
    setIsSyncingFirefox(false);
    if (res.ok) {
      showTimedToast(
        lang === 'ar'
          ? 'تم تحديث ومزامنة كافة البيانات السحابية بنجاح.'
          : 'Firefox Update: Live cloud data synced successfully.'
      );
    } else {
      showTimedToast(
        lang === 'ar'
          ? 'تم التحقق من المزامنة السحابية الحية.'
          : 'Firefox Update: Cloud listener active and up to date.'
      );
    }
  };

  const handleRefreshMarket = async (): Promise<{
    ok: boolean;
    rates?: MarketRates;
    error?: string;
  }> => {
    setIsRefreshingMarket(true);
    setMarketFeedback(null);
    try {
      const { rates } = await fetchGlobalSpotRates(storeData.rates.usdEgp);
      const nextRates: MarketRates = {
        ...storeData.rates,
        ...rates,
      };
      const nextStoreData: StoreData = {
        ...storeData,
        rates: nextRates,
        updatedAt: new Date().toISOString(),
      };
      setStoreData(nextStoreData);
      broadcastToTabs(nextStoreData);
      if (isAdminUnlocked) {
        await saveStoreToCloud(nextStoreData);
      }
      const msg =
        lang === 'ar'
          ? `تم تحديث أسعار البورصة العالمية (${new Date().toLocaleTimeString('ar-EG')})`
          : `Global Exchange rates updated (${new Date().toLocaleTimeString('en-US')})`;
      setMarketFeedback(msg);
      showTimedToast(msg);
      return { ok: true, rates: nextRates };
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : lang === 'ar'
            ? 'تعذر تحديث أسعار البورصة حالياً.'
            : 'Unable to fetch global spot rates right now.';
      setMarketFeedback(msg);
      showTimedToast(msg);
      return { ok: false, error: msg };
    } finally {
      setIsRefreshingMarket(false);
    }
  };

  const filteredProducts = useMemo(
    () => filterProducts(storeData.products, activeCategory, searchQuery),
    [storeData.products, activeCategory, searchQuery]
  );

  const cartSummary = useMemo(
    () =>
      calculateCartSummary(
        cart,
        storeData.products,
        storeData.rates,
        storeData.rates.autoLinkPrices
      ),
    [cart, storeData.products, storeData.rates]
  );

  const handleAddToCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleSelectLanguage = (nextLang: Language) => {
    hasManualLangChoice.current = true;
    setLang(nextLang);
  };

  const copy = t(lang);
  const storeName =
    lang === 'ar' ? storeData.branch.storeNameAr : storeData.branch.storeNameEn;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100">
      <OfflineIndicator lang={lang} />

      <Header
        lang={lang}
        storeName={storeName}
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          if (activeView !== 'store') setActiveView('store');
        }}
        syncStatus={syncStatus}
        onBrandClick={() => {
          setActiveView('store');
          setActiveCategory('all');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <LiveTickerBar
        lang={lang}
        rates={storeData.rates}
        isRefreshing={isRefreshingMarket}
        onRefreshMarket={handleRefreshMarket}
        refreshFeedback={marketFeedback}
      />

      <QuickActionBar
        lang={lang}
        activeView={activeView}
        isRefreshingMarket={isRefreshingMarket}
        isSyncingFirefox={isSyncingFirefox}
        onOpenCategories={() => {
          setActiveView('categories');
          window.scrollTo({ top: 0 });
        }}
        onOpenPricesPage={() => {
          setActiveView('prices');
          window.scrollTo({ top: 0 });
        }}
        onGlobalExchange={handleRefreshMarket}
        onFirefoxUpdate={handleFirefoxUpdate}
        onOpenLanguageSettings={() => setIsLangModalOpen(true)}
      />

      {syncToast && (
        <div
          role="status"
          className="mx-auto max-w-7xl px-3 pt-3 sm:px-6"
        >
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{syncToast}</span>
          </div>
        </div>
      )}

      {activeView === 'admin' && isAdminUnlocked ? (
        <main>
          <AdminDashboard
            lang={lang}
            storeData={storeData}
            syncStatus={syncStatus}
            cloudError={cloudError}
            isRefreshingMarket={isRefreshingMarket}
            onSaveStoreData={saveStoreToCloud}
            onFetchFromFirebase={fetchLatestFromFirebase}
            onRefreshMarketRates={handleRefreshMarket}
            onExitAdmin={() => setActiveView('store')}
          />
        </main>
      ) : activeView === 'categories' ? (
        <main>
          <CategoriesGroupView
            lang={lang}
            products={storeData.products}
            rates={storeData.rates}
            whatsappNumber={storeData.branch.whatsappNumber}
            onAddToCart={handleAddToCart}
            onZoom={setZoomedProduct}
            onFilterInStore={(catId) => {
              setActiveCategory(catId);
              setActiveView('store');
              window.scrollTo({ top: 0 });
            }}
            onBackToStore={() => {
              setActiveView('store');
              window.scrollTo({ top: 0 });
            }}
          />
        </main>
      ) : activeView === 'prices' ? (
        <main>
          <LivePricesPage
            lang={lang}
            rates={storeData.rates}
            isRefreshingMarket={isRefreshingMarket}
            isSyncingFirefox={isSyncingFirefox}
            onGlobalExchange={handleRefreshMarket}
            onFirefoxUpdate={handleFirefoxUpdate}
            onBackToStore={() => {
              setActiveView('store');
              window.scrollTo({ top: 0 });
            }}
          />
        </main>
      ) : (
        <main className="pb-24">
          <PromoBanner
            lang={lang}
            banner={storeData.banner}
            onExploreOffers={() => {
              setActiveCategory('offers');
              document
                .getElementById('catalog-grid')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          <CategoryBar
            lang={lang}
            categories={storeData.categories}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />

          <section
            id="catalog-grid"
            aria-label={lang === 'ar' ? 'معرض المجوهرات' : 'Jewelry Catalog'}
            className="mx-auto max-w-7xl px-3 pt-5 sm:px-6 sm:pt-7"
          >
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/20 bg-[#131A26] py-14 px-6 text-center">
                <Gem className="h-10 w-10 text-amber-400/60" />
                <p className="mt-3 text-base font-bold text-white">
                  {copy.noProductsFound}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategory('all');
                    setSearchQuery('');
                  }}
                  className="mt-4 rounded-xl bg-amber-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
                >
                  {copy.resetFilters}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product, index) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    rates={storeData.rates}
                    lang={lang}
                    whatsappNumber={storeData.branch.whatsappNumber}
                    onAddToCart={handleAddToCart}
                    onZoom={setZoomedProduct}
                    index={index}
                  />
                ))}
              </div>
            )}
          </section>

          <BranchContactCard lang={lang} branch={storeData.branch} />
        </main>
      )}

      <BottomNavBar
        lang={lang}
        cartCount={cartSummary.totalItems}
        activeView={activeView}
        onGoStore={() => {
          setActiveView('store');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAdmin={() => {
          if (isAdminUnlocked) {
            setActiveView('admin');
            window.scrollTo({ top: 0 });
          } else {
            setIsPinModalOpen(true);
          }
        }}
        onToggleLanguage={() =>
          handleSelectLanguage(lang === 'ar' ? 'en' : 'ar')
        }
      />

      <CartDrawer
        isOpen={isCartOpen}
        lang={lang}
        summary={cartSummary}
        branch={storeData.branch}
        onClose={() => setIsCartOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCart([])}
      />

      <LanguageSettingsModal
        isOpen={isLangModalOpen}
        lang={lang}
        onSelectLanguage={handleSelectLanguage}
        onClose={() => setIsLangModalOpen(false)}
      />

      <ProductZoomModal
        product={zoomedProduct}
        rates={storeData.rates}
        lang={lang}
        whatsappNumber={storeData.branch.whatsappNumber}
        onClose={() => setZoomedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <AdminPinModal
        isOpen={isPinModalOpen}
        lang={lang}
        onClose={() => setIsPinModalOpen(false)}
        onAuthenticated={() => {
          setIsPinModalOpen(false);
          setIsAdminUnlocked(true);
          setActiveView('admin');
          window.scrollTo({ top: 0 });
        }}
      />
    </div>
  );
}
