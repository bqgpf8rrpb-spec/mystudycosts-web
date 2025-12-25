'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type CurrencyCode = 'EUR' | 'USD' | 'INR' | 'CNY' | 'GBP';

interface CurrencyContextType {
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (currency: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selectedCurrency, setSelectedCurrencyState] = useState<CurrencyCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedCurrency') as CurrencyCode | null;
      return saved && ['EUR', 'USD', 'INR', 'CNY', 'GBP'].includes(saved) ? saved : 'EUR';
    }
    return 'EUR';
  });

  const setSelectedCurrency = (currency: CurrencyCode) => {
    setSelectedCurrencyState(currency);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedCurrency', currency);
      // Dispatch event for components that might be listening
      window.dispatchEvent(new CustomEvent('currencyChanged', { detail: currency }));
    }
  };

  // Sync across tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedCurrency' && e.newValue) {
        const newCurrency = e.newValue as CurrencyCode;
        if (['EUR', 'USD', 'INR', 'CNY', 'GBP'].includes(newCurrency)) {
          setSelectedCurrencyState(newCurrency);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <CurrencyContext.Provider value={{ selectedCurrency, setSelectedCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

