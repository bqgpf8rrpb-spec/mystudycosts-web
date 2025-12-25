import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
import ConditionalGoogleAnalytics from '@/components/ConditionalGoogleAnalytics';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import type { Metadata } from 'next';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'MyStudyCosts - International Student Calculator for Germany',
  description: 'Calculate your living costs, semester fees, and visa requirements for studying in Germany with our live currency converter.',
  keywords: ['Germany', 'study abroad', 'student costs', 'semester fees', 'visa calculator', 'international students', 'living costs Germany'],
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <CookieConsentProvider>
            {gaId && <ConditionalGoogleAnalytics gaId={gaId} />}
            <CurrencyProvider>
              <Navbar />
              {children}
              <Footer />
              <CookieConsent />
            </CurrencyProvider>
          </CookieConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
