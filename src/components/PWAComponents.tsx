import React from 'react';
import {
  CheckCircle2,
  Download,
  Monitor,
  PlusSquare,
  Share,
  Smartphone,
  WifiOff,
  X,
} from 'lucide-react';
import { Language } from '../types/store';

interface PWAInstallButtonProps {
  lang: Language;
  isInstalled: boolean;
  onClick: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang,
  isInstalled,
  onClick,
}) => {
  if (isInstalled) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="pwa-install-btn"
      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.98] shrink-0"
    >
      <Download className="h-4 w-4 shrink-0" />
      <span>{lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</span>
    </button>
  );
};

interface InstallGuideModalProps {
  open: boolean;
  mode: 'ios' | 'desktop';
  isInstalled: boolean;
  lang: Language;
  storeName: string;
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  open,
  mode,
  isInstalled,
  lang,
  storeName,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="tech-surface w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/15 text-blue-500">
              {mode === 'ios' ? (
                <Smartphone className="h-6 w-6" />
              ) : (
                <Monitor className="h-6 w-6" />
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold">
                {lang === 'ar' ? `تثبيت تطبيق ${storeName}` : `Install ${storeName} App`}
              </h3>
              <p className="tech-text-secondary text-xs">
                {mode === 'ios'
                  ? lang === 'ar'
                    ? 'إضافة على شاشة الآيفون والآيباد (iOS Safari)'
                    : 'Add to iPhone & iPad Home Screen'
                  : lang === 'ar'
                    ? 'تثبيت كتطبيق مستقل على الكمبيوتر أو أندرويد'
                    : 'Standalone PWA on Windows, Mac, or Android'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            className="tech-surface-muted rounded-lg border p-1.5 transition hover:opacity-80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isInstalled ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-500">
            <p className="font-bold">
              {lang === 'ar'
                ? 'التطبيق مثبت ويعمل حالياً بوضع التطبيق المستقل مع تحديثات تلقائية في الخلفية.'
                : 'The app is currently installed and running in standalone mode with automatic background updates.'}
            </p>
          </div>
        ) : mode === 'ios' ? (
          <div className="space-y-3 text-sm">
            <div className="tech-surface-muted flex items-start gap-3 rounded-xl border p-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white">
                1
              </div>
              <div className="flex-1">
                <p className="font-bold">
                  {lang === 'ar'
                    ? 'اضغط على زر المشاركة (Share) أسفل متصفح Safari'
                    : 'Tap the Share button at the bottom of Safari'}
                </p>
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600/15 px-2.5 py-1 text-xs font-semibold text-blue-500">
                  <Share className="h-4 w-4" />
                  <span>{lang === 'ar' ? 'أيقونة المشاركة' : 'Share Icon'}</span>
                </div>
              </div>
            </div>

            <div className="tech-surface-muted flex items-start gap-3 rounded-xl border p-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white">
                2
              </div>
              <div className="flex-1">
                <p className="font-bold">
                  {lang === 'ar'
                    ? 'اختر "إضافة إلى الصفحة الرئيسية" (Add to Home Screen)'
                    : 'Select "Add to Home Screen"'}
                </p>
                <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600/15 px-2.5 py-1 text-xs font-semibold text-blue-500">
                  <PlusSquare className="h-4 w-4" />
                  <span>{lang === 'ar' ? 'إضافة إلى الصفحة الرئيسية' : 'Add to Home Screen'}</span>
                </div>
              </div>
            </div>

            <div className="tech-surface-muted flex items-start gap-3 rounded-xl border p-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white">
                3
              </div>
              <p className="font-bold">
                {lang === 'ar'
                  ? 'اضغط "إضافة" في الزاوية العلوية ليظهر التطبيق بأيقونته الرسمية على شاشة الآيفون.'
                  : 'Tap "Add" in the top corner to install the standalone app icon.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="tech-surface-muted rounded-xl border p-4 leading-relaxed">
              <p className="font-bold mb-1.5">
                {lang === 'ar'
                  ? 'لتثبيت التطبيق مباشرة على Chrome أو Edge أو أندرويد:'
                  : 'To install directly on Chrome, Edge, or Android:'}
              </p>
              <p className="tech-text-secondary text-xs leading-relaxed">
                {lang === 'ar'
                  ? 'افتح المتجر في نافذة متصفح مستقلة واضغط على أيقونة التثبيت (+) في شريط العنوان أو قائمة المتصفح -> "تثبيت التطبيق" (Install App).'
                  : 'Open the store in a top-level browser tab and click the Install (+) icon in the address bar or Browser Menu -> Install App.'}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="tech-accent-btn mt-5 w-full rounded-xl py-2.5 text-sm font-bold transition"
        >
          {lang === 'ar' ? 'فهمت' : 'Got it'}
        </button>
      </div>
    </div>
  );
};

export const OfflineBanner: React.FC<{ isOnline: boolean; lang: Language }> = ({
  isOnline,
  lang,
}) => {
  if (isOnline) return null;
  return (
    <div className="bg-amber-500 px-4 py-1.5 text-center text-xs font-bold text-slate-950 flex items-center justify-center gap-2">
      <WifiOff className="h-3.5 w-3.5" />
      <span>
        {lang === 'ar'
          ? 'أنت غير متصل بالإنترنت حالياً — يتم عرض البيانات المخزنة مؤقتاً.'
          : 'You are currently offline — viewing cached store catalog.'}
      </span>
    </div>
  );
};
