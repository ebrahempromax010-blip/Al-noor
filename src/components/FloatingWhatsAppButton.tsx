import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Language } from '../types/store';
import { normalizeWhatsappDigits } from '../utils/storeLogic';

interface FloatingWhatsAppButtonProps {
  lang: Language;
  publicWhatsappNumber: string;
}

export const FloatingWhatsAppButton: React.FC<FloatingWhatsAppButtonProps> = ({
  lang,
  publicWhatsappNumber,
}) => {
  const rawDigits = (publicWhatsappNumber || '').replace(/[^\d]/g, '');
  if (!rawDigits) return null;
  const digits = normalizeWhatsappDigits(rawDigits);

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="floating-whatsapp-btn"
      aria-label={lang === 'ar' ? 'تواصل عبر واتساب المتجر' : 'Chat on WhatsApp'}
      title={lang === 'ar' ? 'واتساب التواصل السريع' : 'Quick WhatsApp Contact'}
      className="fixed bottom-20 end-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-600/35 ring-2 ring-white/80 transition hover:scale-105 hover:bg-emerald-600 active:scale-95"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  );
};
