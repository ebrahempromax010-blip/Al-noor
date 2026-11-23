import React, { useState } from 'react';
import { ArrowDownLeft, ArrowDownRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { Language, PromoBannerConfig } from '../types/store';
import { t } from '../utils/i18n';

interface PromoBannerProps {
  lang: Language;
  banner: PromoBannerConfig;
  onExploreOffers: () => void;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({
  lang,
  banner,
  onExploreOffers,
}) => {
  const [imgError, setImgError] = useState(false);
  const copy = t(lang);

  if (!banner.enabled) return null;

  const title = lang === 'ar' ? banner.titleAr : banner.titleEn;
  const subtitle = lang === 'ar' ? banner.subtitleAr : banner.subtitleEn;
  const badge = lang === 'ar' ? banner.badgeTextAr : banner.badgeTextEn;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-7xl px-3 pt-4 sm:px-6 sm:pt-6"
    >
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-[#131A26] shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Editorial Copy Side */}
          <div className="relative z-10 flex flex-col justify-center p-4 sm:p-8 lg:col-span-6 lg:p-10">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-amber-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>{badge}</span>
              {banner.discountPercent > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="animate-pulse rounded-md bg-gradient-to-r from-rose-600 to-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                    {copy.discountUpTo} {banner.discountPercent}%
                  </span>
                </>
              )}
            </div>

            <h1 className="mt-2 sm:mt-3 text-xl sm:text-3xl lg:text-4xl font-bold leading-snug text-white [text-wrap:balance]">
              {title}
            </h1>

            <p className="mt-2 sm:mt-3 max-w-xl text-xs sm:text-base leading-relaxed text-slate-300">
              {subtitle}
            </p>

            <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onExploreOffers}
                className="hover-shimmer inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F59E0B] to-[#D97706] px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 active:scale-[0.98] cursor-pointer"
              >
                <span>{copy.exploreOffers}</span>
                {lang === 'ar' ? (
                  <ArrowDownLeft className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Photography Side */}
          <div className="relative h-40 sm:h-64 lg:col-span-6 lg:h-auto lg:min-h-[320px] bg-[#0B0F17]">
            {!imgError && banner.imageUrl ? (
              <img
                src={banner.imageUrl}
                alt={title}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="h-full w-full object-cover lg:absolute lg:inset-0"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1A2233] to-[#0B0F17] p-8 text-amber-400/50">
                <Sparkles className="h-12 w-12" />
              </div>
            )}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 ${
                lang === 'ar'
                  ? 'bg-gradient-to-t lg:bg-gradient-to-l from-[#131A26] via-[#131A26]/35 to-transparent'
                  : 'bg-gradient-to-t lg:bg-gradient-to-r from-[#131A26] via-[#131A26]/35 to-transparent'
              }`}
            />
          </div>
        </div>
      </div>
    </motion.section>
  );
};
