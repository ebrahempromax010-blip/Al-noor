import React, { useState } from 'react';
import { Check, Clock, Copy, ExternalLink, Globe, MapPin, MessageCircle, Phone } from 'lucide-react';
import { BranchInfo, Language } from '../types/store';
import { t } from '../utils/i18n';
import {
  DEFAULT_WEBSITE_URL,
  normalizeWebsiteUrl,
  sanitizePhoneForWhatsApp,
} from '../utils/storeLogic';

interface BranchContactCardProps {
  lang: Language;
  branch: BranchInfo;
}

export const BranchContactCard: React.FC<BranchContactCardProps> = ({ lang, branch }) => {
  const copy = t(lang);
  const [copied, setCopied] = useState(false);

  const storeName =
    (lang === 'ar' ? branch.storeNameAr : branch.storeNameEn).trim() ||
    (lang === 'ar' ? 'أشرف جولد' : 'Ashraf Gold');
  const address = lang === 'ar' ? branch.addressAr : branch.addressEn;
  const hours = lang === 'ar' ? branch.workingHoursAr : branch.workingHoursEn;
  const websiteUrl = normalizeWebsiteUrl(branch.websiteUrl || '') || DEFAULT_WEBSITE_URL;
  const waPhone = sanitizePhoneForWhatsApp(branch.whatsappNumber);
  const waDirectUrl = `https://wa.me/${waPhone}`;
  const telUrl = `tel:${branch.phoneNumber.replace(/\s+/g, '')}`;

  const handleCopyWebsiteUrl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(websiteUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <section
        aria-label={copy.branchTitle}
        className="mx-auto max-w-7xl px-3 pt-8 pb-6 sm:px-6 sm:pt-12"
      >
        <div className="rounded-2xl border border-amber-500/25 bg-[#131A26] p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/15 text-amber-400 shrink-0">
                  <MapPin className="h-5 w-5" />
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  {copy.branchTitle} —{' '}
                  <span className="text-amber-300">{storeName}</span>
                </h2>
              </div>

              <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                {address}
              </p>

              {hours && (
                <p className="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
                  <Clock className="h-4 w-4 text-amber-400/80 shrink-0" />
                  <span>
                    {copy.workingHoursLabel}: {hours}
                  </span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-[#0B0F17] px-3 py-1.5 text-xs sm:text-sm font-medium text-amber-300 transition hover:border-amber-400 hover:text-amber-200"
                  dir="ltr"
                >
                  <Globe className="h-4 w-4 shrink-0 text-amber-400" />
                  <span className="truncate max-w-[240px] sm:max-w-xs">{websiteUrl}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-80" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyWebsiteUrl}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-[#0B0F17] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-amber-500/40 hover:text-white cursor-pointer"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-amber-400/80" />
                  )}
                  <span>{copied ? copy.linkCopied : copy.copyLinkBtn}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <a
                href={waDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#10B981] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
              >
                <MessageCircle className="h-5 w-5" />
                <span>{copy.whatsappBtn}</span>
              </a>

              <a
                href={telUrl}
                className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              >
                <Phone className="h-5 w-5" />
                <span>{copy.callBtn}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp Quick Button (Bottom-Left) */}
      <a
        href={waDirectUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={copy.whatsappBtn}
        title={copy.whatsappBtn}
        className="fixed bottom-16 left-3 sm:bottom-20 sm:left-4 z-30 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#10B981] text-white shadow-xl shadow-emerald-600/35 ring-2 ring-white/20 transition-transform hover:scale-105 active:scale-95"
      >
        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
      </a>
    </>
  );
};
