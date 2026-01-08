import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LegalFooter from '@/components/layout/LegalFooter';
import CookieConsent from '@/components/CookieConsent';
import ConditionalGoogleAnalytics from '@/components/ConditionalGoogleAnalytics';
import { CurrencyProvider } from '@/contexts/CurrencyContext';
import { CookieConsentProvider } from '@/contexts/CookieConsentContext';
import type { Metadata } from 'next';
import '../globals.css';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mystudycosts.com';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  
  const metadataConfig = {
    de: {
      title: 'MyStudyCosts - Studienkosten-Rechner Deutschland | Blockkonto & Visa',
      description: 'Berechne deine Lebenshaltungskosten, Semestergebühren und Visa-Anforderungen für ein Studium in Deutschland. Kostenloser Rechner mit Live-Währungsumrechnung für internationale Studierende.',
      keywords: ['Studienkosten Deutschland', 'Blockkonto', 'Studentenvisum', 'Lebenshaltungskosten', 'Semestergebühren', 'Studieren in Deutschland'],
    },
    en: {
      title: 'MyStudyCosts - Study Costs Calculator Germany | Blocked Account & Visa',
      description: 'Calculate your living costs, semester fees, and visa requirements for studying in Germany. Free calculator with live currency conversion for international students.',
      keywords: ['Study costs Germany', 'Blocked account', 'Student visa', 'Living costs', 'Semester fees', 'Study in Germany'],
    },
  };

  const config = metadataConfig[locale as keyof typeof metadataConfig] || metadataConfig.en;
  const siteUrl = `${baseUrl}/${locale}`;

  return {
    title: {
      default: config.title,
      template: `%s | MyStudyCosts`,
    },
    description: config.description,
    keywords: config.keywords,
    authors: [{ name: 'MyStudyCosts' }],
    creator: 'MyStudyCosts',
    publisher: 'MyStudyCosts',
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: siteUrl,
      languages: {
        'de': `${baseUrl}/de`,
        'en': `${baseUrl}/en`,
        'x-default': `${baseUrl}/de`,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'de' ? 'de_DE' : 'en_US',
      url: siteUrl,
      siteName: 'MyStudyCosts',
      title: config.title,
      description: config.description,
      // Next.js automatically detects and uses opengraph-image.tsx
      // The image will be generated dynamically at /[locale]/opengraph-image
      images: [
        {
          url: `${siteUrl}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: 'MyStudyCosts - Study Costs Calculator for Germany',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
      // Use the dynamic OG image
      images: [`${siteUrl}/opengraph-image`],
      creator: '@mystudycosts',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/icon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: [
        { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    manifest: '/site.webmanifest',
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    },
  };
}

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
    <html lang={locale} className="h-full">
      <body className="min-h-full flex flex-col bg-slate-900">
        <NextIntlClientProvider messages={messages}>
          <CookieConsentProvider>
            <CurrencyProvider>
              {gaId && <ConditionalGoogleAnalytics gaId={gaId} />}
              <Navbar />
              <main className="flex-grow">
                {children}
              </main>
              <Footer />
              <LegalFooter />
              <CookieConsent />
            </CurrencyProvider>
          </CookieConsentProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
