'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, Calculator, Settings } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import cityCoordinates from '@/data/city-coordinates.json';
import { useUserStore } from '@/lib/store/useUserStore';
import { useTranslations } from 'next-intl';
import OnboardingHint from '@/components/OnboardingHint';

type CurrencyCode = 'EUR' | 'USD' | 'INR';

export default function Navbar() {
  const t = useTranslations('Navbar');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  const { userGpa, homeCity, setUserGpa, setHomeCity, language, setLanguage, isFirstVisit, setIsFirstVisit } = useUserStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const [gpaInput, setGpaInput] = useState('');
  const [citySearch, setCitySearch] = useState('');
  
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
    { href: `${basePath}`, label: t('home') },
    { href: `${basePath}/calculator`, label: t('calculator') },
    { href: `${basePath}/nc-checker`, label: t('ncChecker') },
    { href: `${basePath}/erasmus`, label: t('erasmus') },
    { href: `${basePath}/about`, label: t('about') },
    { href: `${basePath}/blog`, label: t('blog') },
  ];

  const availableCities = useMemo(() => {
    return Object.keys(cityCoordinates as Record<string, { lat: number; lng: number }>).sort((a, b) =>
      a.localeCompare(b)
    );
  }, []);

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return availableCities.slice(0, 15);
    const search = citySearch.toLowerCase();
    return availableCities.filter((city) => city.toLowerCase().includes(search)).slice(0, 15);
  }, [availableCities, citySearch]);

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

  useEffect(() => {
    if (locale === 'de' || locale === 'en') {
      if (language !== locale) {
        setLanguage(locale);
      }
    }
  }, [locale, language, setLanguage]);

  useEffect(() => {
    setGpaInput(userGpa == null ? '' : userGpa.toFixed(1));
  }, [userGpa]);

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

  const handleGpaCommit = () => {
    const normalized = gpaInput.replace(',', '.').trim();
    if (!normalized) {
      setUserGpa(null);
      return;
    }
    const parsed = Number.parseFloat(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 4) return;
    setUserGpa(Number(parsed.toFixed(2)));
  };

  const switchLanguage = (targetLocale: 'de' | 'en') => {
    if (!pathname) return;
    const segments = pathname.split('/');
    if (segments.length > 1 && (segments[1] === 'de' || segments[1] === 'en')) {
      segments[1] = targetLocale;
    } else {
      segments.splice(1, 0, targetLocale);
    }
    const targetPath = segments.join('/') || `/${targetLocale}`;
    setLanguage(targetLocale);
    router.push(targetPath);
  };

  const handleProfileToggle = () => {
    if (isFirstVisit) {
      setIsFirstVisit(false);
    }
    setProfileOpen((prev) => !prev);
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

            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/50 p-1">
              {(['de', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => switchLanguage(lang)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${
                    locale === lang ? 'bg-blue-600 text-white' : 'text-white/70 hover:text-white'
                  }`}
                  aria-label={lang === 'de' ? t('switchToGerman') : t('switchToEnglish')}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={handleProfileToggle}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-slate-900/60 p-2 text-white/80 transition-colors hover:border-blue-400/50 hover:text-white"
                aria-label={t('profileSettings')}
              >
                <Settings className="h-4 w-4" />
              </button>
              {isFirstVisit && (
                <OnboardingHint
                  text={t('onboardingHint')}
                  buttonLabel={t('onboardingGotIt')}
                  onDismiss={() => setIsFirstVisit(false)}
                />
              )}
              {profileOpen && (
                <div className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-white/15 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md">
                  <p className="text-sm font-semibold text-white">{t('profileSettings')}</p>
                  <p className="mt-1 text-xs text-white/60">{t('profileSettingsHint')}</p>

                  <div className="mt-4">
                    <label className="mb-1 block text-xs text-white/70">{t('gpaLabel')}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={gpaInput}
                      onChange={(event) => setGpaInput(event.target.value)}
                      onBlur={handleGpaCommit}
                      placeholder={t('gpaPlaceholder')}
                      className="w-full rounded-md border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blue-400/60"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="mb-1 block text-xs text-white/70">{t('homeCityLabel')}</label>
                    <input
                      type="text"
                      value={citySearch}
                      onChange={(event) => setCitySearch(event.target.value)}
                      placeholder={homeCity || t('homeCityPlaceholder')}
                      className="w-full rounded-md border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blue-400/60"
                    />
                    <div className="mt-2 max-h-36 overflow-y-auto rounded-md border border-white/10 bg-slate-900/60">
                      {filteredCities.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setHomeCity(city);
                            setCitySearch('');
                          }}
                          className={`block w-full px-3 py-1.5 text-left text-xs transition-colors ${
                            homeCity === city
                              ? 'bg-blue-500/20 text-blue-200'
                              : 'text-white/80 hover:bg-white/10'
                          }`}
                        >
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden text-white/80 hover:text-white transition-colors"
            onClick={toggleMobileMenu}
            aria-label={t('toggleMenu')}
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
                <div className="text-white/60 text-xs mb-2">{t('currency')}</div>
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

              <div className="px-2 pt-2 border-t border-slate-800">
                <div className="text-white/60 text-xs mb-2">{t('language')}</div>
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-900/50 p-1 w-fit">
                  {(['de', 'en'] as const).map((lang) => (
                    <button
                      key={`mobile-${lang}`}
                      type="button"
                      onClick={() => {
                        switchLanguage(lang);
                        closeMobileMenu();
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        locale === lang ? 'bg-blue-600 text-white' : 'text-white/70 hover:text-white'
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-2 pt-2 border-t border-slate-800">
                <div className="text-white/60 text-xs mb-2">{t('profile')}</div>
                <label className="block text-xs text-white/70 mb-1">{t('gpaLabel')}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={gpaInput}
                  onChange={(event) => setGpaInput(event.target.value)}
                  onBlur={handleGpaCommit}
                  placeholder={t('gpaPlaceholder')}
                  className="w-full rounded-md border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blue-400/60"
                />
                <label className="block text-xs text-white/70 mt-3 mb-1">{t('homeCityLabel')}</label>
                <input
                  type="text"
                  value={citySearch}
                  onChange={(event) => setCitySearch(event.target.value)}
                  placeholder={homeCity || t('homeCityPlaceholder')}
                  className="w-full rounded-md border border-white/15 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-blue-400/60"
                />
                <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-white/10 bg-slate-900/60">
                  {filteredCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        setHomeCity(city);
                        setCitySearch('');
                      }}
                      className={`block w-full px-3 py-1.5 text-left text-xs transition-colors ${
                        homeCity === city
                          ? 'bg-blue-500/20 text-blue-200'
                          : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
