'use client';

import { useTranslations } from 'next-intl';
import { AFFILIATE_ENABLED } from '@/lib/feature-flags';

interface AffiliateLabelProps {
  isVisible?: boolean;
  className?: string;
  variant?: 'default' | 'subtle';
}

export default function AffiliateLabel({ 
  isVisible = true, 
  className = '',
  variant = 'default'
}: AffiliateLabelProps) {
  if (!AFFILIATE_ENABLED || !isVisible) return null;

  const t = useTranslations('AffiliateLabel');

  const baseClasses = variant === 'subtle' 
    ? 'text-[10px] text-gray-500 opacity-50'
    : 'text-xs text-white/40';

  return (
    <span className={`${baseClasses} ${className}`}>
      ({t('label')})
    </span>
  );
}

