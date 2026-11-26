import React from 'react';
import { ExternalLink, Laptop, MonitorDown, ShieldCheck, X } from 'lucide-react';
import { Language, OSDownloadItem } from '../types/store';
import { normalizeSafeUrl } from '../utils/storeLogic';

interface OSDownloadCenterModalProps {
  open: boolean;
  lang: Language;
  downloads: OSDownloadItem[];
  onClose: () => void;
}

export const OSDownloadCenterModal: React.FC<OSDownloadCenterModalProps> = ({
  open,
  lang,
  downloads,
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
        className="tech-surface flex max-h-[88vh] w-full max-w-3xl flex-col rounded-2xl border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        data-testid="os-download-center-modal"
      >
        <div className="flex items-center justify-between border-b border-inherit px-5 py-4 bg-gradient-to-l from-blue-600/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <MonitorDown className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold">
                {lang === 'ar'
                  ? 'مركز التحديثات وتحميل الأنظمة الرسمية'
                  : 'Official OS Downloads & Updates Center'}
              </h2>
              <p className="tech-text-secondary text-xs flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>
                  {lang === 'ar'
                    ? 'روابط رسمية مباشرة من Microsoft و Apple و NVIDIA و AMD للكمبيوتر'
                    : 'Verified official Microsoft, Apple, NVIDIA & AMD portals for desktop PCs'}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            className="tech-surface-muted rounded-xl border p-2 transition hover:opacity-80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {downloads.map((item) => (
            <div
              key={item.id}
              className="tech-surface-muted flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition hover:border-blue-500/40"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-blue-500">
                  <Laptop className="h-3.5 w-3.5" />
                  <span>{item.vendor}</span>
                  <span className="tech-text-secondary">•</span>
                  <span className="font-mono-tabular">{item.version}</span>
                  {item.sizeLabel && (
                    <>
                      <span className="tech-text-secondary">•</span>
                      <span className="tech-text-secondary font-mono-tabular">
                        {item.sizeLabel}
                      </span>
                    </>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-extrabold">
                  {lang === 'ar' ? item.titleAr : item.titleEn}
                </h3>
                <p className="tech-text-secondary text-xs leading-relaxed">
                  {lang === 'ar' ? item.descriptionAr : item.descriptionEn}
                </p>
              </div>

              <a
                href={normalizeSafeUrl(item.officialUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="tech-accent-btn inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm transition"
              >
                <span>{lang === 'ar' ? 'فتح الرابط الرسمي' : 'Official Download'}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
