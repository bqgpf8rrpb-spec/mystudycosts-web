import { getTranslations } from 'next-intl/server';
import { Lock, Shield, FileText, Cookie, AlertCircle, Mail, MapPin, Phone } from 'lucide-react';
import ProtectedEmail from '@/components/ProtectedEmail';

export default async function PrivacyPage() {
  const t = await getTranslations('Privacy');

  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="backdrop-blur-md bg-blue-600/20 border border-blue-500/30 rounded-2xl p-4">
              <Lock className="w-12 h-12 text-blue-400" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h1>
          <p className="text-white/70 text-lg">
            {t('lastUpdated')}: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Main Content Card */}
        <div className="backdrop-blur-md bg-slate-950/80 border border-white/10 rounded-xl p-8 md:p-12 space-y-10">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              {t('introduction')}
            </h2>
            <p className="text-white/70 leading-relaxed">
              {t('introductionText')}
            </p>
          </section>

          {/* Responsible Party */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('responsibleTitle')}
              </h2>
            </div>
            <div className="text-white/80 space-y-3">
              <p>{t('responsibleText')}</p>
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-white">Maurice Sill</p>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>Altenbekener Damm 10</p>
                    <p>30173 Hannover</p>
                    <p>Germany</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <ProtectedEmail email="contact.mystudycosts@gmail.com" />
                </div>
              </div>
            </div>
          </section>

          {/* Legal Basis */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('legalBasis')}
              </h2>
            </div>
            <p className="text-white/70 leading-relaxed">
              {t('legalBasisText')}
            </p>
          </section>

          {/* Server Log Files */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('serverLogsTitle')}
              </h2>
            </div>
            <div className="text-white/70 space-y-3">
              <p className="leading-relaxed">{t('serverLogsText')}</p>
              <ul className="list-disc list-inside space-y-2 ml-4 bg-slate-900/50 rounded-lg p-4">
                {t('serverLogsItems').split(', ').map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
              <p className="leading-relaxed">{t('serverLogsPurpose')}</p>
            </div>
          </section>

          {/* Google Analytics 4 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('ga4Title')}
              </h2>
            </div>
            <div className="text-white/70 space-y-3">
              <p className="leading-relaxed">{t('ga4Text')}</p>
              <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-4">
                <p className="font-semibold text-blue-200 mb-2">{t('ga4MeasurementId')}</p>
              </div>
              <p className="leading-relaxed">{t('ga4Anonymization')}</p>
              <p className="leading-relaxed">{t('ga4Purpose')}</p>
              <div className="bg-yellow-950/30 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-200 mb-2">{t('ga4Prevention')}</p>
                    <a
                      href={t('ga4Link')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
                    >
                      {t('ga4OptOut')}
                      <span className="text-xs">↗</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Cookie className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('cookiesTitle')}
              </h2>
            </div>
            <div className="text-white/70 space-y-3">
              <p className="leading-relaxed">{t('cookiesEssential')}</p>
              <p className="leading-relaxed">{t('cookiesAnalytics')}</p>
              <p className="leading-relaxed">{t('cookiesStorage')}</p>
            </div>
          </section>

          {/* User Rights */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('rightsTitle')}
              </h2>
            </div>
            <div className="text-white/70 space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">{t('rightsInformation')}</h3>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">{t('rightsCorrection')}</h3>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">{t('rightsErasure')}</h3>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">{t('rightsRestriction')}</h3>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">{t('rightsObjection')}</h3>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-2">{t('rightsComplaint')}</h3>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('contactTitle')}
              </h2>
            </div>
            <div className="text-white/70 space-y-3">
              <p>{t('contactText')}</p>
              <div className="bg-slate-900/50 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-white">Maurice Sill</p>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p>Altenbekener Damm 10</p>
                    <p>30173 Hannover, Germany</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <ProtectedEmail email="contact.mystudycosts@gmail.com" />
                </div>
              </div>
            </div>
          </section>

          {/* Changes to Policy */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                {t('changesTitle')}
              </h2>
            </div>
            <p className="text-white/70 leading-relaxed">
              {t('changesText')}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
