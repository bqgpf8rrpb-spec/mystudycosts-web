'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import AffiliateLabel from '@/components/AffiliateLabel';
import { fetchLiveNc } from '@/app/actions/fetchLiveNc';
import { formatNcDisplay, normalizeNcValue } from '@/lib/nc-utils';

const ENABLE_AFFILIATES = false;

interface NcResultCardProps {
  university: string;
  program: string;
  initialNcValue: string | null;
  userNcValue?: number | null;
  autoFetchOnMissing?: boolean;
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'fallback';

const LOADING_MESSAGES = [
  'Analysiere offizielle Uni-Datenbanken...',
  'Gleiche Grenzwerte ab...',
  'Pruefe aktuelle NC-Quellen...',
];

export default function NcResultCard({
  university,
  program,
  initialNcValue,
  userNcValue = null,
  autoFetchOnMissing = true,
}: NcResultCardProps) {
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] === 'en' ? 'en' : 'de';
  const [status, setStatus] = useState<FetchStatus>(initialNcValue ? 'success' : 'idle');
  const [ncValue, setNcValue] = useState<string | null>(initialNcValue);
  const [loadingIndex, setLoadingIndex] = useState(0);

  const userLikelyNotEnough = useMemo(() => {
    const extracted = normalizeNcValue(ncValue);
    if (extracted === null || userNcValue === null || userNcValue === undefined) return false;
    // Lower grade value is better in DE NC context.
    return userNcValue > extracted;
  }, [ncValue, userNcValue]);

  const runFetch = useCallback(async () => {
    setStatus('loading');
    setLoadingIndex(0);

    const result = await fetchLiveNc(university, program);
    if (result.success && result.nc) {
      setNcValue(result.nc);
      setStatus('success');
      return;
    }

    setNcValue(null);
    setStatus('fallback');
  }, [program, university]);

  useEffect(() => {
    if (status !== 'loading') return;

    const interval = setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (!initialNcValue && autoFetchOnMissing) {
      void runFetch();
    }
  }, [autoFetchOnMissing, initialNcValue, runFetch]);

  const showAlternativePaths = status === 'fallback' || userLikelyNotEnough;

  return (
    <div className="rounded-2xl border border-blue-900/50 bg-slate-950/80 p-5 shadow-lg shadow-blue-950/40">
      <div className="mb-3">
        <p className="text-xs uppercase tracking-wide text-blue-300/70">Live NC Check</p>
        <h3 className="mt-1 text-lg font-semibold text-slate-100">{program}</h3>
        <p className="text-sm text-slate-400">{university}</p>
      </div>

      {status === 'idle' && (
        <button
          type="button"
          onClick={() => void runFetch()}
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
        >
          Live pruefen
        </button>
      )}

      {status === 'loading' && (
        <div className="space-y-3">
          <div className="h-6 w-28 animate-pulse rounded-md bg-slate-800" />
          <div className="h-4 w-full animate-pulse rounded-md bg-slate-800/80" />
          <div className="h-4 w-5/6 animate-pulse rounded-md bg-slate-800/60" />
          <p className="text-sm text-blue-200/90">{LOADING_MESSAGES[loadingIndex]}</p>
        </div>
      )}

      {status === 'success' && !showAlternativePaths && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-300">Aktuellster NC</p>
          <p className="mt-1 text-3xl font-bold text-emerald-200">{formatNcDisplay(ncValue, locale)}</p>
        </div>
      )}

      {showAlternativePaths && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-100">
            Alternative Paths
          </p>
          <p className="mt-2 text-sm text-amber-50/90">
            {ENABLE_AFFILIATES
              ? 'Anzeige: Entdecke zulassungsfreie Alternativen an privaten Hochschulen.'
              : 'Entdecke zulassungsfreie Alternativen an privaten Hochschulen.'}
          </p>
          {ENABLE_AFFILIATES && (
            <div className="mt-2">
              <AffiliateLabel />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
