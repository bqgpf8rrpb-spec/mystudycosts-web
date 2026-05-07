import { getTranslations } from 'next-intl/server';
import { Mail, Phone, MapPin, Shield, FileText, Copyright } from 'lucide-react';
import ProtectedEmail from '@/components/ProtectedEmail';
import type { Metadata } from 'next';

import { getBaseUrl } from '@/lib/site-config';

const baseUrl = getBaseUrl();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Imprint' });

  return {
    title: t('title'),
    description: t('legalNotice'),
    alternates: {
      canonical: `${baseUrl}/${locale}/imprint`,
    },
  };
}

export default async function ImprintPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Imprint' });
  const formattedDate = new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h1>
          <p className="text-white/70 text-lg">
            {t('legalNotice')}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="backdrop-blur-md bg-slate-950/80 border border-white/10 rounded-xl p-8 md:p-12 space-y-10">
          {/* Information according to § 5 TMG */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('information')}
              </h2>
            </div>
            
            <div className="space-y-4 text-white/80">
              <div className="flex items-start gap-3">
                <span className="font-semibold text-white min-w-[100px]">{t('name')}:</span>
                <span>{t('placeholderFullName')}</span>
              </div>
              
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold text-white block mb-1">{t('address')}:</span>
                  <div className="space-y-1">
                    <p>{t('placeholderStreet')}</p>
                    <p>{t('placeholderCityZip')}</p>
                    <p>{t('placeholderCountry')}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Responsible for content according to § 18 MStV */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('responsible')}
              </h2>
            </div>
            
            <div className="text-white/80">
              <p>{t('placeholderResponsibleName')}</p>
            </div>
          </section>

          {/* Contact Information */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Mail className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('contact')}
              </h2>
            </div>
            
            <div className="space-y-4 text-white/80">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-white mr-2">{t('email')}:</span>
                  <ProtectedEmail email={t('placeholderEmail')} />
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-white mr-2">{t('phone')}:</span>
                  <a 
                    href={`tel:${t('placeholderPhoneDial')}`} 
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {t('placeholderPhone')}
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Liability for Content */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('liabilityTitle')}
              </h2>
            </div>
            <p className="text-white/70 leading-relaxed">
              {t('liabilityContent')}
            </p>
          </section>

          {/* Liability for Links */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('linksTitle')}
              </h2>
            </div>
            <p className="text-white/70 leading-relaxed">
              {t('linksContent')}
            </p>
          </section>

          {/* Copyright */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Copyright className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('copyrightTitle')}
              </h2>
            </div>
            <p className="text-white/70 leading-relaxed">
              {t('copyrightContent')}
            </p>
          </section>
        </div>

        {/* Additional Info Card */}
        <div className="mt-8 backdrop-blur-md bg-slate-950/60 border border-white/10 rounded-xl p-6">
          <p className="text-white/60 text-sm text-center">
            {t('lastUpdated')}: {formattedDate}
          </p>
        </div>
      </div>
    </main>
  );
}
