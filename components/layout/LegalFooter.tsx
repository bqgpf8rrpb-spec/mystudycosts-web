'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LegalFooter() {
  const pathname = usePathname();
  
  // Extract locale from pathname (format: /de/... or /en/...)
  const locale = pathname?.split('/')[1] || 'de';
  const basePath = `/${locale}`;

  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-500 text-xs py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Impressum Section */}
          <div className="space-y-2">
            <h3 className="text-slate-400 font-semibold mb-3">Impressum</h3>
            <div className="space-y-1">
              <p>Maurice Sill</p>
              <p>Altenbekener Damm 10</p>
              <p>30173 Hannover</p>
              <p>Deutschland</p>
              <p className="mt-2">
                E-Mail: <a href="mailto:contact.mystudycosts@gmail.com" className="text-blue-400 hover:text-blue-300 underline">contact.mystudycosts@gmail.com</a>
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-900"></div>

          {/* Affiliate Hinweis */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <p className="text-slate-300 leading-relaxed">
              <strong className="text-slate-200">Transparenz:</strong> Einige Links auf dieser Seite sind Affiliate-Links. 
              Wenn du darüber einen Vertrag abschließt, erhalten wir eine Provision. 
              Dies hat keinen Einfluss auf deine Kosten oder unsere redaktionelle Unabhängigkeit.
            </p>
          </div>

          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              href={`${basePath}/imprint`}
              className="text-slate-400 hover:text-blue-400 transition-colors"
            >
              Impressum
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              href={`${basePath}/privacy`}
              className="text-slate-400 hover:text-blue-400 transition-colors"
            >
              Datenschutz
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              href={`${basePath}/imprint#haftung`}
              className="text-slate-400 hover:text-blue-400 transition-colors"
            >
              Haftungsausschluss
            </Link>
          </div>

          {/* Copyright */}
          <div className="text-center text-slate-600 pt-4">
            © 2026 MyStudyCosts. Alle Rechte vorbehalten.
          </div>
        </div>
      </div>
    </footer>
  );
}

