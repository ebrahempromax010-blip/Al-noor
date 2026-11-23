import React from 'react';
import { MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { BranchInfo, Language } from '../types/store';
import { t } from '../utils/i18n';
import {
  buildWhatsAppCartUrl,
  CartSummary,
  formatCurrency,
} from '../utils/storeLogic';

interface CartDrawerProps {
  isOpen: boolean;
  lang: Language;
  summary: CartSummary;
  branch: BranchInfo;
  onClose: () => void;
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  lang,
  summary,
  branch,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
}) => {
  if (!isOpen) return null;

  const copy = t(lang);
  const storeName = lang === 'ar' ? branch.storeNameAr : branch.storeNameEn;
  const whatsappInvoiceUrl = buildWhatsAppCartUrl(
    branch.whatsappNumber,
    summary,
    storeName,
    lang
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.cartTitle}
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-s border-amber-500/25 bg-[#0E141F] text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">{copy.cartTitle}</h2>
            <span className="font-mono-tabular text-xs font-semibold text-amber-300">
              ({summary.totalItems})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {summary.lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-[#131A26] text-amber-400/70">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <p className="mt-4 text-base font-bold text-white">{copy.cartEmpty}</p>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-slate-400">
                {copy.cartEmptySub}
              </p>
            </div>
          ) : (
            summary.lines.map((line) => {
              const title =
                lang === 'ar' ? line.product.nameAr : line.product.nameEn;
              return (
                <div
                  key={line.product.id}
                  className="flex gap-3 rounded-2xl border border-amber-500/20 bg-[#131A26] p-3"
                >
                  <img
                    src={line.product.imageUrl}
                    alt={title}
                    referrerPolicy="no-referrer"
                    className="h-20 w-20 rounded-xl object-cover bg-[#0B0F17] shrink-0"
                  />
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white line-clamp-1">
                        {title}
                      </h3>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(line.product.id)}
                        aria-label={`${lang === 'ar' ? 'حذف' : 'Remove'} ${title}`}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono-tabular">
                      {line.product.code} · {line.product.weightGrams} {copy.gram}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="font-mono-tabular text-sm font-bold text-amber-300">
                        {formatCurrency(line.lineTotal, lang)}
                      </span>

                      <div className="flex items-center gap-1 rounded-xl border border-amber-500/20 bg-[#0B0F17] p-1">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(line.product.id, -1)}
                          aria-label={`${lang === 'ar' ? 'إنقاص كمية' : 'Decrease'} ${title}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-mono-tabular min-w-[24px] text-center text-xs font-bold text-white">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(line.product.id, 1)}
                          aria-label={`${lang === 'ar' ? 'زيادة كمية' : 'Increase'} ${title}`}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Totals & WhatsApp Checkout */}
        {summary.lines.length > 0 && (
          <div className="border-t border-amber-500/20 bg-[#131A26] p-5 space-y-3">
            {summary.totalSavings > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-300">
                <span>{copy.totalSavings}</span>
                <span className="font-mono-tabular font-bold">
                  {formatCurrency(summary.totalSavings, lang)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-base font-bold text-white">
              <span>{copy.subtotal}</span>
              <span className="font-mono-tabular text-xl text-amber-300">
                {formatCurrency(summary.subtotal, lang)}
              </span>
            </div>

            <a
              href={whatsappInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#10B981] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500"
            >
              <MessageCircle className="h-5 w-5" />
              <span>{copy.sendInvoiceWhatsapp}</span>
            </a>

            <button
              type="button"
              onClick={onClearCart}
              className="w-full rounded-xl border border-white/10 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              {copy.clearCart}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
