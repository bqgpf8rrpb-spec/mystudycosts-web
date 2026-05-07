import dynamic from 'next/dynamic';
import FAQ from '@/components/seo/FAQ';
import TLDR from '@/components/seo/TLDR';
import NCDataDisclaimer from '@/components/legal/NCDataDisclaimer';
import ErrorBoundary from '@/components/ErrorBoundary';
import type { Metadata } from 'next';
import { FAQ_BY_PAGE } from '@/data/faq';
import { TLDR_BY_PAGE } from '@/data/tldr';
import { getTranslations } from 'next-intl/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getBaseUrl } from '@/lib/site-config';

const baseUrl = getBaseUrl();
const NCCheckerContent = dynamic(() => import('@/components/NCCheckerContent'), {
  loading: () => (
    <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 animate-pulse">
      <div className="h-8 w-64 rounded bg-slate-700/70 mb-4" />
      <div className="h-4 w-full rounded bg-slate-800/80 mb-2" />
      <div className="h-4 w-4/5 rounded bg-slate-800/80" />
    </div>
  ),
});

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ program?: string; city?: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const { program, city } = (await searchParams) ?? {};
  const t = await getTranslations({ locale, namespace: 'NCChecker' });
  const normalizedProgram = program?.trim();
  const normalizedCity = city?.trim();
  const isGerman = locale === 'de';

  const title =
    normalizedProgram && normalizedCity
      ? isGerman
        ? `NC für ${normalizedProgram} in ${normalizedCity} 2026 | mystudycosts`
        : `Admission limits for ${normalizedProgram} in ${normalizedCity} 2026 | mystudycosts`
      : normalizedProgram
        ? isGerman
          ? `NC für ${normalizedProgram} 2026 | mystudycosts`
          : `Admission limits for ${normalizedProgram} 2026 | mystudycosts`
        : t('pageTitle');

  const description =
    normalizedProgram && normalizedCity
      ? isGerman
        ? `Aktuelle NC-Werte, Zulassungstrends und Studienkosten für ${normalizedProgram} in ${normalizedCity} (Stand 2026).`
        : `Current admission limits, admission trends, and study costs for ${normalizedProgram} in ${normalizedCity} (2026).`
      : t('pageDescription');

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}/${locale}/nc-checker`,
      languages: {
        de: `${baseUrl}/de/nc-checker`,
        en: `${baseUrl}/en/nc-checker`,
        'x-default': `${baseUrl}/de/nc-checker`,
      },
    },
  };
}

export default async function NCCheckerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const faqItems = FAQ_BY_PAGE['nc-checker'][locale as 'de' | 'en'] ?? FAQ_BY_PAGE['nc-checker'].en;
  const tldr = TLDR_BY_PAGE['nc-checker'][locale as 'de' | 'en'] ?? TLDR_BY_PAGE['nc-checker'].en;
  const tError = await getTranslations({ locale, namespace: 'ErrorBoundary' });
  let formattedLastUpdated: string | null = null;

  try {
    const programsRaw = await readFile(join(process.cwd(), 'data', 'university_programs.json'), 'utf8');
    const programsData = JSON.parse(programsRaw) as { last_updated?: string };
    if (programsData.last_updated) {
      formattedLastUpdated = new Date(programsData.last_updated).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US');
    }
  } catch {
    formattedLastUpdated = null;
  }
  const toolJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: locale === 'de' ? 'NC-Checker' : 'NC Checker',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    inLanguage: locale === 'de' ? 'de-DE' : 'en-US',
    isAccessibleForFree: true,
    description:
      locale === 'de'
        ? 'Interaktiver NC-Checker fuer Studiengaenge in Deutschland mit Zulassungstendenzen und Kostenueberblick.'
        : 'Interactive NC checker for study programs in Germany with admission trends and cost overview.',
    url: `${baseUrl}/${locale}/nc-checker`,
  };

  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 pb-40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd) }}
      />
      <div className="max-w-6xl mx-auto">
        <TLDR summary={tldr.summary} highlights={tldr.highlights} />
        <NCDataDisclaimer variant="compact" className="mb-6" lastUpdated={formattedLastUpdated} />
        <ErrorBoundary
          title={tError('toolErrorTitle')}
          message={tError('toolErrorMessage')}
          retryLabel={tError('retry')}
        >
          <NCCheckerContent />
        </ErrorBoundary>
        <section className="mt-16">
          <FAQ items={faqItems} />
        </section>
      </div>
    </main>
  );
}

