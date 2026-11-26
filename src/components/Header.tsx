import React from 'react';
import { Download, Globe, Search, Settings, Smartphone, X } from 'lucide-react';
import { Language, UploadedAppFiles } from '../types/store';
import { PWAInstallButton } from './PWAComponents';

interface HeaderProps {
  lang: Language;
  storeName: string;
  tagline: string;
  iconUrl: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToggleLanguage: () => void;
  onOpenSettings: () => void;
  unreadRestockCount: number;
  isPWAInstalled: boolean;
  uploadedAppFiles?: UploadedAppFiles;
  onInstallClick: () => void;
  onLogoClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  storeName,
  tagline,
  iconUrl,
  searchQuery,
  onSearchChange,
  onToggleLanguage,
  onOpenSettings,
  unreadRestockCount,
  isPWAInstalled,
  uploadedAppFiles,
  onInstallClick,
  onLogoClick,
}) => {
  const androidApk = uploadedAppFiles?.androidApk;
  const iosApp = uploadedAppFiles?.iosApp;

  return (
    <header className="tech-header sticky top-0 z-30 border-b backdrop-blur-md">
      {/* Row 1: Top-Right Gear (User Settings + AI Support), Center/Brand + Install App, Top-Left Language */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        {/* Start side (Far Top-Right in RTL): User Settings Gear + Red Unread Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onOpenSettings}
            data-testid="user-settings-gear-btn"
            aria-label={
              lang === 'ar'
                ? 'إعدادات التطبيق وخدمة العملاء الذكية'
                : 'App Settings & Smart AI Support'
            }
            className="tech-surface-muted relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition hover:border-blue-500/50 active:scale-95"
          >
            <Settings className="h-5 w-5" />
            {unreadRestockCount > 0 && (
              <span
                data-testid="restock-unread-badge"
                className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-extrabold text-white ring-2 ring-white dark:ring-slate-900"
              >
                {unreadRestockCount > 9 ? '9+' : unreadRestockCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onLogoClick}
            className="flex items-center gap-2 text-start min-w-0"
          >
            <img
              src={iconUrl}
              alt={storeName}
              className="h-10 w-10 shrink-0 rounded-xl border border-blue-500/25 object-cover shadow-sm"
            />
            <div className="min-w-0">
              <h1 className="truncate text-sm sm:text-base font-extrabold tracking-tight">
                {storeName}
              </h1>
              <p className="tech-text-secondary hidden md:block truncate text-[11px]">
                {tagline}
              </p>
            </div>
          </button>
        </div>

        {/* End side (Far Top-Left in RTL): Install App + Admin-uploaded APK/IPA Direct Icons + Language Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {androidApk?.fileUrl && (
            <a
              href={androidApk.fileUrl}
              download={androidApk.fileName || 'Al-Nour-Computer.apk'}
              data-testid="header-download-apk-btn"
              title={
                lang === 'ar'
                  ? `تنزيل تطبيق الأندرويد (${androidApk.fileName})`
                  : `Download Android APK (${androidApk.fileName})`
              }
              aria-label={lang === 'ar' ? 'تنزيل ملف APK للأندرويد' : 'Download Android APK'}
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-emerald-500/35 bg-emerald-600/15 px-2 sm:px-2.5 text-[11px] sm:text-xs font-extrabold text-emerald-600 dark:text-emerald-400 transition hover:bg-emerald-600/25 active:scale-95"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span>APK</span>
            </a>
          )}

          {iosApp?.fileUrl && (
            <a
              href={iosApp.fileUrl}
              download={iosApp.fileName || 'Al-Nour-Computer.ipa'}
              data-testid="header-download-ios-btn"
              title={
                lang === 'ar'
                  ? `تنزيل تطبيق الآيفون (${iosApp.fileName})`
                  : `Download iPhone App (${iosApp.fileName})`
              }
              aria-label={lang === 'ar' ? 'تنزيل ملف الآيفون IPA' : 'Download iPhone IPA'}
              className="inline-flex h-10 items-center gap-1 rounded-xl border border-blue-500/35 bg-blue-600/15 px-2 sm:px-2.5 text-[11px] sm:text-xs font-extrabold text-blue-600 dark:text-sky-400 transition hover:bg-blue-600/25 active:scale-95"
            >
              <Smartphone className="h-3.5 w-3.5 shrink-0" />
              <span>IPA</span>
            </a>
          )}

          <PWAInstallButton
            lang={lang}
            isInstalled={isPWAInstalled}
            onClick={onInstallClick}
          />

          <button
            type="button"
            onClick={onToggleLanguage}
            data-testid="lang-toggle-btn"
            aria-label={lang === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
            className="tech-surface-muted inline-flex h-10 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-xs font-extrabold transition hover:border-blue-500/40"
          >
            <Globe className="h-4 w-4 text-blue-500" />
            <span>{lang === 'ar' ? 'EN' : 'AR'}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Wide Search Bar directly below Header */}
      <div className="mx-auto max-w-7xl px-3 pb-3 sm:px-6">
        <div className="relative flex items-center">
          <Search className="tech-text-secondary pointer-events-none absolute start-3.5 h-4 w-4" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            data-testid="store-search-input"
            placeholder={lang === 'ar' ? 'ابحث عن منتجك...' : 'Search for your product...'}
            className="tech-surface-muted w-full rounded-xl border py-2.5 ps-10 pe-10 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label={lang === 'ar' ? 'مسح البحث' : 'Clear search'}
              className="tech-text-secondary absolute end-3 rounded-lg p-1 hover:opacity-80"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
