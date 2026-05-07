import dynamic from 'next/dynamic';
import FAQ from '@/components/seo/FAQ';
import TLDR from '@/components/seo/TLDR';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { FAQ_BY_PAGE } from '@/data/faq';
import { TLDR_BY_PAGE } from '@/data/tldr';
import ErrorBoundary from '@/components/ErrorBoundary';

import { getBaseUrl } from '@/lib/site-config';

const baseUrl = getBaseUrl();
const StudyCostCalculator = dynamic(() => import('@/components/StudyCostCalculator'), {
  loading: () => (
    <div className="max-w-7xl mx-auto backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 animate-pulse">
      <div className="h-5 w-48 rounded bg-slate-700/70 mb-4" />
      <div className="h-4 w-72 rounded bg-slate-800/80 mb-2" />
      <div className="h-4 w-64 rounded bg-slate-800/80" />
    </div>
  ),
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'CalculatorPage' });

  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: {
      canonical: `${baseUrl}/${locale}/calculator`,
      languages: {
        de: `${baseUrl}/de/calculator`,
        en: `${baseUrl}/en/calculator`,
        'x-default': `${baseUrl}/de/calculator`,
      },
    },
  };
}

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'CalculatorPage' });
  const tError = await getTranslations({ locale, namespace: 'ErrorBoundary' });
  const faqItems = FAQ_BY_PAGE.calculator[locale as 'de' | 'en'] ?? FAQ_BY_PAGE.calculator.en;
  const tldr = TLDR_BY_PAGE.calculator[locale as 'de' | 'en'] ?? TLDR_BY_PAGE.calculator.en;
  const calculatorJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: locale === 'de' ? 'Studienkosten-Rechner' : 'Study Cost Calculator',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    inLanguage: locale === 'de' ? 'de-DE' : 'en-US',
    isAccessibleForFree: true,
    description: t('subtitle'),
    url: `${baseUrl}/${locale}/calculator`,
  };

  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorJsonLd) }}
      />
      <div className="max-w-7xl mx-auto mb-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h1>
          <p className="text-white/70 text-lg">
            {t('subtitle')}
          </p>
        </div>
        <TLDR summary={tldr.summary} highlights={tldr.highlights} />
      </div>
      <ErrorBoundary
        title={tError('toolErrorTitle')}
        message={tError('toolErrorMessage')}
        retryLabel={tError('retry')}
      >
        <StudyCostCalculator />
      </ErrorBoundary>
      <section className="max-w-7xl mx-auto mt-16 pb-16">
        <FAQ items={faqItems} />
      </section>
    </main>
  );
}
