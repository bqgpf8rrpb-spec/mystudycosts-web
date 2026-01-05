'use client';

import { useTranslations } from 'next-intl';

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
  const t = useTranslations('AffiliateLabel');

  if (!isVisible) return null;

  const baseClasses = variant === 'subtle' 
    ? 'text-[10px] text-gray-500 opacity-50'
    : 'text-xs text-white/40';

  return (
    <span className={`${baseClasses} ${className}`}>
      ({t('label')})
    </span>
  );
}

