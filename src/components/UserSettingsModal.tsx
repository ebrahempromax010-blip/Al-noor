import React, { useEffect, useRef, useState } from 'react';
import {
  BellRing,
  Bot,
  Coins,
  ExternalLink,
  Image as ImageIcon,
  MapPin,
  Moon,
  Palette,
  RotateCcw,
  Send,
  Share2,
  ShoppingCart,
  Sparkles,
  Sun,
  Sunset,
  X,
} from 'lucide-react';
import {
  ChatGroundingSource,
  ChatMessage,
  ChatRecommendedProduct,
  Language,
  Product,
  RestockWatchRequest,
  StoreData,
  ThemeMode,
} from '../types/store';
import { normalizeSafeUrl } from '../utils/storeLogic';
import {
  buildRelativeRateTable,
  CurrencyCode,
  formatStorePriceDisplay,
  resolveBaseCurrencyCode,
} from '../utils/currencyLogic';
import { CurrencyConverterPanel } from './CurrencyConverterPanel';

interface UserSettingsModalProps {
  open: boolean;
  lang: Language;
  theme: ThemeMode;
  selectedWallpaperUrl: string;
  storeData: StoreData;
  chatMessages: ChatMessage[];
  unreadRestockCount: number;
  displayCurrency?: CurrencyCode;
  exchangeRates?: Record<CurrencyCode, number>;
  ratesSource?: 'live_api' | 'fallback_reference' | 'loading';
  ratesUpdatedAt?: string;
  refreshingRates?: boolean;
  onChangeDisplayCurrency?: (code: CurrencyCode) => void;
  onRefreshRates?: () => void;
  onClose: () => void;
  onChangeTheme: (theme: ThemeMode) => void;
  onSelectWallpaper: (url: string) => void;
  onAppendChatMessage: (msg: ChatMessage) => void;
  onResetChat?: () => void;
  onRegisterRestockWatch: (watch: RestockWatchRequest) => void;
  onClearUnreadRestock: () => void;
  onAddToCart?: (product: Product) => void;
}

