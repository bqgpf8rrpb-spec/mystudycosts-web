import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
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

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <CurrencyProvider>
            <Navbar />
            {children}
            <Footer />
            <CookieConsent />
          </CurrencyProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
