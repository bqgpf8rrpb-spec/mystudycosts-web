'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import type { ErasmusConfidence } from '@/data/erasmus-partner-types';

/**
 * Binary verification badge for Erasmus partners.
 * verified_active | moveon_only → green checkmark + "Verifiziert"
 * likely_active | possibly_active | historical → yellow "Beim International Office prüfen"
 * traineeship → no badge (optional)
 */
export default function PartnerVerificationBadge({ confidence }: { confidence?: ErasmusConfidence }) {
  const t = useTranslations('PartnerVerification');
  if (!confidence) return null;
  if (confidence === 'traineeship') return null;

  const isVerified = confidence === 'verified_active' || confidence === 'moveon_only';

  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        {t('verified')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
      {t('unverifiedHint')}
    </span>
  );
}

/**
 * Returns border classes for partner cards based on confidence.
 */
export function getPartnerCardBorderClass(confidence?: ErasmusConfidence, isSelected = false): string {
  if (!confidence || confidence === 'traineeship') {
    return isSelected ? 'border-l-4 border-slate-500' : '';
  }
  const isVerified = confidence === 'verified_active' || confidence === 'moveon_only';
  return isVerified ? 'border-l-4 border-emerald-500' : 'border-l-4 border-amber-500';
}
