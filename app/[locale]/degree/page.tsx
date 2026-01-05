import { getTranslations } from 'next-intl/server';
import DegreeFinder from '@/components/DegreeFinder';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'DegreeFinder' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function DegreePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 pb-40">
      <div className="max-w-7xl mx-auto">
        <DegreeFinder />
      </div>
    </main>
  );
}

