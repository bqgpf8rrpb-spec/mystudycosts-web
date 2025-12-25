import StudyCostCalculator from '@/components/StudyCostCalculator';
import { getTranslations } from 'next-intl/server';

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'CalculatorPage' });

  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-7xl mx-auto mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {t('title')}
        </h1>
        <p className="text-white/70 text-lg">
          {t('subtitle')}
        </p>
      </div>
      <StudyCostCalculator />
    </main>
  );
}
