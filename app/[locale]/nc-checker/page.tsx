import { useTranslations } from 'next-intl';
import NCCheckerContent from '@/components/NCCheckerContent';

export default function NCCheckerPage() {
  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 pb-40">
      <div className="max-w-6xl mx-auto">
        <NCCheckerContent />
      </div>
    </main>
  );
}

