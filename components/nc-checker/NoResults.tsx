'use client';

import { Info } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface NoResultsProps {
  onWidenSearch?: () => void;
  onSelectOtherState?: () => void;
  onShowAllPrograms?: () => void;
}

export default function NoResults({
  onWidenSearch,
  onSelectOtherState,
  onShowAllPrograms,
}: NoResultsProps) {
  const t = useTranslations('NCChecker');

  return (
    <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 text-center transition-all duration-300">
      <Info className="w-12 h-12 text-white/40 mx-auto mb-4" />
      <p className="text-white/80 text-lg mb-2">{t('emptyStateMessage')}</p>
      <p className="text-white/50 text-sm mb-5">{t('emptyStateHint')}</p>
      <div className="flex gap-3 justify-center flex-wrap">
        <button
          type="button"
          onClick={onWidenSearch}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-sm font-medium transition-all duration-200"
        >
          {t('emptyStateExpandSearch')}
        </button>
        <button
          type="button"
          onClick={onSelectOtherState}
          className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-sm font-medium transition-all duration-200"
        >
          {t('emptyStateChooseOtherState')}
        </button>
        <button
          type="button"
          onClick={onShowAllPrograms}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white/90 rounded-lg text-sm font-medium transition-all duration-200"
        >
          {t('emptyStateShowAllPrograms')}
        </button>
      </div>
    </div>
  );
}
