'use client';

import { MapPin, GraduationCap, Euro, Plane } from 'lucide-react';
import Link from 'next/link';
import NCDataDisclaimer from '@/components/legal/NCDataDisclaimer';
import NcResultCard from '@/components/NcResultCard';
import { isOpenAdmissionNc } from '@/lib/nc-utils';

const ENABLE_AFFILIATES = false;

interface ProgramData {
  university: string;
  programName: string;
  city: string;
  state: string;
  type: 'Uni' | 'FH' | 'Privat';
  nc: number | null;
  totalMonthlyCosts: number;
  erasmusCount: number;
}

interface ProgramDetailContentProps {
  program: ProgramData;
  locale: string;
}

export default function ProgramDetailContent({ program, locale }: ProgramDetailContentProps) {
  const initialNcValue =
    program.nc !== null && program.nc > 0 && !isOpenAdmissionNc(program.nc)
      ? program.nc.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : null;

  return (
    <article className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {program.programName}
        </h1>
        <div className="flex items-center gap-2 text-slate-400 text-lg mb-2">
          <GraduationCap className="w-5 h-5" aria-hidden />
          <span>{program.university}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <MapPin className="w-4 h-4" aria-hidden />
          <span>{program.city}</span>
          <span className="mx-1">•</span>
          <span>{program.state}</span>
          <span className="mx-1">•</span>
          <span>{program.type}</span>
        </div>
      </header>

      <section aria-labelledby="program-stats-heading" className="mb-8">
        <h2 id="program-stats-heading" className="sr-only">Program statistics</h2>
        <dl className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <dt className="sr-only">NC-Wert</dt>
            <dd>
              <NcResultCard
                university={program.university}
                program={program.programName}
                initialNcValue={initialNcValue}
              />
            </dd>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <dt className="flex items-center gap-2 mb-2 text-sm text-slate-400 uppercase tracking-wider">
              <Euro className="w-5 h-5 text-emerald-400" aria-hidden /> Monthly Costs
            </dt>
            <dd className="text-3xl font-bold text-emerald-400">{program.totalMonthlyCosts} €</dd>
            <p className="text-xs text-slate-500 mt-1">Incl. Rent, Semester Fee & Living Expenses</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <dt className="flex items-center gap-2 mb-2 text-sm text-slate-400 uppercase tracking-wider">
              <Plane className="w-5 h-5 text-cyan-400" aria-hidden /> Erasmus Partner
            </dt>
            <dd className="text-3xl font-bold text-cyan-400">{program.erasmusCount}</dd>
            <p className="text-xs text-slate-500 mt-1">Available Partner Universities</p>
          </div>
        </dl>
      </section>

      <NCDataDisclaimer variant="compact" className="mt-4" />

      <nav className="flex gap-4" aria-label="Program actions">
        <Link
          href={`/${locale}/erasmus`}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plane className="w-5 h-5" />
          Erasmus Kalkulator
        </Link>
        <Link
          href={`/${locale}/nc-checker`}
          className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <GraduationCap className="w-5 h-5" />
          Weitere Programme finden
        </Link>
      </nav>
    </article>
  );
}

