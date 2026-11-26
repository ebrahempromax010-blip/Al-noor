import React from 'react';
import { Cpu, Download, MonitorCheck, ShieldCheck } from 'lucide-react';
import { Language, SystemUpdateNotice } from '../types/store';

interface SystemUpdateTickerBarProps {
  lang: Language;
  updates: SystemUpdateNotice[];
  onTickerClick: () => void;
}

export const SystemUpdateTickerBar: React.FC<SystemUpdateTickerBarProps> = ({
  lang,
  updates,
  onTickerClick,
}) => {
  const items = updates.length > 0 ? updates : [];
  const repeated = [...items, ...items];

  const getToneDot = (tone: SystemUpdateNotice['tone']) => {
    switch (tone) {
      case 'microsoft':
        return 'bg-sky-400';
      case 'apple':
        return 'bg-slate-300';
      case 'driver':
        return 'bg-emerald-400';
      default:
        return 'bg-amber-400';
    }
  };

  return (
    <button
      type="button"
      onClick={onTickerClick}
      data-testid="system-updates-ticker"
      className="w-full bg-slate-950 text-slate-100 border-b border-blue-500/25 transition hover:bg-slate-900 focus:outline-none"
      aria-label={
        lang === 'ar'
          ? 'مركز تحديثات وتحميلات الأنظمة الرسمية'
          : 'Official System Updates and Downloads Center'
      }
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-1.5">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-blue-600/25 px-2.5 py-0.5 text-[11px] font-bold text-sky-300 border border-sky-400/30">
          <MonitorCheck className="h-3.5 w-3.5 text-sky-400" />
          <span>{lang === 'ar' ? 'مركز الأنظمة' : 'OS Center'}</span>
        </span>

        <div className="ticker-container relative flex-1 overflow-hidden whitespace-nowrap">
          <div
            className={`inline-flex items-center gap-8 ${
              lang === 'ar' ? 'ticker-track-rtl' : 'ticker-track-ltr'
            }`}
          >
            {repeated.map((notice, idx) => (
              <span
                key={`${notice.id}-${idx}`}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-200"
              >
                <span className={`h-2 w-2 rounded-full ${getToneDot(notice.tone)}`} />
                <span className="font-bold text-sky-300">
                  {lang === 'ar' ? notice.badgeAr : notice.badgeEn}
                </span>
                <span>{lang === 'ar' ? notice.textAr : notice.textEn}</span>
              </span>
            ))}
          </div>
        </div>

        <span className="hidden sm:inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-sky-400">
          <Download className="h-3 w-3" />
          <span>{lang === 'ar' ? 'تحميل للكمبيوتر' : 'PC Downloads'}</span>
        </span>
      </div>
    </button>
  );
};

interface DesktopOnlyNoticeModalProps {
  open: boolean;
  lang: Language;
  message: string;
  onClose: () => void;
}

export const DesktopOnlyNoticeModal: React.FC<DesktopOnlyNoticeModalProps> = ({
  open,
  lang,
  message,
  onClose,
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="tech-surface w-full max-w-md rounded-2xl border p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
          <Cpu className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-extrabold mb-2">
          {lang === 'ar' ? 'متاح لأجهزة الكمبيوتر فقط' : 'Desktop Computer Required'}
        </h3>
        <p className="tech-text-secondary text-sm leading-relaxed" data-testid="mobile-os-block-msg">
          {message}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-500 font-semibold">
          <ShieldCheck className="h-4 w-4" />
          <span>
            {lang === 'ar'
              ? 'افتح المتجر من Windows أو Mac للوصول للروابط الرسمية'
              : 'Open this store on Windows or Mac for official OS downloads'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="tech-accent-btn mt-5 w-full rounded-xl py-2.5 text-sm font-bold"
        >
          {lang === 'ar' ? 'حسناً' : 'Understood'}
        </button>
      </div>
    </div>
  );
};
