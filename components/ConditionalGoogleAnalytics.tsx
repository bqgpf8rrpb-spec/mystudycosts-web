'use client';

import { GoogleAnalytics } from '@next/third-parties/google';
import { useCookieConsent } from '@/contexts/CookieConsentContext';
import { useEffect, useState } from 'react';

export default function ConditionalGoogleAnalytics({ gaId }: { gaId: string }) {
  const { hasConsented, consent } = useCookieConsent();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!isMounted || !gaId) {
    return null;
  }

  // Only load GA4 if user has explicitly consented
  // If consent is null (not yet decided), don't load
  // If consent is 'declined', don't load
  // Only load if consent is 'accepted'
  if (consent !== 'accepted' || !hasConsented) {
    return null;
  }

  return <GoogleAnalytics gaId={gaId} />;
}

