'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  // Extract locale from pathname (format: /de/... or /en/...)
  const locale = pathname?.split('/')[1] || 'en';
  const basePath = `/${locale}`;

  const mainLinks = [
    { href: `${basePath}`, label: 'Home' },
    { href: `${basePath}/calculator`, label: 'Calculator' },
    { href: `${basePath}/nc-checker`, label: 'NC-Checker' },
    { href: `${basePath}/about`, label: 'About' },
    { href: `${basePath}/blog`, label: 'Blog' },
  ];

  const legalLinks = [
    { href: `${basePath}/privacy`, label: 'Privacy Policy' },
    { href: `${basePath}/imprint`, label: 'Imprint' },
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

          {/* Affiliate Disclaimer */}
          <div className="text-center">
            <p className="text-white/40 text-xs leading-relaxed max-w-2xl mx-auto">
              Transparenz: Diese Seite wird sich in Zukunft teilweise über Partnerlinks finanzieren. Solche Links werden klar als "Anzeige" gekennzeichnet.
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
              © 2025 MyStudyCosts. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
