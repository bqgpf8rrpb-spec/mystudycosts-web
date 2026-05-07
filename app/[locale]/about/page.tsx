import Link from 'next/link';
import { Calculator, Target, Shield, Globe, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

import { getBaseUrl } from '@/lib/site-config';

const baseUrl = getBaseUrl();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'About MyStudyCosts',
    description: 'Empowering international students to make informed decisions about studying in Germany.',
    alternates: {
      canonical: `${baseUrl}/${locale}/about`,
    },
  };
}

export default async function AboutPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="min-h-screen bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="backdrop-blur-md bg-blue-600/20 border border-blue-500/30 rounded-2xl p-4">
              <Calculator className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            About MyStudyCosts
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Empowering international students to make informed decisions about studying in Germany
          </p>
        </div>

        {/* Mission Card */}
        <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <Target className="w-8 h-8 text-blue-400 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
              <p className="text-white/80 leading-relaxed mb-4">
                MyStudyCosts was created to help international students navigate the complexities of German bureaucracy and finances. 
                We understand that planning your studies abroad involves many moving parts: visa requirements, blocked accounts, 
                health insurance, accommodation, and managing living expenses in a new country.
              </p>
              <p className="text-white/80 leading-relaxed">
                Our mission is to provide accurate, transparent, and up-to-date information that empowers you to make informed decisions 
                about your educational journey in Germany. We believe that financial clarity should never be a barrier to pursuing your dreams.
              </p>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6">
            <Shield className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Transparency</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              We clearly explain our data sources and calculation methods. All information is based on official statistics and verified sources.
            </p>
          </div>

          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6">
            <Globe className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Accessibility</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Free tools and resources designed to break down barriers and make financial planning accessible to all international students.
            </p>
          </div>

          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6">
            <Calculator className="w-8 h-8 text-blue-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Accuracy</h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Regular updates ensure our cost estimates reflect current market conditions, exchange rates, and official requirements.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="backdrop-blur-sm bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-white/20 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Plan Your Journey?</h2>
          <p className="text-white/80 mb-6 max-w-2xl mx-auto">
            Use our comprehensive calculator to estimate your costs, compare cities, and start planning your studies in Germany today.
          </p>
          <Link
            href={`/${locale}/calculator`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
          >
            Start Calculating
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </main>
  );
}

