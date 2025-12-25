'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type ConsentStatus = 'accepted' | 'declined' | null;

interface CookieConsentContextType {
  consent: ConsentStatus;
  setConsent: (status: ConsentStatus) => void;
  hasConsented: boolean;
}

const CookieConsentContext = createContext<CookieConsentContextType | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsentState] = useState<ConsentStatus>(null);
  const [hasConsented, setHasConsented] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cookieConsent') as ConsentStatus;
      if (stored === 'accepted' || stored === 'declined') {
        setConsentState(stored);
        setHasConsented(stored === 'accepted');
      }
    }
  }, []);

  const setConsent = (status: ConsentStatus) => {
    setConsentState(status);
    setHasConsented(status === 'accepted');
    if (typeof window !== 'undefined') {
      if (status) {
        localStorage.setItem('cookieConsent', status);
      } else {
        localStorage.removeItem('cookieConsent');
      }
    }
  };

  return (
    <CookieConsentContext.Provider value={{ consent, setConsent, hasConsented }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (context === undefined) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
}

