import { getTranslations } from 'next-intl/server';
import { Calculator } from 'lucide-react';

export default async function Home() {
  const t = await getTranslations('Index');

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-8">
        <div className="flex justify-center mb-4">
          <Calculator className="w-16 h-16 text-white" />
        </div>
        <h1 className="text-5xl font-bold text-white">
          {t('title')}
        </h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200">
          {t('start')}
        </button>
      </div>
    </main>
  );
}
