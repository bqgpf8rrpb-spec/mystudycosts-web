'use client';

import { ExternalLink, CheckCircle2, Sparkles } from 'lucide-react';
import AffiliateLabel from '@/components/AffiliateLabel';
import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';
import { AFFILIATE_ENABLED, AFFILIATE_TRACKING_ENABLED } from '@/lib/feature-flags';

const ENABLE_AFFILIATES = false;

interface FeaturedPartner {
  name: string;
  program: string;
  url: string;
  advantages: string[];
  description: string;
}

interface AffiliateResultCardProps {
  partner: FeaturedPartner;
  locale?: string;
}

export default function AffiliateResultCard({ partner, locale = 'en' }: AffiliateResultCardProps) {
  // Prepare affiliate URL with tracking parameter placeholder
  // Structure: baseUrl?ref=mystudycosts&affiliate_id=XXX
  // The base URL already contains query params, so we need to append correctly
  const getAffiliateUrl = (): string => {
    const baseUrl = partner.url;
    const separator = baseUrl.includes('?') ? '&' : '?';
    
    // TODO: Replace with actual affiliate ID when available
    const affiliateId = process.env.NEXT_PUBLIC_AFFILIATE_ID || '';
    const trackingParams = `ref=mystudycosts${affiliateId ? `&affiliate_id=${affiliateId}` : ''}`;
    
    return `${baseUrl}${separator}${trackingParams}`;
  };

  const affiliateUrl = getAffiliateUrl();
  const ctaUrl = AFFILIATE_ENABLED ? affiliateUrl : partner.url; // Fallback to base URL without tracking params when disabled

  const handleClick = () => {
    if (!AFFILIATE_TRACKING_ENABLED || typeof window === 'undefined') return;

    trackEvent('click_affiliate_link', 'NCChecker', partner.name);

    if (window.gtag) {
      window.gtag('event', 'affiliate_click', {
        partner_name: partner.name,
        program: partner.program,
        search_query: window.location.search,
        affiliate_url: affiliateUrl,
      });
    }

    if ((window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'affiliate_click',
        partner: partner.name,
        program: partner.program,
      });
    }
  };

  return (
    <div className="relative mb-6">
      {/* Highlight Box with Gold/Turquoise Border */}
      <div className="bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-blue-500/10 border-2 border-teal-400/40 rounded-xl p-6 shadow-lg shadow-teal-500/10">
        {/* Header with Affiliate Label */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-400" />
            <h3 className="text-xl font-bold text-white">
              {locale === 'de' ? 'Alternative Option' : 'Alternative Option'}
            </h3>
          </div>
          {ENABLE_AFFILIATES && <AffiliateLabel variant="default" />}
        </div>

        {/* Partner Info */}
        <div className="mb-4">
          <h4 className="text-lg font-semibold text-teal-300 mb-1">
            {partner.name}
          </h4>
          <p className="text-white/90 text-sm mb-2">
            {partner.program}
          </p>
          <p className="text-white/70 text-sm leading-relaxed">
            {partner.description}
          </p>
        </div>

        {/* Advantages List */}
        <div className="mb-4 space-y-2">
          {partner.advantages.map((advantage, index) => (
            <div key={index} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
              <span className="text-white/80 text-sm">{advantage}</span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <Link
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={AFFILIATE_TRACKING_ENABLED ? handleClick : undefined}
          className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-teal-500/20"
        >
          <span>
            {locale === 'de' ? 'Mehr erfahren' : 'Learn More'}
          </span>
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

