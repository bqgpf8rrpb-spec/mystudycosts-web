import Link from 'next/link';
import { Calculator, TrendingUp, Globe, Shield, ArrowRight } from 'lucide-react';

export default async function Home({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main className="min-h-screen bg-slate-900">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="backdrop-blur-md bg-blue-600/20 border border-blue-500/30 rounded-2xl p-4">
              <Calculator className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Master Your Finances as an International Student in Germany
          </h1>
          <p className="text-xl text-white/70 mb-8 max-w-3xl mx-auto">
            Calculate your study costs, explore cities, and plan your budget with confidence. 
            Get real-time exchange rates and comprehensive cost breakdowns.
          </p>
          <Link
            href={`/${locale}/calculator`}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg"
          >
            Start Calculating
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-950/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Why Use MyStudyCosts?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Benefit 1 */}
            <div className="backdrop-blur-md bg-slate-950/80 border border-white/10 rounded-xl p-6 hover:bg-slate-950/90 transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="backdrop-blur-md bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Live Exchange Rates</h3>
              </div>
              <p className="text-white/70">
                Get real-time currency conversion for USD, INR, CNY, GBP, and more. 
                Always see costs in your preferred currency.
              </p>
            </div>

            {/* Benefit 2 */}
            <div className="backdrop-blur-md bg-slate-950/80 border border-white/10 rounded-xl p-6 hover:bg-slate-950/90 transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="backdrop-blur-md bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                  <Globe className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">All German Cities</h3>
              </div>
              <p className="text-white/70">
                Compare costs across 60+ German university cities. 
                See average rent and living expenses for each location.
              </p>
            </div>

            {/* Benefit 3 */}
            <div className="backdrop-blur-md bg-slate-950/80 border border-white/10 rounded-xl p-6 hover:bg-slate-950/90 transition-all duration-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="backdrop-blur-md bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Comprehensive Breakdown</h3>
              </div>
              <p className="text-white/70">
                Detailed cost analysis including visa fees, blocked accounts, 
                health insurance, rent, and living expenses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="backdrop-blur-md bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/20 rounded-2xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Plan Your Study Journey?
            </h2>
            <p className="text-xl text-white/70 mb-8">
              Start calculating your costs now and make informed decisions about your education in Germany.
            </p>
            <Link
              href={`/${locale}/calculator`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg"
            >
              Start Calculating
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}