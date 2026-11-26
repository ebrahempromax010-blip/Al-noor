import React from 'react';
import { Headphones, Home, Laptop, ShieldCheck, ShoppingCart } from 'lucide-react';
import { Language, MainNavTab } from '../types/store';

interface BottomNavBarProps {
  lang: Language;
  activeTab: MainNavTab;
  cartCount: number;
  onSelectTab: (tab: MainNavTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  lang,
  activeTab,
  cartCount,
  onSelectTab,
}) => {
  return (
    <nav
      aria-label={lang === 'ar' ? 'التنقل الرئيسي' : 'Main Navigation'}
      className="tech-header fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-lg pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid max-w-2xl grid-cols-4 items-center px-2 py-1.5">
        {/* 1. Home (Far Right in RTL) */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          data-testid="bottom-nav-home"
          className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] sm:text-[11px] font-bold transition ${
            activeTab === 'home'
              ? 'text-blue-600 dark:text-sky-400'
              : 'tech-text-secondary hover:opacity-80'
          }`}
        >
          <Home className="h-5 w-5 shrink-0" />
          <span className="leading-tight px-0.5 text-center">
            {lang === 'ar' ? 'الرئيسية' : 'Home'}
          </span>
        </button>

        {/* 2. Computers & Accessories (Composite icon: Laptop + Headset) */}
        <button
          type="button"
          onClick={() => onSelectTab('catalog')}
          data-testid="bottom-nav-catalog"
          className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[9.5px] sm:text-[11px] font-bold transition ${
            activeTab === 'catalog'
              ? 'text-blue-600 dark:text-sky-400'
              : 'tech-text-secondary hover:opacity-80'
          }`}
        >
          <span className="relative inline-flex items-center justify-center shrink-0">
            <Laptop className="h-5 w-5" />
            <Headphones className="h-3 w-3 -ms-1.5 -mt-2.5 text-sky-500 rounded-full" />
          </span>
          <span className="leading-tight px-0.5 text-center">
            {lang === 'ar' ? 'كمبيوترات وإكسسوارات' : 'PCs & Gear'}
          </span>
        </button>

        {/* 3. Shopping Cart */}
        <button
          type="button"
          onClick={() => onSelectTab('cart')}
          data-testid="bottom-nav-cart"
          className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] sm:text-[11px] font-bold transition ${
            activeTab === 'cart'
              ? 'text-blue-600 dark:text-sky-400'
              : 'tech-text-secondary hover:opacity-80'
          }`}
        >
          <span className="relative inline-flex shrink-0">
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span
                data-testid="bottom-nav-cart-badge"
                className="absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-extrabold text-white"
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </span>
          <span className="leading-tight px-0.5 text-center">
            {lang === 'ar' ? 'سلة المشتريات' : 'Cart'}
          </span>
        </button>

        {/* 4. Admin Panel (Shield/Admin Emblem, NOT Gear) */}
        <button
          type="button"
          onClick={() => onSelectTab('admin')}
          data-testid="bottom-nav-admin"
          className={`flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10px] sm:text-[11px] font-bold transition ${
            activeTab === 'admin'
              ? 'text-blue-600 dark:text-sky-400'
              : 'tech-text-secondary hover:opacity-80'
          }`}
        >
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span className="leading-tight px-0.5 text-center">
            {lang === 'ar' ? 'الإدارة' : 'Admin'}
          </span>
        </button>
      </div>
    </nav>
  );
};
