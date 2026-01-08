'use client';

import { MapPin, GraduationCap, Euro, Plane } from 'lucide-react';
import Link from 'next/link';

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
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {program.programName}
        </h1>
        <div className="flex items-center gap-2 text-slate-400 text-lg mb-2">
          <GraduationCap className="w-5 h-5" />
          <span>{program.university}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <MapPin className="w-4 h-4" />
          <span>{program.city}</span>
          <span className="mx-1">•</span>
          <span>{program.state}</span>
          <span className="mx-1">•</span>
          <span>{program.type}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* NC Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm text-slate-400 uppercase tracking-wider">NC-Wert</h3>
          </div>
          {program.nc !== null && program.nc > 0 ? (
            <p className="text-3xl font-bold text-blue-400">{program.nc}</p>
          ) : (
            <p className="text-2xl font-bold text-slate-500">Zulassungsfrei</p>
          )}
        </div>

        {/* Costs Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Euro className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm text-slate-400 uppercase tracking-wider">Monatliche Kosten</h3>
          </div>
          <p className="text-3xl font-bold text-emerald-400">{program.totalMonthlyCosts} €</p>
          <p className="text-xs text-slate-500 mt-1">Inkl. Miete, Semesterbeitrag & Lebenshaltung</p>
        </div>

        {/* Erasmus Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Plane className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm text-slate-400 uppercase tracking-wider">Erasmus Partner</h3>
          </div>
          <p className="text-3xl font-bold text-cyan-400">{program.erasmusCount}</p>
          <p className="text-xs text-slate-500 mt-1">Verfügbare Partneruniversitäten</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
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
      </div>
    </div>
  );
}

