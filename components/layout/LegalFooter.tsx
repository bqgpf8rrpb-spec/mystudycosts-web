'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function LegalFooter() {
  const pathname = usePathname();
  const t = useTranslations('Footer');

  // Extract locale from pathname (format: /de/... or /en/...)
  const locale = pathname?.split('/')[1] || 'de';
  const basePath = `/${locale}`;

  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-500 text-xs py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Imprint Section */}
          <div className="space-y-2">
            <h3 className="text-slate-400 font-semibold mb-3">{t('imprint')}</h3>
            <div className="space-y-1">
              <p>Maurice Sill</p>
              <p>Altenbekener Damm 10</p>
              <p>30173 Hannover</p>
              <p>Germany</p>
              <p className="mt-2">
                Email: <a href="mailto:contact.mystudycosts@gmail.com" className="text-blue-400 hover:text-blue-300 underline">contact.mystudycosts@gmail.com</a>
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-900"></div>

          {/* Affiliate Notice */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-300 leading-relaxed">
              <strong className="text-slate-200">Transparency:</strong> Some links on this page are affiliate links. 
              If you sign a contract through them, we receive a commission. 
              This has no impact on your costs or our editorial independence.
            </p>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              href={`${basePath}/imprint`}
              className="text-slate-400 hover:text-blue-400 transition-colors"
            >
              {t('imprint')}
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              href={`${basePath}/privacy`}
              className="text-slate-400 hover:text-blue-400 transition-colors"
            >
              {t('privacyPolicy')}
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              href={`${basePath}/imprint#haftung`}
              className="text-slate-400 hover:text-blue-400 transition-colors"
            >
              {t('disclaimer')}
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-center text-slate-600 pt-4">
            © 2026 MyStudyCosts. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

