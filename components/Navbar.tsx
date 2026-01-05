'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Calculator } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

type CurrencyCode = 'EUR' | 'USD' | 'INR';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  
  // Currency toggle options (simplified for Navbar)
  const currencyOptions: CurrencyCode[] = ['EUR', 'USD', 'INR'];
  const currencySymbols: Record<CurrencyCode, string> = {
    EUR: '€',
    USD: '$',
    INR: '₹',
  };

  // Extract locale from pathname (format: /de/... or /en/...)
  const locale = pathname?.split('/')[1] || 'en';
  const basePath = `/${locale}`;

  const menuItems = [
    { href: `${basePath}`, label: 'Home' },
    { href: `${basePath}/calculator`, label: 'Calculator' },
    { href: `${basePath}/nc-checker`, label: 'NC-Checker' },
    { href: `${basePath}/erasmus`, label: 'Erasmus' },
    { href: `${basePath}/about`, label: 'About' },
    { href: `${basePath}/blog`, label: 'Blog' },
  ];

  const isActive = (href: string) => {
    const currentPath = pathname || '';
    return currentPath === href || currentPath.startsWith(href + '/');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Hydration guard: only render currency toggle after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCurrencyChange = (currency: CurrencyCode) => {
    const previousCurrency = selectedCurrency;
    setSelectedCurrency(currency);
    // Track currency change event
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'change_currency', {
        currency: currency,
        previous_currency: previousCurrency,
      });
    }
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={basePath} className="flex items-center gap-2 group transition-all duration-200">
            <Calculator className="w-6 h-6 text-blue-400 group-hover:text-blue-300 transition-colors" />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent font-bold text-xl hover:from-blue-300 hover:via-purple-300 hover:to-blue-300 transition-all duration-200">
              MyStudyCosts
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {menuItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition-colors relative group py-2 ${
                    active
                      ? 'text-blue-400'
                      : 'text-white/80 hover:text-blue-400'
                  }`}
                >
                  {item.label}
                  <span className={`absolute bottom-0 left-0 h-0.5 bg-blue-400 transition-all duration-300 ${
                    active ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}></span>
                </Link>
              );
            })}
            
            {/* Currency Toggle */}
            <div className="flex items-center gap-1 bg-slate-900/50 border border-white/10 rounded-full p-1">
              {!mounted ? (
                // Skeleton placeholder - matches exact dimensions of currency buttons
                <>
                  <div className="px-3 py-1.5 rounded-full bg-slate-800/50 w-[36px] h-[28px]"></div>
                  <div className="px-3 py-1.5 rounded-full bg-slate-800/50 w-[36px] h-[28px]"></div>
                  <div className="px-3 py-1.5 rounded-full bg-slate-800/50 w-[36px] h-[28px]"></div>
                </>
              ) : (
                // Real currency buttons with active state
                currencyOptions.map((currency) => (
                  <button
                    key={currency}
                    type="button"
                    onClick={() => handleCurrencyChange(currency)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      selectedCurrency === currency
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-white/70 hover:text-white/90 hover:bg-white/5'
                    }`}
                  >
                    {currencySymbols[currency]}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden text-white/80 hover:text-white transition-colors"
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 py-4">
            <div className="flex flex-col space-y-4">
              {menuItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`transition-colors px-2 py-2 rounded-md ${
                      active
                        ? 'text-blue-400 bg-white/5'
                        : 'text-white/80 hover:text-blue-400 hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              
              {/* Mobile Currency Toggle */}
              <div className="px-2 pt-2 border-t border-slate-800">
                <div className="text-white/60 text-xs mb-2">Currency</div>
                <div className="flex items-center gap-1 bg-slate-900/50 border border-white/10 rounded-full p-1 w-fit">
                  {!mounted ? (
                    // Skeleton placeholder - matches exact dimensions of currency buttons
                    <>
                      <div className="px-3 py-1.5 rounded-full bg-slate-800/50 w-[36px] h-[28px]"></div>
                      <div className="px-3 py-1.5 rounded-full bg-slate-800/50 w-[36px] h-[28px]"></div>
                      <div className="px-3 py-1.5 rounded-full bg-slate-800/50 w-[36px] h-[28px]"></div>
                    </>
                  ) : (
                    // Real currency buttons with active state
                    currencyOptions.map((currency) => (
                      <button
                        key={currency}
                        type="button"
                        onClick={() => {
                          handleCurrencyChange(currency);
                          closeMobileMenu();
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                          selectedCurrency === currency
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-white/70 hover:text-white/90 hover:bg-white/5'
                        }`}
                      >
                        {currencySymbols[currency]}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
