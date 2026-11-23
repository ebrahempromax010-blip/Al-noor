import React from 'react';
import { Check, Languages, X } from 'lucide-react';
import { Language } from '../types/store';
import { t } from '../utils/i18n';

interface LanguageSettingsModalProps {
  isOpen: boolean;
  lang: Language;
  onSelectLanguage: (nextLang: Language) => void;
  onClose: () => void;
}

export const LanguageSettingsModal: React.FC<LanguageSettingsModalProps> = ({
  isOpen,
  lang,
  onSelectLanguage,
  onClose,
}) => {
  if (!isOpen) return null;

  const copy = t(lang);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.langSettingsTitle}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#131A26] p-6 text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/15 text-amber-400">
              <Languages className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">{copy.langSettingsTitle}</h2>
              <p className="mt-0.5 text-xs text-slate-400">{copy.langSettingsSub}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {(
            [
              { code: 'ar' as const, label: copy.langArabicLabel },
              { code: 'en' as const, label: copy.langEnglishLabel },
            ]
          ).map((option) => {
            const active = lang === option.code;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  onSelectLanguage(option.code);
                  onClose();
                }}
                className={`flex min-h-[48px] w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition cursor-pointer ${
                  active
                    ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                    : 'border-amber-500/20 bg-[#0B0F17] text-slate-300 hover:border-amber-400/50 hover:text-white'
                }`}
              >
                <span>{option.label}</span>
                {active && <Check className="h-4 w-4 text-amber-400" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
