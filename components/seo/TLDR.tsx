'use client';

import { useTranslations } from 'next-intl';

interface TLDRProps {
  summary: string;
  highlights?: string[];
}

export default function TLDR({ summary, highlights }: TLDRProps) {
  const t = useTranslations('TLDR');

  return (
    <section aria-labelledby="tldr-heading" className="mb-8 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
      <h2 id="tldr-heading" className="text-lg font-semibold text-white mb-2">
        {t('title')}
      </h2>
      <p className="text-slate-300 text-base leading-relaxed mb-3">
        {summary}
      </p>
      {highlights && highlights.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">{t('keyPoints')}</h3>
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-sm">
            {highlights.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
