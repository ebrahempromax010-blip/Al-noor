import React from 'react';
import {
  Baby,
  Coins,
  Crown,
  Gem,
  Heart,
  Percent,
  Sparkles,
  Tag,
  Watch,
} from 'lucide-react';
import { Category, Language } from '../types/store';

interface CategoryBarProps {
  lang: Language;
  categories: Category[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

function getCategoryIcon(iconName: string) {
  switch (iconName) {
    case 'percent':
      return <Percent className="h-4 w-4" />;
    case 'crown':
      return <Crown className="h-4 w-4" />;
    case 'watch':
      return <Watch className="h-4 w-4" />;
    case 'heart':
    case 'baby':
      return <Heart className="h-4 w-4" />;
    case 'gem':
      return <Gem className="h-4 w-4" />;
    case 'coins':
      return <Coins className="h-4 w-4" />;
    case 'tag':
      return <Tag className="h-4 w-4" />;
    case 'kids':
      return <Baby className="h-4 w-4" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
}

export const CategoryBar: React.FC<CategoryBarProps> = ({
  lang,
  categories,
  activeCategory,
  onSelectCategory,
}) => {
  return (
    <nav
      aria-label={lang === 'ar' ? 'أقسام المجوهرات' : 'Jewelry Categories'}
      className="mx-auto max-w-7xl px-3 pt-5 sm:px-6 sm:pt-7"
    >
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          const label = lang === 'ar' ? cat.nameAr : cat.nameEn;
          const isOffers = cat.id === 'offers';

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              aria-pressed={isActive}
              className={`flex min-h-[42px] items-center gap-2 rounded-xl border px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition cursor-pointer ${
                isActive
                  ? 'border-amber-400 bg-gradient-to-r from-[#D4AF37] to-[#F59E0B] text-slate-950 shadow-md shadow-amber-500/20'
                  : isOffers
                    ? 'border-rose-500/35 bg-rose-500/10 text-rose-300 hover:border-rose-400/60 hover:bg-rose-500/15'
                    : 'border-amber-500/20 bg-[#131A26] text-slate-200 hover:border-amber-400/50 hover:text-amber-200'
              }`}
            >
              {getCategoryIcon(cat.icon)}
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
