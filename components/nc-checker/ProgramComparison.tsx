'use client';

import { useEffect, useState } from 'react';
import { X, Scale, TrendingUp, Home, School, Link2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import {
  formatNcDisplay,
  getAdmissionBandDescriptionKey,
  getAdmissionBandLabelKey,
  type AdmissionBucket,
} from '@/lib/nc-utils';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export interface ProgramComparisonItem {
  id: string;
  university: string;
  city: string;
  programName: string;
  nc: number | null;
  admissionBucket: AdmissionBucket;
  totalMonthlyCosts: number;
  estimatedRent: number;
}

interface ProgramComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  programs: ProgramComparisonItem[];
}

function getChanceLabel(bucket: AdmissionBucket, t: ReturnType<typeof useTranslations>): { label: string; description: string; classes: string } {
  if (bucket === 2) {
    return {
      label: t(getAdmissionBandLabelKey(bucket)),
      description: t(getAdmissionBandDescriptionKey(bucket)),
      classes: 'bg-green-500/20 text-green-300 border-green-500/40',
    };
  }
  if (bucket === 1) {
    return {
      label: t(getAdmissionBandLabelKey(bucket)),
      description: t(getAdmissionBandDescriptionKey(bucket)),
      classes: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    };
  }
  return {
    label: t(getAdmissionBandLabelKey(bucket)),
    description: t(getAdmissionBandDescriptionKey(bucket)),
    classes: 'bg-red-500/20 text-red-300 border-red-500/40',
  };
}

export default function ProgramComparison({ isOpen, onClose, programs }: ProgramComparisonProps) {
  const t = useTranslations('NCChecker');
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] === 'en' ? 'en' : 'de';
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const handleCopyLink = async () => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (programs.length > 0) {
      url.searchParams.set(
        'compare',
        programs.map((program) => program.id).join(',')
      );
    } else {
      url.searchParams.delete('compare');
    }
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
    } catch {
      // Clipboard may be unavailable in some browser contexts.
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-6xl rounded-2xl border border-blue-400/25 bg-slate-900/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-slate-800/70 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-blue-300/50 hover:text-white"
            >
              <Link2 className="h-3.5 w-3.5" />
              {copied ? t('copied') : t('copyLink')}
            </button>
            <Scale className="h-5 w-5 text-blue-300" />
            <h2 className="text-lg font-semibold text-white">{t('comparisonModalTitle')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/15 bg-slate-800/70 p-2 text-slate-200 transition-colors hover:border-blue-300/50 hover:text-white"
            aria-label={t('closeComparison')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {programs.map((program) => {
              const chance = getChanceLabel(program.admissionBucket, t);
              return (
                <div
                  key={program.id}
                  className="rounded-xl border border-white/15 bg-slate-950/60 p-4 shadow-lg shadow-blue-950/25"
                >
                  <h3 className="line-clamp-2 text-base font-semibold text-white">{program.programName}</h3>
                  <p className="mt-1 text-sm text-white/70">{program.university}</p>
                  <p className="mt-1 text-sm text-blue-200">{program.city}</p>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-300" />
                        {t('admissionChance')}
                      </div>
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${chance.classes}`}>
                        {chance.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/55 px-1">{chance.description}</p>

                    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <School className="h-3.5 w-3.5 text-blue-300" />
                        NC
                      </div>
                      <span className="text-sm font-semibold text-white">{formatNcDisplay(program.nc, locale)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2">
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <Home className="h-3.5 w-3.5 text-blue-300" />
                        {t('estimatedRent')}
                      </div>
                      <span className="text-sm font-semibold text-white">{formatCurrency(program.estimatedRent, 'EUR', 1)}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 rounded-lg border border-blue-400/25 bg-blue-500/10 px-3 py-2">
                      <span className="text-xs font-medium text-blue-200">{t('monthlyBudget')}</span>
                      <span className="text-sm font-semibold text-white">{formatCurrency(program.totalMonthlyCosts, 'EUR', 1)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
