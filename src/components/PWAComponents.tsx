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
import { Language, UploadedAppFiles } from '../types/store';
import { formatFileSizeLabel } from '../utils/pwaLogic';

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
      className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-[0.98] shrink-0"
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
  uploadedAppFiles?: UploadedAppFiles;
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
  uploadedAppFiles,
  onTriggerInstantInstall,
  onClose,
}) => {
  if (!open) return null;

  const directAppUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?autoinstall=1`
      : '/?autoinstall=1';
  const androidApk = uploadedAppFiles?.androidApk;
  const iosApp = uploadedAppFiles?.iosApp;
  const hasUploadedFiles = Boolean(androidApk?.fileUrl || iosApp?.fileUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="tech-surface w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border p-6 shadow-2xl"
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
                {lang === 'ar'
                  ? `تثبيت تطبيق ${storeName}`
                  : `Install ${storeName} App`}
              </h3>
              <p className="tech-text-secondary text-xs">
                {lang === 'ar'
                  ? 'تثبيت فوري مباشر على هاتفك أو جهازك بالأيقونة والاسم تلقائياً'
                  : 'Instant direct install onto your phone or PC with app icon & name'}
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

        <div className="space-y-3 text-sm">
          {isInstalled && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs sm:text-sm text-emerald-500">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span>
                  {lang === 'ar'
                    ? 'التطبيق مثبت بالفعل على جهازك!'
                    : 'App is already installed on your device!'}
                </span>
              </div>
            </div>
          )}

          {isInstallable && onTriggerInstantInstall && (
            <button
              type="button"
              onClick={onTriggerInstantInstall}
              data-testid="modal-instant-install-btn"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-emerald-500"
            >
              <Download className="h-4 w-4" />
              <span>
                {lang === 'ar'
                  ? 'تثبيت التطبيق تلقائياً الآن'
                  : 'Install App Automatically Now'}
              </span>
            </button>
          )}

          {isInIframe && (
            <a
              href={directAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="direct-install-window-link"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500/35 bg-blue-600/10 px-4 py-3 text-xs sm:text-sm font-extrabold text-blue-500 transition hover:bg-blue-600/20"
            >
              <Download className="h-4 w-4" />
              <span>
                {lang === 'ar'
                  ? 'فتح التثبيت الفوري في المتصفح مباشرة'
                  : 'Open Instant Install in Browser'}
              </span>
            </a>
          )}

          {mode === 'ios' ? (
            <div className="tech-surface-muted rounded-xl border p-4 space-y-3">
              <p className="font-extrabold text-xs sm:text-sm">
                {lang === 'ar'
                  ? 'التثبيت المباشر على الآيفون والآيباد (iOS Safari):'
                  : 'Direct Home Screen Install on iPhone & iPad (Safari):'}
              </p>
              <div className="flex items-center gap-3">
                <Share className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="text-xs sm:text-sm">
                  {lang === 'ar'
                    ? '1. اضغط على زر المشاركة (Share) أسفل شاشة سفاري.'
                    : '1. Tap the Share button at the bottom of Safari.'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <PlusSquare className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="text-xs sm:text-sm">
                  {lang === 'ar'
                    ? '2. اختر "إضافة إلى الصفحة الرئيسية / Add to Home Screen" ثم إضافة.'
                    : '2. Choose "Add to Home Screen" and tap Add.'}
                </span>
              </div>
            </div>
          ) : (
            <div className="tech-surface-muted rounded-xl border p-4 space-y-2">
              <p className="font-extrabold text-xs sm:text-sm">
                {mode === 'android'
                  ? lang === 'ar'
                    ? 'تثبيت سريع على الهاتف (Android):'
                    : 'Quick Install on Android:'
                  : lang === 'ar'
                    ? 'تثبيت سريع على الكمبيوتر (Chrome / Edge):'
                    : 'Quick Install on Desktop (Chrome / Edge):'}
              </p>
              <p className="tech-text-secondary text-xs leading-relaxed">
                {mode === 'android'
                  ? lang === 'ar'
                    ? 'من قائمة المتصفح (⋮) بالأعلى اختر "تثبيت التطبيق / Install App" أو "إضافة للشاشة الرئيسية" ليتم تنزيل الأيقونة والتطبيق فوراً.'
                    : 'Open Browser Menu (⋮) and tap "Install App" or "Add to Home screen" to install immediately.'
                  : lang === 'ar'
                    ? 'اضغط أيقونة التثبيت في شريط العنوان بالأعلى أو اختر "Install App" من قائمة المتصفح (⋮).'
                    : 'Click the Install icon in the address bar or choose "Install App" from the browser menu (⋮).'}
              </p>
            </div>
          )}

          {/* Direct Store Binary Downloads — ONLY shown after Admin uploads APK / iOS files */}
          {hasUploadedFiles && (
            <div
              className="tech-surface-muted rounded-xl border border-emerald-500/30 p-4 space-y-2.5"
              data-testid="modal-uploaded-binaries-section"
            >
              <p className="text-xs font-extrabold text-emerald-500">
                {lang === 'ar'
                  ? 'تنزيل ملفات التطبيق المباشرة من المتجر:'
                  : 'Direct App File Downloads:'}
              </p>
              <div className="flex flex-col gap-2">
                {androidApk?.fileUrl && (
                  <a
                    href={androidApk.fileUrl}
                    download={androidApk.fileName || 'Al-Nour-Computer.apk'}
                    data-testid="modal-download-apk-btn"
                    className="tech-accent-btn inline-flex w-full items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Download className="h-4 w-4 shrink-0" />
                      <span>
                        {lang === 'ar'
                          ? 'تحميل للأندرويد مباشرة (APK)'
                          : 'Download Android APK'}
                      </span>
                    </span>
                    <span className="text-[11px] opacity-90 font-mono-tabular" dir="ltr">
                      {formatFileSizeLabel(androidApk.sizeBytes)}
                    </span>
                  </a>
                )}

                {iosApp?.fileUrl && (
                  <a
                    href={iosApp.fileUrl}
                    download={iosApp.fileName || 'Al-Nour-Computer.ipa'}
                    data-testid="modal-download-ios-btn"
                    className="inline-flex w-full items-center justify-between gap-2 rounded-xl border border-blue-500/40 bg-blue-600/15 px-4 py-2.5 text-xs font-extrabold text-blue-500 transition hover:bg-blue-600/25"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Smartphone className="h-4 w-4 shrink-0" />
                      <span>
                        {lang === 'ar'
                          ? 'تحميل للآيفون مباشرة (IPA)'
                          : 'Download iPhone App (IPA)'}
                      </span>
                    </span>
                    <span className="text-[11px] opacity-90 font-mono-tabular" dir="ltr">
                      {formatFileSizeLabel(iosApp.sizeBytes)}
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

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
