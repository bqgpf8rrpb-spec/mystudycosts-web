'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const pathname = usePathname();
  const t = useTranslations('Footer');

  // Extract locale from pathname (format: /de/... or /en/...)
  const locale = pathname?.split('/')[1] || 'en';
  const basePath = `/${locale}`;

  const mainLinks = [
    { href: `${basePath}`, label: t('home') },
    { href: `${basePath}/calculator`, label: t('calculator') },
    { href: `${basePath}/nc-checker`, label: t('ncChecker') },
    { href: `${basePath}/about`, label: t('about') },
    { href: `${basePath}/blog`, label: t('blog') },
  ];

  const legalLinks = [
    { href: `${basePath}/privacy`, label: t('privacyPolicy') },
    { href: `${basePath}/imprint`, label: t('imprint') },
  ];

  return (
    <footer className="backdrop-blur-md bg-slate-950/80 border-t border-slate-800 mt-auto relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-6">
          {/* Main Navigation Links */}
          <nav className="flex flex-wrap justify-center gap-6">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/70 hover:text-blue-400 transition-colors text-sm"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Divider */}
          <div className="border-t border-slate-800"></div>

          {/* Data Disclaimer - Erasmus & NC Values */}
          <div className="text-center">
            <p className="text-slate-400/80 text-xs leading-relaxed max-w-3xl mx-auto">
              {t('dataDisclaimer')}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800"></div>

          {/* Affiliate Disclaimer */}
          <div className="text-center">
            <p className="text-white/40 text-xs leading-relaxed max-w-2xl mx-auto">
              {t('affiliateDisclaimer')}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-800"></div>

          {/* Legal Links and Copyright */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Legal Links */}
            <nav className="flex flex-wrap justify-center gap-4">
              {legalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-white/60 hover:text-blue-400 transition-colors text-xs"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            
            {/* Copyright */}
            <div className="text-white/50 text-xs">
              {t('copyright')}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
