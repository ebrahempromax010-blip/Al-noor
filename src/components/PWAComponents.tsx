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
  mode: 'ios' | 'android' | 'desktop';
  isInstalled: boolean;
  isInstallable?: boolean;
  isInIframe?: boolean;
  lang: Language;
  storeName: string;
  onTriggerInstantInstall?: () => void;
  onClose: () => void;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  open,
  mode,
  isInstalled,
  isInstallable = false,
  isInIframe = false,
  lang,
  storeName,
  onTriggerInstantInstall,
  onClose,
}) => {
  if (!open) return null;

  const directAppUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?autoinstall=1`
      : '/?autoinstall=1';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="tech-surface w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        data-testid="install-guide-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/15 text-blue-500">
              {mode === 'desktop' ? (
                <Monitor className="h-6 w-6" />
              ) : (
                <Smartphone className="h-6 w-6" />
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold">
                {lang === 'ar' ? `تثبيت تطبيق ${storeName}` : `Install ${storeName} App`}
              </h3>
              <p className="tech-text-secondary text-xs">
                {mode === 'ios'
                  ? lang === 'ar'
                    ? 'تثبيت فوري على شاشة الآيفون والآيباد ويعمل كتطبيق مستقل'
                    : 'Direct standalone install on iPhone & iPad Home Screen'
                  : mode === 'android'
                    ? lang === 'ar'
                      ? 'تثبيت فوري كتطبيق مستقل على هاتف الأندرويد بدون متصفح'
                      : 'Direct standalone install on Android phone'
                    : lang === 'ar'
                      ? 'تثبيت فوري كتطبيق مستقل على الكمبيوتر بدون متصفح'
                      : 'Direct standalone desktop app (Windows / Mac)'}
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
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>
                {lang === 'ar'
                  ? 'التطبيق مثبت الآن ويعمل كتطبيق مستقل مع تخزين داخلي للعمل حتى بدون إنترنت.'
                  : 'The app is installed and runs standalone with offline caching.'}
              </span>
            </div>
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
                    ? 'اضغط على زر المشاركة (Share) أسفل شاشة iPhone'
                    : 'Tap the Share button at the bottom of your iPhone screen'}
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
                  ? 'اضغط "إضافة" ليظهر التطبيق فوراً على هاتفك ويعمل كتطبيق مستقل بدون شريط المتصفح.'
                  : 'Tap "Add" to install the standalone app icon directly onto your iPhone.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {isInstallable && onTriggerInstantInstall && (
              <button
                type="button"
                onClick={onTriggerInstantInstall}
                data-testid="modal-instant-install-btn"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-emerald-500"
              >
                <Download className="h-4 w-4" />
                <span>
                  {lang === 'ar' ? 'تثبيت التطبيق فوراً الآن' : 'Install App Instantly Now'}
                </span>
              </button>
            )}

            {isInIframe && (
              <a
                href={directAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="direct-install-window-link"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-blue-500"
              >
                <Download className="h-4 w-4" />
                <span>
                  {lang === 'ar'
                    ? 'تشغيل المثبّت المباشر بضغطة واحدة'
                    : 'Launch Direct 1-Tap Installer'}
                </span>
              </a>
            )}

            <div className="tech-surface-muted rounded-xl border p-4 leading-relaxed space-y-1.5">
              <p className="font-bold">
                {mode === 'android'
                  ? lang === 'ar'
                    ? 'التثبيت المباشر على هاتف أندرويد:'
                    : 'Direct Install on Android:'
                  : lang === 'ar'
                    ? 'التثبيت المباشر على الكمبيوتر (Windows / Mac):'
                    : 'Direct Install on Computer (Windows / Mac):'}
              </p>
              <p className="tech-text-secondary text-xs leading-relaxed">
                {mode === 'android'
                  ? lang === 'ar'
                    ? 'اضغط قائمة المتصفح (⋮) ثم اختر "تثبيت التطبيق" (Install App) ليتم التثبيت فوراً كأيقونة مستقلة تعمل بدون متصفح.'
                    : 'Open the menu (⋮) and tap "Install App" to add the standalone app directly to your phone.'
                  : lang === 'ar'
                    ? 'اضغط أيقونة التثبيت (+) أعلى الشاشة أو من القائمة اختر "تثبيت التطبيق" ليفتح التطبيق مباشرة على سطح المكتب بدون متصفح.'
                    : 'Click the Install (+) icon in the top bar or choose "Install App" from the menu to run directly as a standalone desktop app.'}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="tech-surface-muted mt-5 w-full rounded-xl border py-2.5 text-sm font-bold transition hover:opacity-85"
        >
          {lang === 'ar' ? 'إغلاق' : 'Close'}
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
