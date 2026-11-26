import React, { useState } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';
import { Language } from '../types/store';

interface AdminPinModalProps {
  open: boolean;
  lang: Language;
  expectedPin: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  open,
  lang,
  expectedPin,
  onSuccess,
  onClose,
}) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pinInput.trim();
    if (cleaned === expectedPin) {
      setError('');
      setPinInput('');
      onSuccess();
      return;
    }
    setError(
      lang === 'ar'
        ? 'الرقم السري غير صحيح. تأكد من إدخال رمز الإدارة المكون من 10 أرقام.'
        : 'Incorrect PIN. Please enter the 10-digit Admin PIN.'
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="tech-surface w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="admin-pin-modal"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/15 text-blue-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold">
                {lang === 'ar' ? 'دخول لوحة الإدارة' : 'Admin Access'}
              </h3>
              <p className="tech-text-secondary text-[11px]">
                {lang === 'ar'
                  ? 'أدخل الرمز السري المكون من 10 أرقام'
                  : 'Enter your 10-digit security PIN'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            className="tech-surface-muted rounded-lg border p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock className="tech-text-secondary pointer-events-none absolute start-3 top-3 h-4 w-4" />
            <input
              type="password"
              inputMode="numeric"
              maxLength={10}
              autoFocus
              dir="ltr"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
              data-testid="admin-pin-input"
              placeholder="••••••••••"
              className="tech-surface-muted w-full rounded-xl border py-2.5 ps-9 pe-3 text-center font-mono-tabular text-base tracking-[0.25em] outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-500">
              {error}
            </p>
          )}

          <button
            type="submit"
            data-testid="admin-pin-submit"
            className="tech-accent-btn w-full rounded-xl py-2.5 text-sm font-extrabold"
          >
            {lang === 'ar' ? 'فتح لوحة الإدارة' : 'Unlock Admin Panel'}
          </button>
        </form>
      </div>
    </div>
  );
};
