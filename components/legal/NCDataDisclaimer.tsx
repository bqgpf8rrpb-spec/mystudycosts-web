'use client';

import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import { NC_DISCLAIMER_ENABLED } from '@/lib/feature-flags';

interface NCDataDisclaimerProps {
  className?: string;
  variant?: 'compact' | 'full';
  lastUpdated?: string | null;
}

export default function NCDataDisclaimer({
  className = '',
  variant = 'compact',
  lastUpdated,
}: NCDataDisclaimerProps) {
  if (!NC_DISCLAIMER_ENABLED) return null;

  const t = useTranslations('NCDataDisclaimer');

  return (
    <aside
      role="note"
      aria-label={t('ariaLabel')}
      className={`flex items-start gap-2 text-xs text-slate-500 ${className}`}
    >
      <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500/70" aria-hidden />
      <p className="leading-relaxed">
        {variant === 'compact' ? t('compact') : t('full')}
        {lastUpdated ? <span className="block mt-1 text-slate-400">{t('updatedAt', { date: lastUpdated })}</span> : null}
      </p>
    </aside>
  );
}
