import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { CartItem, CustomerOrder, Language, Product } from '../types/store';
import {
  buildWhatsappOrderUrl,
  calculateDiscountedPrice,
  formatWhatsappOrderMessage,
  sanitizeOrderPayload,
} from '../utils/storeLogic';

interface CartViewProps {
  lang: Language;
  currency: string;
  orderWhatsappNumber: string;
  cart: CartItem[];
  products: Product[];
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onBrowseCatalog: () => void;
  onSubmitOrder: (order: CustomerOrder) => Promise<void>;
}

function triggerWhatsappClientLink(url: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export const CartView: React.FC<CartViewProps> = ({
  lang,
  currency,
  orderWhatsappNumber,
  cart,
  products,
  onUpdateQty,
  onRemoveItem,
  onBrowseCatalog,
  onSubmitOrder,
}) => {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [lastWhatsappUrl, setLastWhatsappUrl] = useState('');

  useEffect(() => {
    if (!checkoutOpen && !orderConfirmed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (orderConfirmed) setOrderConfirmed(false);
      else if (checkoutOpen && !submitting) setCheckoutOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [checkoutOpen, orderConfirmed, submitting]);

  const detailedItems = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const unitPrice = calculateDiscountedPrice(product.price, product.discountPercent);
      return {
        product,
        quantity: item.quantity,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const grandTotal = detailedItems.reduce((sum, entry) => sum + entry.lineTotal, 0);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const payloadResult = sanitizeOrderPayload({
      customerName,
      customerAddress,
      customerPhone,
      note,
      currency,
      items: detailedItems.map((d) => ({
        productId: d.product.id,
        nameAr: d.product.nameAr,
        nameEn: d.product.nameEn,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
      })),
    });

    if (payloadResult.ok === false) {
      setErrorMsg(lang === 'ar' ? payloadResult.errorAr : payloadResult.errorEn);
      return;
    }

    const formattedText = formatWhatsappOrderMessage(payloadResult.order);
    const whatsappUrl = buildWhatsappOrderUrl(orderWhatsappNumber, formattedText);
    const enrichedOrder: CustomerOrder = {
      ...payloadResult.order,
      whatsappDispatchStatus: 'opened_whatsapp_client',
      whatsappMessageText: formattedText,
    };

    // Synchronously launch customer's WhatsApp app/tab with pre-filled order message
    triggerWhatsappClientLink(whatsappUrl);

    setSubmitting(true);
    try {
      await onSubmitOrder(enrichedOrder);
      setLastWhatsappUrl(whatsappUrl);
      setCheckoutOpen(false);
      setCustomerName('');
      setCustomerAddress('');
      setCustomerPhone('');
      setNote('');
      setOrderConfirmed(true);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : lang === 'ar'
            ? 'تعذر إرسال الطلب، يرجى المحاولة مرة أخرى.'
            : 'Could not submit order. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-5 px-3 py-5 sm:px-6" data-testid="cart-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15 text-blue-500">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold">
              {lang === 'ar' ? 'سلة المشتريات' : 'Shopping Cart'}
            </h2>
            <p className="tech-text-secondary text-xs">
              {lang === 'ar'
                ? `${detailedItems.length} منتجات في سلتك`
                : `${detailedItems.length} items in your cart`}
            </p>
          </div>
        </div>
      </div>

      {detailedItems.length === 0 ? (
        <div className="tech-surface flex flex-col items-center justify-center rounded-2xl border p-10 text-center">
          <ShoppingBag className="tech-text-secondary mb-3 h-12 w-12 opacity-60" />
          <h3 className="text-base font-extrabold mb-1">
            {lang === 'ar' ? 'سلة المشتريات فارغة حالياً' : 'Your cart is currently empty'}
          </h3>
          <p className="tech-text-secondary mb-5 text-xs">
            {lang === 'ar'
              ? 'أضف أجهزة الكمبيوتر أو اللابتوب أو الإكسسوارات التي تناسبك ثم أرسل طلبك.'
              : 'Browse computers, laptops, or accessories and add items to place an order.'}
          </p>
          <button
            type="button"
            onClick={onBrowseCatalog}
            className="tech-accent-btn rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold"
          >
            {lang === 'ar' ? 'تصفح كمبيوترات وإكسسوارات' : 'Browse PCs & Accessories'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            {detailedItems.map(({ product, quantity, unitPrice, lineTotal }) => (
              <div
                key={product.id}
                data-testid={`cart-item-${product.id}`}
                className="tech-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border p-4 shadow-sm"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={product.imageUrl}
                    alt={lang === 'ar' ? product.nameAr : product.nameEn}
                    className="h-20 w-24 shrink-0 rounded-xl object-cover bg-slate-900"
                  />
                  <div className="min-w-0 space-y-1">
                    <h3 className="truncate text-sm sm:text-base font-extrabold">
                      {lang === 'ar' ? product.nameAr : product.nameEn}
                    </h3>
                    <p className="tech-text-secondary text-xs font-mono-tabular">
                      {unitPrice.toLocaleString('en-US')} {currency}{' '}
                      {lang === 'ar' ? 'للقطعة' : 'each'}
                    </p>
                    <p className="text-xs font-extrabold text-blue-600 dark:text-sky-400 font-mono-tabular">
                      {lang === 'ar' ? 'الإجمالي:' : 'Subtotal:'}{' '}
                      {lineTotal.toLocaleString('en-US')} {currency}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3">
                  <div className="tech-surface-muted flex items-center gap-1 rounded-xl border p-1">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(product.id, -1)}
                      aria-label={lang === 'ar' ? 'إنقاص الكمية' : 'Decrease quantity'}
                      className="rounded-lg p-1.5 hover:bg-blue-600/15"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-mono-tabular w-8 text-center text-sm font-extrabold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(product.id, 1)}
                      aria-label={lang === 'ar' ? 'زيادة الكمية' : 'Increase quantity'}
                      className="rounded-lg p-1.5 hover:bg-blue-600/15"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(product.id)}
                    data-testid={`remove-cart-item-${product.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-500 transition hover:bg-rose-500/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{lang === 'ar' ? 'حذف المنتج' : 'Remove Item'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Automatic Total Summary + Checkout Trigger */}
          <div className="tech-surface rounded-2xl border p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-inherit pb-4 mb-4">
              <span className="text-sm font-bold">
                {lang === 'ar' ? 'الإجمالي الكلي للطلب' : 'Order Total'}
              </span>
              <span
                data-testid="cart-grand-total"
                className="font-mono-tabular text-2xl font-extrabold text-blue-600 dark:text-sky-400"
              >
                {grandTotal.toLocaleString('en-US')} {currency}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCheckoutOpen(true)}
              data-testid="proceed-checkout-btn"
              className="tech-accent-btn w-full rounded-xl py-3.5 text-sm font-extrabold shadow-md transition active:scale-[0.99]"
            >
              {lang === 'ar' ? 'إتمام عملية الشراء' : 'Proceed to Checkout'}
            </button>
          </div>
        </div>
      )}

      {/* Checkout Details Modal */}
      {checkoutOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => !submitting && setCheckoutOpen(false)}
        >
          <div
            className="tech-surface w-full max-w-lg rounded-2xl border p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="checkout-modal"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-extrabold">
                {lang === 'ar' ? 'بيانات إتمام الطلب' : 'Checkout & Delivery Details'}
              </h3>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setCheckoutOpen(false)}
                aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
                className="tech-surface-muted rounded-lg border p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-3.5">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold">
                  <User className="h-3.5 w-3.5 text-blue-500" />
                  <span>{lang === 'ar' ? 'الاسم بالكامل *' : 'Full Name *'}</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  data-testid="checkout-name"
                  placeholder={lang === 'ar' ? 'أدخل اسمك الثلاثي...' : 'Enter your full name'}
                  className="tech-surface-muted w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold">
                  <MapPin className="h-3.5 w-3.5 text-blue-500" />
                  <span>
                    {lang === 'ar' ? 'الموقع / العنوان بالتفصيل *' : 'Full Delivery Address *'}
                  </span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  data-testid="checkout-address"
                  placeholder={
                    lang === 'ar'
                      ? 'المحافظة، المدينة، اسم الشارع، رقم العمارة والشقة...'
                      : 'City, street, building, floor...'
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1.5 text-xs font-bold">
                  <Phone className="h-3.5 w-3.5 text-blue-500" />
                  <span>{lang === 'ar' ? 'رقم التليفون *' : 'Phone Number *'}</span>
                </label>
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  data-testid="checkout-phone"
                  placeholder="+20 100 000 0000"
                  className="tech-surface-muted w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono-tabular outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold">
                  {lang === 'ar' ? 'ملحوظة إضافية (اختياري)' : 'Additional Note (Optional)'}
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  data-testid="checkout-note"
                  placeholder={
                    lang === 'ar'
                      ? 'مثال: موعد التوصيل المناسب أو طلب تثبيت برنامج...'
                      : 'e.g. Preferred delivery time...'
                  }
                  className="tech-surface-muted w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {errorMsg && (
                <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-500">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                data-testid="submit-order-btn"
                className="tech-accent-btn w-full rounded-xl py-3 text-sm font-extrabold shadow-md transition disabled:opacity-60"
              >
                {submitting
                  ? lang === 'ar'
                    ? 'جاري إرسال الطلب...'
                    : 'Submitting Order...'
                  : lang === 'ar'
                    ? 'إرسال الطلب'
                    : 'Submit Order'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Customer WhatsApp Order Confirmation Modal */}
      {orderConfirmed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setOrderConfirmed(false)}
        >
          <div
            className="tech-surface w-full max-w-md rounded-2xl border p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            data-testid="order-success-modal"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-extrabold mb-2">
              {lang === 'ar' ? 'تم تجهيز وإرسال طلبك عبر واتساب' : 'Order Ready on WhatsApp'}
            </h3>
            <p className="tech-text-secondary text-sm leading-relaxed">
              {lang === 'ar'
                ? 'تم حفظ طلبك في المتجر وفتح رسالة الطلب عبر حسابك على واتساب للإرسال المباشر. اضغط إرسال داخل واتساب لإتمام التأكيد.'
                : 'Your order is saved and opened in your WhatsApp account ready to send. Tap Send inside WhatsApp to confirm with us.'}
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              {lastWhatsappUrl && (
                <a
                  href={lastWhatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="open-whatsapp-order-link"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-emerald-600"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>
                    {lang === 'ar'
                      ? 'فتح رسالة الطلب في واتساب الآن'
                      : 'Open Order Message in WhatsApp'}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setOrderConfirmed(false)}
                className="tech-surface-muted w-full rounded-xl border py-2.5 text-sm font-bold"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
