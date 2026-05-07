'use client';

import Link from 'next/link';
import { Target, Globe, Wallet, ArrowRight } from 'lucide-react';

interface FeatureCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string[];
}

function FeatureCard({ href, icon, title, description }: FeatureCardProps) {
  return (
    <article>
    <Link
      href={href}
      className="group relative bg-slate-900/50 border border-slate-800 p-8 rounded-3xl hover:bg-blue-900/20 transition-all cursor-pointer flex flex-col"
    >
      <div className="flex-1">
        {/* Icon Container */}
        <div className="mb-6">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.2)] group-hover:-translate-y-1 transition-transform">
            {icon}
          </div>
        </div>
        
        {/* Title */}
        <h3 className="text-2xl font-bold text-white mb-4">
          {title}
        </h3>
        
        {/* Description - 2 lines */}
        <p className="text-slate-400 leading-relaxed mb-6">
          {description[0]}
          <br />
          {description[1]}
        </p>
      </div>
      
      {/* Button at bottom */}
      <div className="mt-auto pt-6 border-t border-slate-800">
        <div className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors group-hover:shadow-lg group-hover:shadow-blue-600/20">
          <span>Get Started</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
    </article>
  );
}

interface FeatureCardsProps {
  locale: string;
}

export default function FeatureCards({ locale }: FeatureCardsProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8" aria-label="Feature tools">
      {/* NC Checker */}
      <FeatureCard
        href={`/${locale}/nc-checker`}
        icon={<Target className="w-7 h-7 text-blue-400" strokeWidth={1.5} />}
        title="NC Checker"
        description={[
          "Find degree programs matching your high school GPA.",
          "Filter by state, university type, and monthly costs."
        ]}
      />

      {/* Erasmus Calculator */}
      <FeatureCard
        href={`/${locale}/erasmus`}
        icon={<Globe className="w-7 h-7 text-cyan-400" strokeWidth={1.5} />}
        title="Erasmus Calculator"
        description={[
          "Compare costs for your semester abroad across Europe.",
          "With Erasmus+ grants and BAföG (State Funding) abroad supplement."
        ]}
      />

      {/* Study Cost Calculator */}
      <FeatureCard
        href={`/${locale}/calculator`}
        icon={<Wallet className="w-7 h-7 text-emerald-400" strokeWidth={1.5} />}
        title="Study Cost Calculator"
        description={[
          "Calculate your monthly costs for rent, semester fees, and living expenses.",
          "Personalized for your city and your needs."
        ]}
      />
    </section>
  );
}

