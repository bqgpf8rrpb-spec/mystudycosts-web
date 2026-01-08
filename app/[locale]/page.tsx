import { getTranslations } from 'next-intl/server';
import FeatureCards from '@/components/landing/FeatureCards';
import MapWrapper from '@/components/erasmus/MapWrapper';

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Index');
  
  return (
    <main className="relative min-h-screen bg-slate-950 overflow-hidden">
      {/* Background Layer - Full Screen Map with Overlay */}
      <MapWrapper />

      {/* Content Layer */}
      <div className="relative z-20">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
              Study Costs & Erasmus Calculated Simply.
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto">
              Transparency for your studies 2026. Data-driven, independent, and without hidden costs.
            </p>
          </div>
        </section>

        {/* Tool Hub Grid */}
        <section className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <FeatureCards locale={locale} />
          </div>
        </section>

      </div>
    </main>
  );
}
