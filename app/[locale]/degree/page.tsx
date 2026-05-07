import { getTranslations } from 'next-intl/server';
import DegreeFinder from '@/components/DegreeFinder';
import FAQ from '@/components/seo/FAQ';
import TLDR from '@/components/seo/TLDR';
import type { Metadata } from 'next';
import { FAQ_BY_PAGE } from '@/data/faq';
import { TLDR_BY_PAGE } from '@/data/tldr';

import { getBaseUrl } from '@/lib/site-config';

const baseUrl = getBaseUrl();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'DegreeFinder' });

  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: {
      canonical: `${baseUrl}/${locale}/degree`,
    },
  };
}

export default async function DegreePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const faqItems = FAQ_BY_PAGE.degree[locale as 'de' | 'en'] ?? FAQ_BY_PAGE.degree.en;
  const tldr = TLDR_BY_PAGE.degree[locale as 'de' | 'en'] ?? TLDR_BY_PAGE.degree.en;

  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 pb-40">
      <div className="max-w-7xl mx-auto">
        <TLDR summary={tldr.summary} highlights={tldr.highlights} />
        <DegreeFinder />
        <section className="mt-16">
          <FAQ items={faqItems} />
        </section>
      </div>
    </main>
  );
}

