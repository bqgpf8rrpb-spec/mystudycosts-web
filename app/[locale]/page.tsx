import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Calculator, TrendingUp, Globe, Shield, ArrowRight, GraduationCap, MapPin, Search, CheckCircle2, Database, Sparkles, Filter, Gauge, Home as HomeIcon, Map } from 'lucide-react';
import GlowingNetworkMap from '@/components/GlowingNetworkMap';

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Index');
  
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Hero Section - Split Screen */}
      <section className="relative py-16 lg:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Background gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center">
            {/* Left Column: Text & CTAs */}
            <div className="flex-1 w-full lg:w-auto">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                {t('heroTitleNew')}
              </h1>
              <p className="text-lg md:text-xl text-blue-200 mb-8 leading-relaxed">
                {t('heroSubtitleNew')}
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href={`/${locale}/nc-checker`}
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-200 text-lg shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
                >
                  {t('heroCTAPrimary')}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href={`/${locale}/calculator`}
                  className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white/20 hover:border-white/40 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-200 text-lg hover:bg-white/5"
                >
                  {t('heroCTASecondary')}
                </Link>
              </div>
            </div>
            
            {/* Right Column: Animated Europe Map */}
            <div className="flex-1 w-full lg:w-auto lg:max-w-lg">
              <GlowingNetworkMap />
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
            {t('featuresTitle')}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Feature Card 1: NC-Checker */}
            <Link 
              href={`/${locale}/nc-checker`}
              className="group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                {/* Graphic Icon Above Title */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="backdrop-blur-md bg-blue-600/20 border border-blue-500/30 rounded-2xl p-6 group-hover:bg-blue-600/30 transition-colors">
                      <div className="relative w-16 h-16">
                        <Filter className="w-8 h-8 text-blue-400 absolute top-2 left-2" />
                        <Gauge className="w-6 h-6 text-cyan-400 absolute bottom-2 right-2" />
                      </div>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white text-center mb-4">{t('featureNCTitleNew')}</h3>
                <p className="text-white/70 mb-6 leading-relaxed text-center">
                  {t('featureNCDescription')}
                </p>
                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30">
                    {t('featureNCBadge1')}
                  </span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30">
                    {t('featureNCBadge2')}
                  </span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30">
                    {t('featureNCBadge3')}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 text-blue-400 font-semibold group-hover:gap-3 transition-all">
                  {t('featureCTA')}
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>

            {/* Feature Card 2: Cost Calculator */}
            <Link 
              href={`/${locale}/calculator`}
              className="group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                {/* Graphic Icon Above Title */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="backdrop-blur-md bg-blue-600/20 border border-blue-500/30 rounded-2xl p-6 group-hover:bg-blue-600/30 transition-colors">
                      <div className="relative w-16 h-16">
                        <Calculator className="w-10 h-10 text-blue-400 absolute top-1 left-1" />
                        <HomeIcon className="w-6 h-6 text-cyan-400 absolute bottom-1 right-1" />
                      </div>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white text-center mb-4">{t('featureCalculatorTitleNew')}</h3>
                <p className="text-white/70 mb-6 leading-relaxed text-center">
                  {t('featureCalculatorDescription')}
                </p>
                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30">
                    {t('featureCalculatorBadge1')}
                  </span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30">
                    {t('featureCalculatorBadge2')}
                  </span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30">
                    {t('featureCalculatorBadge3')}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 text-blue-400 font-semibold group-hover:gap-3 transition-all">
                  {t('featureCTA')}
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>

            {/* Feature Card 3: Erasmus Planner */}
            <Link 
              href={`/${locale}/erasmus`}
              className="group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/20"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                {/* Graphic Icon Above Title - Map Style */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="backdrop-blur-md bg-blue-600/20 border border-blue-500/30 rounded-2xl p-6 group-hover:bg-blue-600/30 transition-colors">
                      <div className="relative w-16 h-16">
                        <Map className="w-10 h-10 text-blue-400 absolute top-1 left-1" />
                        <div className="absolute bottom-1 right-1 w-6 h-6 bg-gradient-to-br from-cyan-400/40 to-blue-500/40 rounded border border-cyan-400/30" />
                      </div>
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity animate-pulse" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-white text-center mb-4">{t('featureErasmusTitleNew')}</h3>
                <p className="text-white/70 mb-6 leading-relaxed text-center">
                  {t('featureErasmusDescription')}
                </p>
                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30">
                    {t('featureErasmusBadge1')}
                  </span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30">
                    {t('featureErasmusBadge2')}
                  </span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/30">
                    {t('featureErasmusBadge3')}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 text-blue-400 font-semibold group-hover:gap-3 transition-all">
                  {t('featureCTA')}
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Footer Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Data Integrity Badge */}
            <div className="backdrop-blur-md bg-slate-950/80 border border-white/10 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="backdrop-blur-md bg-green-600/20 border border-green-500/30 rounded-lg p-3 flex-shrink-0">
                  <Database className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    {t('dataIntegrityTitle')}
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    {t('dataIntegrityDescription')}
                  </p>
                </div>
              </div>
            </div>

            {/* Affiliate Disclosure */}
            <div className="backdrop-blur-md bg-slate-950/80 border border-white/10 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="backdrop-blur-md bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 flex-shrink-0">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {t('transparencyTitle')}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed mb-3">
                    {t('transparencyDescription')}
                  </p>
                  <div className="inline-block">
                    <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/50 text-xs">
                      Anzeige
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}