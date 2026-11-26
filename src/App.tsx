import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, STORE_DOC_PATH } from './firebaseConfig.js';
import { DEFAULT_STORE_DATA } from './data/defaultStoreData';
import {
  CartItem,
  CatalogCategoryTab,
  CatalogSortOption,
  ChatMessage,
  CustomerOrder,
  Language,
  MainNavTab,
  Product,
  RestockWatchRequest,
  StoreData,
  ThemeMode,
} from './types/store';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';
import {
  applyRemoteStoreData,
  findRestockMatches,
  formatWhatsappOrderMessage,
  getEffectiveSiteIdentity,
  isDesktopDevice,
  sanitizeStoreDataForCloud,
} from './utils/storeLogic';
import { resolveInstallClickAction, type InstallPlatform } from './utils/pwaLogic';
import { syncDynamicPwaBranding } from './utils/pwaBrandingSync';
import { Header } from './components/Header';
import { InstallGuideModal, OfflineBanner } from './components/PWAComponents';
import {
  DesktopOnlyNoticeModal,
  SystemUpdateTickerBar,
} from './components/SystemUpdateTickerBar';
import { OSDownloadCenterModal } from './components/OSDownloadCenterModal';
import { HomeStorefront } from './components/HomeStorefront';
import { CatalogView } from './components/CatalogView';
import { CartView } from './components/CartView';
import { ProductZoomModal } from './components/ProductZoomModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton';
import { BottomNavBar } from './components/BottomNavBar';
import { AdminPinModal } from './components/AdminPinModal';
import { AdminDashboard } from './components/AdminDashboard';

const STORE_LOCAL_CACHE_KEY = 'alnour_store_cache_v1';

function readCachedStoreData(): StoreData {
  try {
    const raw = window.localStorage.getItem(STORE_LOCAL_CACHE_KEY);
    if (raw) {
      return applyRemoteStoreData(JSON.parse(raw) as Partial<StoreData>);
    }
  } catch {
    // Ignore invalid local cache
  }
  return DEFAULT_STORE_DATA;
}

