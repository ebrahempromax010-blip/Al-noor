import React, { useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types/store';
import { t } from '../utils/i18n';

export const PWAInstallButton: React.FC<{ lang: Language }> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const copy = t(lang);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/25 whitespace-nowrap shrink-0 cursor-pointer"
        aria-label={copy.installApp}
      >
        <Download className="h-3.5 w-3.5" />
        <span>{copy.installApp}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/25 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{copy.installApp}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-amber-500/25 bg-[#131A26] p-6 text-slate-100 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-amber-300">
                  {lang === 'ar' ? 'تثبيت تطبيق أشرف جولد' : 'Install Ashraf Gold App'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label={copy.close}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {lang === 'ar'
                  ? '1. اضغط على زر المشاركة (Share) في شريط سفاري السفلي.\n2. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).'
                  : '1. Tap the Share icon in the Safari toolbar.\n2. Scroll down and select "Add to Home Screen".'}
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 cursor-pointer"
              >
                {copy.close}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC<{ lang: Language }> = ({ lang }) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-16 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-lg"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>
        {lang === 'ar'
          ? 'انقطع الاتصال بالإنترنت — بانتظار عودة الشبكة'
          : 'You are offline — waiting for connection'}
      </span>
    </div>
  );
};
