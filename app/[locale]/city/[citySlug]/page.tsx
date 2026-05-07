import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCityBySlug, getAllCities } from '@/lib/city-data';
import { calculateMonthlyCosts, getCostTransparencyText } from '@/lib/costs';
import { getCalculatorCityKey } from '@/lib/city-utils';
import { formatCurrency } from '@/lib/format';
import StudyCostCalculator from '@/components/StudyCostCalculator';
import { routing } from '@/i18n/routing';
import { Info } from 'lucide-react';
import FAQ from '@/components/seo/FAQ';
import TLDR from '@/components/seo/TLDR';
import { FAQ_BY_PAGE } from '@/data/faq';
import { getBaseUrl } from '@/lib/site-config';

interface CityPageProps {
  params: Promise<{
    locale: string;
    citySlug: string;
  }>;
}

export async function generateStaticParams() {
  const cities = getAllCities();
  const locales = routing.locales;
  
  const params: Array<{ locale: string; citySlug: string }> = [];
  
  for (const locale of locales) {
    for (const city of cities) {
      params.push({
        locale,
        citySlug: city.slug,
      });
    }
  }
  
  return params;
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { locale, citySlug } = await params;
  const city = getCityBySlug(citySlug);
  
  const baseUrl = getBaseUrl();
  const siteUrl = `${baseUrl}/${locale}/city/${citySlug}`;
  
  if (!city) {
    return {
      title: 'City not found',
      description: 'The requested city could not be found.',
    };
  }
  
  // Generate dynamic title and description
  const cityName = city.name;
  const programCount = city.programCount;
  const avgFee = city.averageSemesterFee;
  
  const metadataConfig = {
    de: {
      title: `Studienkosten in ${cityName} 2026 - Alle Programme & NCs`,
      description: `Es gibt ${programCount} Studiengänge in ${cityName}. Die durchschnittliche Semestergebühr beträgt ${avgFee}€. Finde alle Universitäten, NC-Werte und Studienkosten für ${cityName}.`,
      keywords: [
        `Studienkosten ${cityName}`,
        `Studium ${cityName}`,
        `Universitäten ${cityName}`,
        `NC ${cityName}`,
        `Semestergebühren ${cityName}`,
        `Studieren in ${cityName}`,
        city.state,
      ],
    },
    en: {
      title: `Cost of studying in ${cityName} 2026 - All Programs & NCs`,
      description: `There are ${programCount} programs available in ${cityName}. The average semester fee is ${avgFee}€. Find all universities, NC values, and study costs for ${cityName}.`,
      keywords: [
        `Study costs ${cityName}`,
        `Study in ${cityName}`,
        `Universities ${cityName}`,
        `NC ${cityName}`,
        `Semester fees ${cityName}`,
        `Studying in ${cityName}`,
        city.state,
      ],
    },
  };
  
  const config = metadataConfig[locale as keyof typeof metadataConfig] || metadataConfig.en;
  
  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    authors: [{ name: 'MyStudyCosts' }],
    creator: 'MyStudyCosts',
    publisher: 'MyStudyCosts',
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: siteUrl,
      languages: {
        'de': `${baseUrl}/de/city/${citySlug}`,
        'en': `${baseUrl}/en/city/${citySlug}`,
        'x-default': `${baseUrl}/de/city/${citySlug}`,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'de' ? 'de_DE' : 'en_US',
      url: siteUrl,
      siteName: 'MyStudyCosts',
      title: config.title,
      description: config.description,
      images: [
        {
          url: `${baseUrl}/og-image?title=${encodeURIComponent(cityName)}&type=city`,
          width: 1200,
          height: 630,
          alt: `Study Costs in ${cityName}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
      images: [`${baseUrl}/og-image?title=${encodeURIComponent(cityName)}&type=city`],
      creator: '@mystudycosts',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function CityPage({ params }: CityPageProps) {
  const { locale, citySlug } = await params;
  const city = getCityBySlug(citySlug);
  
  if (!city) {
    notFound();
  }
  
  // Get calculator city key - only use if it's a valid city in the calculator
  const calculatorCityKey = getCalculatorCityKey(city.name);
  
  // Format average semester fee
  const avgFeeFormatted = city.averageSemesterFee > 0 
    ? `${city.averageSemesterFee}€` 
    : 'N/A';
  
  // Calculate monthly costs for this city
  const monthlyCosts = calculateMonthlyCosts(city.name);
  const transparencyText = getCostTransparencyText(locale);
  
  const tldrSummary =
    locale === 'de'
      ? `Studieren in ${city.name}: ${city.universities.length} Universitäten, durchschnittliche Semestergebühr ${avgFeeFormatted}, ${city.programCount} Studiengänge.`
      : `Study in ${city.name}: ${city.universities.length} universities, average semester fee ${avgFeeFormatted}, ${city.programCount} programs.`;

  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <TLDR summary={tldrSummary} />
        {/* Header Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {locale === 'de' 
              ? `Studienkosten & Programme in ${city.name}`
              : `Study Costs & Programs in ${city.name}`
            }
          </h1>
          <p className="text-xl text-slate-300 mb-4">
            {locale === 'de'
              ? `Es gibt ${city.programCount} Studiengänge in ${city.name}. Die durchschnittliche Semestergebühr beträgt ${avgFeeFormatted}.`
              : `There are ${city.programCount} programs available in ${city.name}. The average semester fee is ${avgFeeFormatted}.`
            }
          </p>
          {/* Monthly Cost Estimate */}
          <div className="mt-6 inline-block bg-slate-800/50 border border-slate-700 rounded-lg px-6 py-4">
            <p className="text-sm text-slate-400 mb-2">
              {locale === 'de' ? 'Geschätzte monatliche Lebenshaltungskosten' : 'Estimated Monthly Living Costs'}
            </p>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(monthlyCosts.total, 'EUR', 1)}
            </p>
            <p className="text-xs text-slate-500 mt-2 flex items-center justify-center gap-1">
              <Info className="w-3 h-3" />
              {transparencyText}
            </p>
          </div>
        </div>
        
        {/* Universities List */}
        <section aria-labelledby="universities-heading" className="mb-12">
          <h2 id="universities-heading" className="text-2xl md:text-3xl font-bold text-white mb-6">
            {locale === 'de' ? 'Universitäten' : 'Universities'}
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 list-none m-0 p-0">
            {city.universities.map((university) => (
              <li
                key={university}
                className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <h3 className="text-lg font-semibold text-white mb-2">
                  {university}
                </h3>
                <p className="text-slate-400 text-sm">
                  {city.name}, {city.state}
                </p>
              </li>
            ))}
          </ul>
        </section>
        
        {/* Study Cost Calculator */}
        <div className="mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
            {locale === 'de' ? 'Studienkosten-Rechner' : 'Study Cost Calculator'}
          </h2>
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <StudyCostCalculator initialCity={calculatorCityKey || ''} />
            {/* Transparency Note */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <Info className="w-4 h-4 flex-shrink-0" />
                {transparencyText}
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="mb-12">
          <FAQ items={FAQ_BY_PAGE.city[locale as 'de' | 'en'] ?? FAQ_BY_PAGE.city.en} />
        </section>
      </div>
    </main>
  );
}