export default function App() {
  const [storeData, setStoreData] = useState<StoreData>(() =>
    typeof window !== 'undefined' ? readCachedStoreData() : DEFAULT_STORE_DATA
  );
  const [lang, setLang] = useState<Language>('ar');
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [selectedWallpaperUrl, setSelectedWallpaperUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<MainNavTab>('home');
  const [catalogCategory, setCatalogCategory] = useState<CatalogCategoryTab>('all');
  const [catalogSort, setCatalogSort] = useState<CatalogSortOption>('latest');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Product Zoom
  const [cart, setCart] = useState<CartItem[]>([]);
  const [zoomProduct, setZoomProduct] = useState<Product | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  // Modals: PWA Install, OS Downloads Center / Mobile Alert, User Settings + AI, Admin PIN
  const { isInstallable, isInstalled, platform, isInIframe, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [installModalMode, setInstallModalMode] = useState<InstallPlatform | null>(null);
  const [osCenterOpen, setOsCenterOpen] = useState(false);
  const [mobileBlockedAlertOpen, setMobileBlockedAlertOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPinOpen, setAdminPinOpen] = useState(false);

  // Cloud Sync State
  const [savingCloud, setSavingCloud] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // AI Customer Service + Restock Notification Watcher State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-ai',
      role: 'assistant',
      text: 'أهلاً بك يا فندم في النور للكمبيوتر (Al-Nour Computer)! معاك مستشارك الذكي.\nاحكيلي بتدور على جهاز لإيه (ألعاب، هندسة ومونتاج، برمجة وشغل، أو إكسسوارات) وميزانيتك التقريبية كام، وهقارنلك الأنسب وأرشحلك أفضل اختيار بأسلوب واضح وبسيط.',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [restockWatchlist, setRestockWatchlist] = useState<RestockWatchRequest[]>([]);
  const [unreadRestockCount, setUnreadRestockCount] = useState(0);

  const toastTimerRef = useRef<number | null>(null);
  const initAttemptedRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg('');
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Close topmost open modal on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (adminPinOpen) setAdminPinOpen(false);
      else if (settingsOpen) setSettingsOpen(false);
      else if (zoomProduct) setZoomProduct(null);
      else if (osCenterOpen) setOsCenterOpen(false);
      else if (mobileBlockedAlertOpen) setMobileBlockedAlertOpen(false);
      else if (installModalMode) setInstallModalMode(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    adminPinOpen,
    settingsOpen,
    zoomProduct,
    osCenterOpen,
    mobileBlockedAlertOpen,
    installModalMode,
  ]);

  // Apply RTL/LTR & 4-Theme DOM classes cleanly
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-light', 'theme-evening', 'theme-dark', 'theme-night', 'dark');
    html.classList.add(`theme-${theme}`);
    if (theme !== 'light') {
      html.classList.add('dark');
    }
  }, [theme]);

  // Dynamic <title> & favicon synced with store settings
  const identity = useMemo(
    () => getEffectiveSiteIdentity(storeData.settings, lang),
    [storeData.settings, lang]
  );
  useEffect(() => {
    document.title = `${identity.storeName} — ${identity.tagline}`;
  }, [identity.storeName, identity.tagline]);

  // Sync dynamic PWA English launcher name & icon to Express manifest/icons endpoints & DOM
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void syncDynamicPwaBranding({
        storeNameEn: storeData.settings.storeNameEn,
        taglineEn: storeData.settings.taglineEn,
        storeIconUrl: storeData.settings.storeIconUrl,
      });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [
    storeData.settings.storeNameEn,
    storeData.settings.taglineEn,
    storeData.settings.storeIconUrl,
  ]);

  // Live Firebase Cloud Firestore real-time synchronization (cleaned up cleanly on unmount)
  useEffect(() => {
    let isMounted = true;
    const storeDocRef = doc(db, STORE_DOC_PATH);
    const unsubscribe = onSnapshot(
      storeDocRef,
      (snapshot) => {
        if (!isMounted) return;
        if (snapshot.exists()) {
          const nextData = applyRemoteStoreData(snapshot.data() as Partial<StoreData>);
          setStoreData(nextData);
          try {
            window.localStorage.setItem(STORE_LOCAL_CACHE_KEY, JSON.stringify(nextData));
          } catch {
            // Ignore quota errors
          }
          setCloudError(null);
        } else if (!initAttemptedRef.current) {
          initAttemptedRef.current = true;
          const cleanInit = sanitizeStoreDataForCloud(DEFAULT_STORE_DATA, 'ar');
          setDoc(storeDocRef, cleanInit, { merge: true }).catch((err) => {
            if (isMounted) {
              console.error('Firestore init write error:', err);
            }
          });
        }
      },
      (err) => {
        if (!isMounted) return;
        console.error('Firestore onSnapshot error:', err);
        setCloudError(err.message);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Restock Watch Matcher: detects when Admin adds/restocks a product matching a customer request
  useEffect(() => {
    const pendingWatches = restockWatchlist.filter((w) => !w.notified);
    if (pendingWatches.length === 0) return;

    const matches = findRestockMatches(storeData.products, pendingWatches);
    if (matches.length === 0) return;

    const matchedWatchIds = new Set(matches.map((m) => m.watchId));
    setRestockWatchlist((prev) =>
      prev.map((w) => {
        const hit = matches.find((m) => m.watchId === w.id);
        return hit ? { ...w, notified: true, notifiedProductId: hit.product.id } : w;
      })
    );

    const newAlerts: ChatMessage[] = matches.map((m) => ({
      id: `restock-${m.watchId}-${Date.now()}`,
      role: 'assistant',
      isRestockAlert: true,
      text:
        lang === 'ar'
          ? `بشرى سارة! توفر الآن المنتج الذي سألت عنه: "${m.product.nameAr}" بسعر ${m.product.price.toLocaleString('en-US')} ${storeData.settings.currency}. يمكنك طلبه الآن من المتجر!`
          : `Good news! "${m.product.nameEn}" is now back in stock at ${m.product.price.toLocaleString('en-US')} ${storeData.settings.currency}.`,
      createdAt: new Date().toISOString(),
    }));

    setChatMessages((prev) => [...prev, ...newAlerts]);
    setUnreadRestockCount((prev) => prev + matchedWatchIds.size);
  }, [storeData.products, restockWatchlist, lang, storeData.settings.currency]);

  const handleSaveStoreData = useCallback(
    async (nextData: StoreData, successMsg: string) => {
      setSavingCloud(true);
      setCloudError(null);
      try {
        const sanitized = sanitizeStoreDataForCloud(nextData, lang);
        const storeDocRef = doc(db, STORE_DOC_PATH);
        await setDoc(storeDocRef, sanitized, { merge: true });
        setStoreData(applyRemoteStoreData(sanitized));
        showToast(successMsg);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Firebase sync error';
        setCloudError(message);
        throw err;
      } finally {
        setSavingCloud(false);
      }
    },
    [lang, showToast]
  );

  // Add/Update Cart (memoized callbacks prevent ProductCard re-renders)
  const handleAddToCart = useCallback(
    (product: Product) => {
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
          );
        }
        return [...prev, { productId: product.id, quantity: 1 }];
      });
      showToast(
        lang === 'ar'
          ? `تمت إضافة "${product.nameAr}" إلى السلة`
          : `Added "${product.nameEn}" to cart`
      );
    },
    [lang, showToast]
  );

  const handleUpdateQty = useCallback((productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const handleRemoveFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  // Order Submission: opens customer's WhatsApp with pre-filled message & saves order in Firestore
  const handleSubmitOrder = async (order: CustomerOrder) => {
    const formattedMessage = order.whatsappMessageText || formatWhatsappOrderMessage(order);
    let enrichedOrder: CustomerOrder = {
      ...order,
      whatsappDispatchStatus: order.whatsappDispatchStatus || 'opened_whatsapp_client',
      whatsappMessageText: formattedMessage,
    };

    if (storeData.branch.orderWebhookUrl && storeData.branch.orderWebhookUrl.trim()) {
      try {
        await fetch('/api/orders/dispatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: order.id,
            customerName: order.customerName,
            customerAddress: order.customerAddress,
            customerPhone: order.customerPhone,
            note: order.note,
            total: order.total,
            currency: order.currency,
            items: order.items,
            targetWhatsappNumber:
              storeData.branch.secretOrdersPhone ||
              storeData.branch.publicWhatsappNumber ||
              '201025134582',
            webhookUrl: storeData.branch.orderWebhookUrl,
          }),
        });
      } catch {
        // Firestore persistence + customer WhatsApp remain primary
      }
    }

    const nextOrders = [enrichedOrder, ...(storeData.orders || [])];
    await handleSaveStoreData(
      {
        ...storeData,
        orders: nextOrders,
      },
      lang === 'ar'
        ? 'تم فتح واتساب لإرسال طلبك وحفظ نسخة في المتجر!'
        : 'WhatsApp opened with your order & saved in store!'
    );

    setCart([]);
  };

  const handleInstallClick = async () => {
    const action = resolveInstallClickAction({
      platform,
      hasNativePrompt: isInstallable,
      isStandalone: isInstalled,
    });
    if (action === 'already_installed') return;
    if (action === 'show_ios_guide') {
      setInstallModalMode('ios');
      return;
    }

    // Attempt instant native OS install on Android & Computer (also waits briefly for early SW prompt)
    const accepted = await install();
    if (accepted) {
      setInstallModalMode(null);
      showToast(
        lang === 'ar'
          ? 'تم تثبيت التطبيق بنجاح على جهازك!'
          : 'App installed directly onto your device!'
      );
      return;
    }

    setInstallModalMode(platform === 'android' ? 'android' : 'desktop');
  };

  // Support ?autoinstall=1 when opened directly in browser tab from iframe preview
  useEffect(() => {
    if (typeof window === 'undefined' || isInstalled) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoinstall') === '1') {
      setInstallModalMode(platform);
    }
  }, [platform, isInstalled]);

  const handleSystemTickerClick = () => {
    const desktop = isDesktopDevice(
      window.navigator.userAgent,
      window.navigator.maxTouchPoints || 0,
      window.innerWidth
    );
    if (desktop) {
      setOsCenterOpen(true);
    } else {
      setMobileBlockedAlertOpen(true);
    }
  };

  const handleBottomNavSelect = useCallback(
    (tab: MainNavTab) => {
      if (tab === 'admin') {
        if (adminUnlocked) {
          setActiveTab('admin');
        } else {
          setAdminPinOpen(true);
        }
        return;
      }
      setActiveTab(tab);
    },
    [adminUnlocked]
  );

  const handleNavigateCatalog = useCallback((cat: CatalogCategoryTab) => {
    setCatalogCategory(cat);
    setActiveTab('catalog');
  }, []);

  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);
  const handleClearUnreadRestock = useCallback(() => setUnreadRestockCount(0), []);
  const handleAppendChatMessage = useCallback(
    (msg: ChatMessage) => setChatMessages((prev) => [...prev, msg]),
    []
  );
  const handleResetChat = useCallback(() => {
    setChatMessages([
      {
        id: `welcome-ai-${Date.now()}`,
        role: 'assistant',
        text:
          lang === 'ar'
            ? 'أهلاً بك من جديد! قولي بتدور على إيه دلوقتي أو ميزانيتك كام وهساعدك فوراً.'
            : 'Fresh conversation started! Tell me what setup or budget you have in mind and I will guide you.',
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [lang]);
  const handleRegisterRestockWatch = useCallback(
    (watch: RestockWatchRequest) => setRestockWatchlist((prev) => [...prev, watch]),
    []
  );

  const totalCartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  return (
    <div className="relative min-h-screen pb-24 transition-colors">
      {selectedWallpaperUrl && (
        <div
          aria-hidden="true"
          className="gpu-accelerated pointer-events-none fixed inset-0 -z-10 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(10,15,28,0.82), rgba(10,15,28,0.92)), url(${selectedWallpaperUrl})`,
          }}
        />
      )}
      <OfflineBanner isOnline={isOnline} lang={lang} />

      <SystemUpdateTickerBar
        lang={lang}
        updates={storeData.systemUpdates}
        onTickerClick={handleSystemTickerClick}
      />

      <Header
        lang={lang}
        storeName={identity.storeName}
        tagline={identity.tagline}
        iconUrl={identity.iconUrl}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q.trim() && activeTab === 'cart') {
            setActiveTab('catalog');
          }
        }}
        onToggleLanguage={() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar'))}
        onOpenSettings={() => setSettingsOpen(true)}
        unreadRestockCount={unreadRestockCount}
        isPWAInstalled={isInstalled}
        uploadedAppFiles={storeData.uploadedAppFiles}
        onInstallClick={handleInstallClick}
        onLogoClick={() => setActiveTab('home')}
      />

      <main className="min-h-[65vh]">
        {activeTab === 'home' && (
          <HomeStorefront
            lang={lang}
            storeData={storeData}
            searchQuery={searchQuery}
            onNavigateCatalog={handleNavigateCatalog}
            onAddToCart={handleAddToCart}
            onZoomProduct={setZoomProduct}
            onOpenSettingsAI={handleOpenSettings}
          />
        )}

        {activeTab === 'catalog' && (
          <CatalogView
            lang={lang}
            currency={storeData.settings.currency || 'ج.م'}
            layoutStyle={storeData.settings.layoutStyle}
            products={storeData.products}
            categoryTab={catalogCategory}
            sortBy={catalogSort}
            searchQuery={searchQuery}
            onCategoryChange={setCatalogCategory}
            onSortChange={setCatalogSort}
            onResetFilters={() => {
              setCatalogCategory('all');
              setCatalogSort('latest');
              setSearchQuery('');
            }}
            onAddToCart={handleAddToCart}
            onZoomProduct={setZoomProduct}
          />
        )}

        {activeTab === 'cart' && (
          <CartView
            lang={lang}
            currency={storeData.settings.currency || 'ج.م'}
            orderWhatsappNumber={
              storeData.branch.secretOrdersPhone ||
              storeData.branch.publicWhatsappNumber ||
              '201025134582'
            }
            cart={cart}
            products={storeData.products}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveFromCart}
            onBrowseCatalog={() => setActiveTab('catalog')}
            onSubmitOrder={handleSubmitOrder}
          />
        )}

        {activeTab === 'admin' && adminUnlocked && (
          <AdminDashboard
            lang={lang}
            storeData={storeData}
            savingCloud={savingCloud}
            cloudError={cloudError}
            onSaveStoreData={handleSaveStoreData}
            onLogout={() => {
              setAdminUnlocked(false);
              setActiveTab('home');
            }}
          />
        )}
      </main>

      {/* Small Circular Floating WhatsApp Button linked strictly to publicWhatsappNumber */}
      <FloatingWhatsAppButton
        lang={lang}
        publicWhatsappNumber={storeData.branch.publicWhatsappNumber}
      />

      {/* 4-Icon Bottom Navigation Bar */}
      <BottomNavBar
        lang={lang}
        activeTab={activeTab}
        cartCount={totalCartCount}
        onSelectTab={handleBottomNavSelect}
      />

      {/* Modals */}
      <InstallGuideModal
        open={installModalMode !== null}
        mode={installModalMode || platform}
        isInstalled={isInstalled}
        isInstallable={isInstallable}
        isInIframe={isInIframe}
        lang={lang}
        storeName={identity.storeName}
        uploadedAppFiles={storeData.uploadedAppFiles}
        onTriggerInstantInstall={() => void handleInstallClick()}
        onClose={() => setInstallModalMode(null)}
      />

      <OSDownloadCenterModal
        open={osCenterOpen}
        lang={lang}
        downloads={storeData.osDownloads}
        onClose={() => setOsCenterOpen(false)}
      />

      <DesktopOnlyNoticeModal
        open={mobileBlockedAlertOpen}
        lang={lang}
        message={
          lang === 'ar'
            ? 'مركز تحميل وتحديث أنظمة الويندوز والماك متاح فقط عند فتح الموقع من جهاز كمبيوتر'
            : 'The Windows & macOS official download and update center is only available when opening the site from a desktop computer.'
        }
        onClose={() => setMobileBlockedAlertOpen(false)}
      />

      <ProductZoomModal
        product={zoomProduct}
        lang={lang}
        currency={storeData.settings.currency || 'ج.م'}
        onClose={() => setZoomProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <UserSettingsModal
        open={settingsOpen}
        lang={lang}
        theme={theme}
        selectedWallpaperUrl={selectedWallpaperUrl}
        storeData={storeData}
        chatMessages={chatMessages}
        unreadRestockCount={unreadRestockCount}
        onClose={handleCloseSettings}
        onChangeTheme={setTheme}
        onSelectWallpaper={setSelectedWallpaperUrl}
        onAppendChatMessage={handleAppendChatMessage}
        onResetChat={handleResetChat}
        onRegisterRestockWatch={handleRegisterRestockWatch}
        onClearUnreadRestock={handleClearUnreadRestock}
        onAddToCart={handleAddToCart}
      />

      <AdminPinModal
        open={adminPinOpen}
        lang={lang}
        expectedPin={storeData.adminPin}
        onSuccess={() => {
          setAdminPinOpen(false);
          setAdminUnlocked(true);
          setActiveTab('admin');
        }}
        onClose={() => setAdminPinOpen(false)}
      />

      {toastMsg && (
        <div
          role="status"
          className="fixed bottom-24 start-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white shadow-xl border border-blue-500/30"
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}
