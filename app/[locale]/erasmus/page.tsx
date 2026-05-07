import dynamic from 'next/dynamic';
import FAQ from '@/components/seo/FAQ';
import TLDR from '@/components/seo/TLDR';
import type { Metadata } from 'next';
import { FAQ_BY_PAGE } from '@/data/faq';
import { TLDR_BY_PAGE } from '@/data/tldr';
import { getTranslations } from 'next-intl/server';
import ErrorBoundary from '@/components/ErrorBoundary';

import { getBaseUrl } from '@/lib/site-config';

const baseUrl = getBaseUrl();
const ErasmusPageContent = dynamic(() => import('@/components/ErasmusPageContent'), {
  loading: () => (
    <div className="max-w-7xl mx-auto backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 animate-pulse">
      <div className="h-10 w-2/3 rounded bg-slate-700/70 mb-4 mx-auto" />
      <div className="h-4 w-1/2 rounded bg-slate-800/80 mx-auto" />
    </div>
  ),
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'ErasmusPage' });

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      canonical: `${baseUrl}/${locale}/erasmus`,
    },
  };
}

export default async function ErasmusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const faqItems = FAQ_BY_PAGE.erasmus[locale as 'de' | 'en'] ?? FAQ_BY_PAGE.erasmus.en;
  const tldr = TLDR_BY_PAGE.erasmus[locale as 'de' | 'en'] ?? TLDR_BY_PAGE.erasmus.en;
  const tError = await getTranslations({ locale, namespace: 'ErrorBoundary' });

  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 pb-40">
      <div className="max-w-6xl mx-auto mb-8">
        <TLDR summary={tldr.summary} highlights={tldr.highlights} />
      </div>
      <ErrorBoundary
        title={tError('toolErrorTitle')}
        message={tError('toolErrorMessage')}
        retryLabel={tError('retry')}
      >
        <ErasmusPageContent />
      </ErrorBoundary>
      <section className="max-w-6xl mx-auto mt-16 px-4">
        <FAQ items={faqItems} />
      </section>
    </main>
  );
}