type SettingsTab = 'ai' | 'currency' | 'theme' | 'wallpapers' | 'social';

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  open,
  lang,
  theme,
  selectedWallpaperUrl,
  storeData,
  chatMessages,
  unreadRestockCount,
  displayCurrency,
  exchangeRates,
  ratesSource = 'fallback_reference',
  ratesUpdatedAt = '',
  refreshingRates = false,
  onChangeDisplayCurrency,
  onRefreshRates,
  onClose,
  onChangeTheme,
  onSelectWallpaper,
  onAppendChatMessage,
  onResetChat,
  onRegisterRestockWatch,
  onClearUnreadRestock,
  onAddToCart,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('ai');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && activeTab === 'ai' && unreadRestockCount > 0) {
      onClearUnreadRestock();
    }
  }, [open, activeTab, unreadRestockCount, onClearUnreadRestock]);

  useEffect(() => {
    if (open && activeTab === 'ai') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [open, activeTab, chatMessages.length]);

  if (!open) return null;

  const baseCurrencyLabel = storeData.settings.currency || 'ج.م';
  const baseCode = resolveBaseCurrencyCode(baseCurrencyLabel);
  const activeCurrency: CurrencyCode = displayCurrency || baseCode;
  const activeRatesTable = exchangeRates || buildRelativeRateTable(baseCode, null);

  const sendMessageText = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
      createdAt: new Date().toISOString(),
    };
    onAppendChatMessage(userMsg);
    setInputText('');
    setSending(true);

    try {
      // Strictly send PUBLIC store context only (never adminPin, secretOrdersPhone, or orders)
      const nowMs = Date.now();
      const publicContext = {
        storeNameAr: storeData.settings.storeNameAr,
        storeNameEn: storeData.settings.storeNameEn,
        currency: storeData.settings.currency,
        branchAddress:
          lang === 'ar' ? storeData.branch.addressAr : storeData.branch.addressEn,
        workingHours:
          lang === 'ar' ? storeData.branch.workingHoursAr : storeData.branch.workingHoursEn,
        socialLinks: storeData.socialLinks,
        systemUpdates: storeData.systemUpdates.map((u) => ({
          badgeAr: u.badgeAr,
          badgeEn: u.badgeEn,
          textAr: u.textAr,
          textEn: u.textEn,
        })),
        osDownloads: storeData.osDownloads.map((osItem) => ({
          titleAr: osItem.titleAr,
          titleEn: osItem.titleEn,
          vendor: osItem.vendor,
          officialUrl: osItem.officialUrl,
        })),
        products: storeData.products.map((p) => {
          const createdMs = p.createdAt ? Date.parse(p.createdAt) : 0;
          const isRecent =
            !p.isDefault || (Number.isFinite(createdMs) && createdMs > 0 && nowMs - createdMs < 14 * 86400000);
          return {
            id: p.id,
            nameAr: p.nameAr,
            nameEn: p.nameEn,
            brand: p.brand,
            specsAr: p.specsAr,
            specsEn: p.specsEn,
            categoryGroup: p.categoryGroup,
            subType: p.subType,
            price: p.price,
            discountPercent: p.discountPercent,
            inStock: p.inStock,
            isFeatured: Boolean(p.isFeatured),
            isNewArrival: isRecent,
            isComingSoon: !p.inStock,
            createdAt: p.createdAt || '',
            imageUrl: p.imageUrl,
          };
        }),
        deletedProductsHistory: storeData.deletedProductsHistory.map((d) => ({
          id: d.id,
          nameAr: d.nameAr,
          nameEn: d.nameEn,
          specsSummary: d.specsSummary,
          deletedAt: d.deletedAt,
        })),
      };

      const historyPayload = chatMessages.slice(-8).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          lang,
          history: historyPayload,
          publicContext,
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        error?: string;
        unavailableRequested?: boolean;
        watchQuery?: string | null;
        matchedDeletedProductId?: string | null;
        recommendedProducts?: ChatRecommendedProduct[];
        sources?: ChatGroundingSource[];
      };

      const replyText =
        data.reply ||
        data.error ||
        (lang === 'ar'
          ? 'عذراً، واجهت مشكلة مؤقتة. حاول مرة أخرى.'
          : 'Sorry, a temporary issue occurred. Please try again.');

      const validSources = Array.isArray(data.sources)
        ? data.sources.filter((s) => Boolean(s?.uri && normalizeSafeUrl(s.uri)))
        : [];

      onAppendChatMessage({
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: replyText,
        createdAt: new Date().toISOString(),
        recommendedProducts: Array.isArray(data.recommendedProducts)
          ? data.recommendedProducts.slice(0, 4)
          : undefined,
        sources: validSources.length > 0 ? validSources : undefined,
      });

      if (data.unavailableRequested && data.watchQuery) {
        onRegisterRestockWatch({
          id: `watch-${Date.now()}`,
          query: data.watchQuery,
          matchedDeletedProductId: data.matchedDeletedProductId || null,
          createdAt: new Date().toISOString(),
          notified: false,
        });
      }
    } catch {
      onAppendChatMessage({
        id: `err-${Date.now()}`,
        role: 'assistant',
        text:
          lang === 'ar'
            ? 'تعذر الاتصال بخدمة العملاء الذكية حالياً، يرجى التحقق من اتصال الإنترنت.'
            : 'Unable to reach AI Customer Service right now. Please check your connection.',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessageText(inputText);
  };

  const quickPrompts =
    lang === 'ar'
      ? [
          'عايز مقارنة بين اللابتوبات المتاحة في حدود 80 ألف',
          'أنا مبرمج وبسافر كتير، إيه أنسب لابتوب ليا؟',
          'عنوان الفرع ومواعيد العمل فين؟',
          'هل متوفر كارت شاشة RTX 4090؟',
        ]
      : [
          'Compare laptops under 80,000 EGP for studio & gaming',
          'Best portable laptop for coding with long battery life?',
          'Where is your branch and what are working hours?',
          'Is RTX 4090 available right now?',
        ];

  const themes: Array<{
    id: ThemeMode;
    labelAr: string;
    labelEn: string;
    descAr: string;
    descEn: string;
    swatch: string;
    Icon: React.FC<{ className?: string }>;
  }> = [
    {
      id: 'light',
      labelAr: 'الوضع الفاتح',
      labelEn: 'Light Mode',
      descAr: 'إضاءة نهارية واضحة ومريحة للعين',
      descEn: 'Clean bright daylight surface',
      swatch: 'bg-slate-100 border-slate-300 text-slate-900',
      Icon: Sun,
    },
    {
      id: 'evening',
      labelAr: 'وضع المساء',
      labelEn: 'Evening Mode',
      descAr: 'درجة أردوازية دافئة متوازنة',
      descEn: 'Balanced warm twilight slate',
      swatch: 'bg-[#1e263b] border-sky-400/30 text-slate-100',
      Icon: Sunset,
    },
    {
      id: 'dark',
      labelAr: 'الوضع الداكن',
      labelEn: 'Dark Mode',
      descAr: 'وضع احترافي للأجهزة والمبرمجين',
      descEn: 'Crisp dark hardware interface',
      swatch: 'bg-slate-900 border-blue-500/30 text-white',
      Icon: Moon,
    },
    {
      id: 'night',
      labelAr: 'وضع الليل',
      labelEn: 'Deep Night',
      descAr: 'تباين ليلي عميق لشاشات OLED',
      descEn: 'Ultra-deep OLED night contrast',
      swatch: 'bg-[#03050a] border-cyan-400/40 text-cyan-50',
      Icon: Sparkles,
    },
  ];

  const socialItems = [
    { label: 'Facebook', url: storeData.socialLinks.facebookUrl },
    { label: 'YouTube', url: storeData.socialLinks.youtubeUrl },
    { label: 'Instagram', url: storeData.socialLinks.instagramUrl },
    { label: 'TikTok', url: storeData.socialLinks.tiktokUrl },
  ].filter((s) => Boolean(s.url && s.url.trim()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="tech-surface animate-panel-in flex h-[86vh] max-h-[700px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="user-settings-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-inherit px-5 py-3.5">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold">
              {lang === 'ar'
                ? 'إعدادات المتجر وخدمة العملاء الذكية'
                : 'Store Settings & AI Support'}
            </h2>
            <p className="tech-text-secondary text-xs">
              {lang === 'ar'
                ? 'تخصيص المظهر، الخلفيات، الروابط، والتحدث مع المساعد الذكي'
                : 'Customize theme, wallpaper, official links, and chat with AI'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'ai' && onResetChat && chatMessages.length > 1 && (
              <button
                type="button"
                onClick={onResetChat}
                data-testid="ai-chat-reset-btn"
                className="tech-surface-muted inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-extrabold transition hover:border-blue-500/40"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{lang === 'ar' ? 'محادثة جديدة' : 'New Chat'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
              className="tech-surface-muted rounded-xl border p-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-inherit px-4 py-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            data-testid="settings-tab-ai"
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
              activeTab === 'ai' ? 'tech-accent-btn' : 'tech-surface-muted border'
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>{lang === 'ar' ? 'خدمة العملاء الذكية' : 'AI Assistant'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('currency')}
            data-testid="settings-tab-currency"
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
              activeTab === 'currency' ? 'tech-accent-btn' : 'tech-surface-muted border'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>
              {lang === 'ar' ? `العملات (${activeCurrency})` : `Currency (${activeCurrency})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            data-testid="settings-tab-theme"
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
              activeTab === 'theme' ? 'tech-accent-btn' : 'tech-surface-muted border'
            }`}
          >
            <Palette className="h-4 w-4" />
            <span>{lang === 'ar' ? 'المظهر والألوان' : 'Themes'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wallpapers')}
            data-testid="settings-tab-wallpapers"
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
              activeTab === 'wallpapers' ? 'tech-accent-btn' : 'tech-surface-muted border'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            <span>{lang === 'ar' ? 'الخلفيات' : 'Wallpapers'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('social')}
            data-testid="settings-tab-social"
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
              activeTab === 'social' ? 'tech-accent-btn' : 'tech-surface-muted border'
            }`}
          >
            <Share2 className="h-4 w-4" />
            <span>{lang === 'ar' ? 'حسابات التواصل' : 'Social Links'}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'ai' && (
            <div className="flex h-full flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto pe-1 pb-3">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                        msg.isRestockAlert
                          ? 'border border-emerald-500/40 bg-emerald-500/15 font-bold'
                          : msg.role === 'user'
                            ? 'tech-accent-btn'
                            : 'tech-surface-muted border'
                      }`}
                    >
                      {msg.isRestockAlert && (
                        <div className="mb-1 flex items-center gap-1.5 text-emerald-500 font-extrabold text-xs">
                          <BellRing className="h-3.5 w-3.5" />
                          <span>
                            {lang === 'ar' ? 'إشعار توفر منتج!' : 'Restock Notification!'}
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">
                        {msg.text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) =>
                          part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
                            <strong key={idx} className="font-extrabold">
                              {part.slice(2, -2)}
                            </strong>
                          ) : (
                            <React.Fragment key={idx}>{part}</React.Fragment>
                          )
                        )}
                      </p>

                      {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-inherit pt-2.5">
                          {msg.recommendedProducts.map((rec) => {
                            const fullProduct = storeData.products.find((p) => p.id === rec.id);
                            return (
                              <div
                                key={rec.id}
                                data-testid={`ai-rec-product-${rec.id}`}
                                className="tech-surface flex items-center justify-between gap-2.5 rounded-xl border p-2"
                              >
                                <div className="flex min-w-0 items-center gap-2.5">
                                  {rec.imageUrl && (
                                    <img
                                      src={rec.imageUrl}
                                      alt={lang === 'ar' ? rec.nameAr : rec.nameEn}
                                      loading="lazy"
                                      decoding="async"
                                      className="h-11 w-11 shrink-0 rounded-lg object-cover border border-inherit"
                                    />
                                  )}
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-extrabold">
                                      {lang === 'ar' ? rec.nameAr : rec.nameEn}
                                    </p>
                                    <p className="font-mono-tabular text-[11px] font-bold text-blue-500">
                                      {(() => {
                                        const formattedRec = formatStorePriceDisplay(
                                          rec.finalPrice,
                                          baseCurrencyLabel,
                                          activeCurrency,
                                          activeRatesTable,
                                          lang
                                        );
                                        return `${formattedRec.formattedNumber} ${formattedRec.currencyUnit}`;
                                      })()}
                                    </p>
                                  </div>
                                </div>
                                {onAddToCart && fullProduct && rec.inStock && (
                                  <button
                                    type="button"
                                    onClick={() => onAddToCart(fullProduct)}
                                    data-testid={`ai-add-cart-${rec.id}`}
                                    className="tech-accent-btn inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold"
                                  >
                                    <ShoppingCart className="h-3 w-3" />
                                    <span>{lang === 'ar' ? 'أضف للسلة' : 'Add'}</span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-inherit pt-2">
                          {msg.sources.map((src, idx) => {
                            const safeHref = normalizeSafeUrl(src.uri);
                            if (!safeHref) return null;
                            return (
                              <a
                                key={`${src.uri}-${idx}`}
                                href={safeHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="tech-surface inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold text-blue-500 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <span className="max-w-[160px] truncate">{src.title || src.uri}</span>
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="tech-surface-muted rounded-2xl border px-4 py-2.5 text-xs tech-text-secondary">
                      {lang === 'ar'
                        ? 'مستشارك الذكي يفكر ويكتب الرد...'
                        : 'Your tech advisor is thinking & replying...'}
                    </div>
                  </div>
                )}
                {chatMessages.length <= 1 && !sending && (
                  <div className="flex flex-wrap gap-1.5 pt-1" data-testid="ai-quick-prompts">
                    {quickPrompts.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => void sendMessageText(q)}
                        className="tech-surface rounded-xl border px-2.5 py-1.5 text-[11px] font-bold transition hover:border-blue-500/50 hover:text-blue-500 text-start"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSendChat}
                className="mt-2 flex items-center gap-2 border-t border-inherit pt-3"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  data-testid="ai-chat-input"
                  placeholder={
                    lang === 'ar'
                      ? 'اسأل بأي لغة عن المنتجات، المواصفات، أسعار العملات، أو أي سؤال عام...'
                      : 'Ask in any language about products, tech specs, currency rates, or anything...'
                  }
                  className="tech-surface-muted flex-1 rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={sending || !inputText.trim()}
                  data-testid="ai-chat-send-btn"
                  aria-label={lang === 'ar' ? 'إرسال' : 'Send'}
                  className="tech-accent-btn inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          )}

          {activeTab === 'currency' && (
            <CurrencyConverterPanel
              lang={lang}
              baseCurrencyLabel={baseCurrencyLabel}
              selectedCurrency={activeCurrency}
              rates={activeRatesTable}
              ratesSource={ratesSource}
              ratesUpdatedAt={ratesUpdatedAt}
              refreshingRates={refreshingRates}
              products={storeData.products}
              onSelectDisplayCurrency={(code) => onChangeDisplayCurrency?.(code)}
              onRefreshRates={() => onRefreshRates?.()}
            />
          )}

          {activeTab === 'theme' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {themes.map(({ id, labelAr, labelEn, descAr, descEn, swatch, Icon }) => {
                const active = theme === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onChangeTheme(id)}
                    data-testid={`theme-option-${id}`}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-start transition ${
                      active
                        ? 'border-blue-500 ring-2 ring-blue-500/30 tech-surface-muted'
                        : 'tech-surface hover:border-blue-500/40'
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${swatch}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-extrabold">
                          {lang === 'ar' ? labelAr : labelEn}
                        </span>
                        {active && (
                          <span className="text-[11px] font-extrabold text-blue-500">
                            {lang === 'ar' ? 'مفعل' : 'Active'}
                          </span>
                        )}
                      </div>
                      <p className="tech-text-secondary mt-1 text-xs">
                        {lang === 'ar' ? descAr : descEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'wallpapers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm font-bold">
                  {lang === 'ar'
                    ? 'اختر خلفية لصفحة المتجر من الخلفيات المضافة من الإدارة:'
                    : 'Choose a storefront background wallpaper curated by Admin:'}
                </p>
                {selectedWallpaperUrl && (
                  <button
                    type="button"
                    onClick={() => onSelectWallpaper('')}
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 px-2.5 py-1 text-xs font-bold text-blue-500"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>{lang === 'ar' ? 'إزالة الخلفية' : 'Clear Wallpaper'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {storeData.wallpapers.map((wp) => {
                  const active = selectedWallpaperUrl === wp.imageUrl;
                  return (
                    <button
                      key={wp.id}
                      type="button"
                      onClick={() => onSelectWallpaper(active ? '' : wp.imageUrl)}
                      className={`group overflow-hidden rounded-2xl border text-start transition ${
                        active
                          ? 'border-blue-500 ring-2 ring-blue-500/40'
                          : 'border-inherit hover:border-blue-500/40'
                      }`}
                    >
                      <img
                        src={wp.imageUrl}
                        alt={lang === 'ar' ? wp.labelAr : wp.labelEn}
                        loading="lazy"
                        decoding="async"
                        className="h-28 w-full object-cover transition group-hover:scale-105"
                      />
                      <div className="tech-surface-muted flex items-center justify-between p-2.5 text-xs font-bold">
                        <span className="truncate">
                          {lang === 'ar' ? wp.labelAr : wp.labelEn}
                        </span>
                        {active && (
                          <span className="text-blue-500">
                            {lang === 'ar' ? 'مختارة' : 'Active'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'social' && (
            <div className="space-y-4">
              <div className="tech-surface-muted rounded-2xl border p-4 space-y-2">
                <h3 className="text-sm font-extrabold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span>{lang === 'ar' ? 'موقع الفرع وساعات العمل' : 'Branch Location & Hours'}</span>
                </h3>
                <p className="text-xs leading-relaxed">
                  {lang === 'ar' ? storeData.branch.addressAr : storeData.branch.addressEn}
                </p>
                <p className="tech-text-secondary text-xs">
                  {lang === 'ar'
                    ? storeData.branch.workingHoursAr
                    : storeData.branch.workingHoursEn}
                </p>
                {storeData.branch.branchMapUrl && (
                  <a
                    href={normalizeSafeUrl(storeData.branch.branchMapUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-500 hover:underline pt-1"
                  >
                    <span>{lang === 'ar' ? 'فتح موقع الفرع على الخريطة' : 'Open Map Location'}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {socialItems.map((item) => (
                  <a
                    key={item.label}
                    href={normalizeSafeUrl(item.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tech-surface-muted flex items-center justify-between rounded-xl border p-3.5 text-sm font-extrabold transition hover:border-blue-500/45"
                  >
                    <span>{item.label}</span>
                    <ExternalLink className="h-4 w-4 text-blue-500" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
