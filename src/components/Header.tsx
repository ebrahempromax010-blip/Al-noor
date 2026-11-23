import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, Crown, Gem, Loader2, Search, Sparkles, Star, X } from 'lucide-react';
import { CloudSyncStatus, Language, WebsitePresetIcon } from '../types/store';
import { t } from '../utils/i18n';
import { PWAInstallButton } from './PWAComponents';

interface HeaderProps {
  lang: Language;
  storeName: string;
  websiteIconUrl?: string;
  websitePresetIcon?: WebsitePresetIcon;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  syncStatus: CloudSyncStatus;
  onBrandClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  storeName,
  websiteIconUrl,
  websitePresetIcon = 'crown',
  searchQuery,
  onSearchChange,
  syncStatus,
  onBrandClick,
}) => {
  const copy = t(lang);
  const [iconLoadFailed, setIconLoadFailed] = useState(false);

  useEffect(() => {
    setIconLoadFailed(false);
  }, [websiteIconUrl]);

  const renderPresetIcon = () => {
    switch (websitePresetIcon) {
      case 'gem':
        return <Gem className="h-4 w-4" />;
      case 'sparkles':
        return <Sparkles className="h-4 w-4" />;
      case 'star':
        return <Star className="h-4 w-4" />;
      case 'crown':
      default:
        return <Crown className="h-4 w-4" />;
    }
  };

  const showCustomImage = Boolean(websiteIconUrl && !iconLoadFailed);

  const syncDisplay = (() => {
    switch (syncStatus) {
      case 'synced':
        return {
          icon: <Cloud className="h-4 w-4 text-emerald-400" />,
          label: copy.liveSyncSynced,
          cls: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
        };
      case 'saving':
      case 'connecting':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin text-amber-400" />,
          label: syncStatus === 'saving' ? copy.liveSyncSaving : copy.liveSyncConnecting,
          cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
        };
      case 'offline':
        return {
          icon: <CloudOff className="h-4 w-4 text-amber-400" />,
          label: copy.liveSyncOffline,
          cls: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
        };
      default:
        return {
          icon: <CloudOff className="h-4 w-4 text-rose-400" />,
          label: copy.liveSyncError,
          cls: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
        };
    }
  })();

  return (
    <header className="sticky top-0 z-40 border-b border-amber-500/20 bg-[#0B0F17]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:gap-6 sm:px-6">
        {/* Zone 1: Brand Mark */}
        <button
          type="button"
          onClick={onBrandClick}
          className="flex items-center gap-2 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-lg py-1"
          aria-label={storeName}
        >
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-amber-400/35 bg-gradient-to-br from-amber-400/20 via-amber-500/10 to-transparent text-amber-400 shadow-inner">
            {showCustomImage ? (
              <img
                src={websiteIconUrl}
                alt={storeName}
                onError={() => setIconLoadFailed(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              renderPresetIcon()
            )}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-display-luxury text-base sm:text-xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent whitespace-nowrap">
              {storeName}
            </span>
            {!showCustomImage && (
              <Gem className="hidden sm:inline-block h-3.5 w-3.5 text-amber-400/80" />
            )}
          </span>
        </button>

        {/* Zone 2: Smart Instant Search */}
        <div className="relative flex-1 max-w-md">
          <label htmlFor="store-search" className="sr-only">
            {copy.searchPlaceholder}
          </label>
          <Search
            className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-amber-400/70 ${
              lang === 'ar' ? 'right-3' : 'left-3'
            }`}
          />
          <input
            id="store-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={copy.searchPlaceholder}
            className={`h-9 w-full rounded-xl border border-amber-500/25 bg-[#131A26] text-xs sm:text-sm text-slate-100 placeholder:text-slate-400 transition focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 ${
              lang === 'ar' ? 'pr-9 pl-8' : 'pl-9 pr-8'
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
              className={`absolute top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-white cursor-pointer ${
                lang === 'ar' ? 'left-2' : 'right-2'
              }`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Zone 3: Real Live Cloud Sync Indicator + Optional PWA Install */}
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton lang={lang} storeName={storeName} />
          <div
            title={syncDisplay.label}
            aria-label={syncDisplay.label}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${syncDisplay.cls}`}
          >
            {syncDisplay.icon}
            <span className="hidden md:inline">{syncDisplay.label}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
