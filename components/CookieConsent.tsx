'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Cookie } from 'lucide-react';
import { useCookieConsent } from '@/contexts/CookieConsentContext';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('CookieConsent');
  const { consent, setConsent } = useCookieConsent();
  
  // Extract locale from pathname
  const locale = pathname?.split('/')[1] || 'en';
  const privacyPath = `/${locale}/privacy`;
  const imprintPath = `/${locale}/imprint`;

  useEffect(() => {
    // Check if user has already consented
    if (consent === null) {
      // Small delay to avoid flash
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [consent]);

  const handleAccept = () => {
    setConsent('accepted');
    setIsVisible(false);
  };

  const handleDecline = () => {
    setConsent('declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 transform transition-all duration-300 ease-in-out">
      <div className="max-w-7xl mx-auto">
        <div className="backdrop-blur-md bg-slate-950/95 border border-white/20 rounded-xl shadow-2xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="backdrop-blur-sm bg-blue-600/20 border border-blue-500/30 rounded-lg p-2 flex-shrink-0">
                <Cookie className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-white text-sm sm:text-base leading-relaxed">
                  {t('message')}
                </p>
                <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
                  {t('legalLinks')}{' '}
                  <Link 
                    href={privacyPath}
                    className="text-blue-400 hover:text-blue-300 underline font-medium transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t('privacyPolicy')}
                  </Link>
                  {' '}{t('and')}{' '}
                  <Link 
                    href={imprintPath}
                    className="text-blue-400 hover:text-blue-300 underline font-medium transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t('imprint')}
                  </Link>
                  .
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto">
              <button
                onClick={handleDecline}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                {t('decline')}
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shadow-lg"
              >
                {t('accept')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
