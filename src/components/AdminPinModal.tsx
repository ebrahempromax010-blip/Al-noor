import React, { useState } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';
import { Language } from '../types/store';
import { t } from '../utils/i18n';
import { ADMIN_SECRET_PIN } from '../utils/storeLogic';

interface AdminPinModalProps {
  isOpen: boolean;
  lang: Language;
  onClose: () => void;
  onAuthenticated: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  lang,
  onClose,
  onAuthenticated,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const copy = t(lang);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() === ADMIN_SECRET_PIN) {
      setError(null);
      setPin('');
      onAuthenticated();
    } else {
      setError(copy.pinError);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.pinTitle}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#131A26] p-6 text-slate-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/15 text-amber-400">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">{copy.pinTitle}</h2>
              <p className="mt-0.5 text-xs text-slate-400">{copy.pinSubtitle}</p>
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="admin-pin-input" className="sr-only">
              {copy.pinPlaceholder}
            </label>
            <input
              id="admin-pin-input"
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError(null);
              }}
              placeholder={copy.pinPlaceholder}
              className="font-mono-tabular h-12 w-full rounded-xl border border-amber-500/30 bg-[#0B0F17] px-4 text-center text-lg tracking-widest text-white placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg hover:brightness-110 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{copy.pinSubmit}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
