'use client';

import { useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import AffiliateLabel from '@/components/AffiliateLabel';
import CostCounter from './CostCounter';
import { calculateNetGap, isBafoegSufficient, BAFOEG_MAX_2026 } from '@/lib/bafoeg-logic';

// Benchmark: German average monthly costs 2026 (rent + semester fee prorated)
const GERMAN_AVG_2026 = 530;

// Type definition for NC index entry
export interface NCIndexEntry {
  programName: string;
  university: string;
  city: string;
  state: string;
  type: 'Uni' | 'FH' | 'Privat';
  nc: number | null;
  totalMonthlyCosts: number;
}

interface ProgramCardProps {
  program: NCIndexEntry;
  onDetailsClick?: () => void;
  onConsultationClick?: () => void;
}

type CostCategory = 'green' | 'yellow' | 'red';

function getCostCategory(cost: number): CostCategory {
  if (cost < 480) return 'green';
  if (cost <= 580) return 'yellow';
  return 'red';
}

function getCostCategoryStyles(category: CostCategory) {
  switch (category) {
    case 'green':
      return {
        bgColor: 'bg-emerald-500',
        label: 'Top Price',
        labelText: 'Below Average',
      };
    case 'yellow':
      return {
        bgColor: 'bg-amber-500',
        label: 'Average',
        labelText: '',
      };
    case 'red':
      return {
        bgColor: 'bg-rose-500',
        label: 'Expensive',
        labelText: '',
      };
  }
}

export default function ProgramCard({ 
  program, 
  onDetailsClick,
  onConsultationClick 
}: ProgramCardProps) {
  const isPrivate = program.type === 'Privat';
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasBafoegCheck, setHasBafoegCheck] = useState(false);
  
  // Calculate cost category (always based on total costs)
  const costCategory = program.totalMonthlyCosts > 0 
    ? getCostCategory(program.totalMonthlyCosts)
    : null;
  const categoryStyles = costCategory ? getCostCategoryStyles(costCategory) : null;
  
  // Calculate net gap if BAföG is active
  const netGap = useMemo(() => {
    if (!hasBafoegCheck) {
      return program.totalMonthlyCosts;
    }
    // For NC-Checker, assume domestic study (not Erasmus)
    const gap = calculateNetGap(program.totalMonthlyCosts, false, true);
    // If negative (surplus), show 0 (fully covered)
    return Math.max(0, gap);
  }, [program.totalMonthlyCosts, hasBafoegCheck]);
  
  // Check if BAföG covers all costs
  const isBafoegFullyCovered = useMemo(() => {
    if (!hasBafoegCheck) return false;
    return isBafoegSufficient(program.totalMonthlyCosts, false, true);
  }, [program.totalMonthlyCosts, hasBafoegCheck]);

  return (
    <div className="relative bg-slate-900/40 border border-slate-800 rounded-xl p-6 hover:border-blue-500/50 transition-colors shadow-lg shadow-blue-500/5">
      {/* Header with Affiliate Label for Private Universities */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-xl font-bold text-white line-clamp-2 flex-1">
            {program.programName}
          </h3>
          {isPrivate && (
            <div className="flex-shrink-0">
              <AffiliateLabel variant="subtle" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-slate-400 text-sm">
          <MapPin className="w-3.5 h-3.5" />
          <span>{program.university}</span>
          <span className="mx-1">•</span>
          <span>{program.city}</span>
        </div>
      </div>

      {/* Stats Grid - NC Badge and BAföG Toggle */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 mb-1">NC (Grade Cutoff)</span>
          {program.nc !== null ? (
            <span className="text-blue-400 font-semibold text-lg">
              {program.nc}
            </span>
          ) : (
            <span className="text-slate-600 text-sm">No NC</span>
          )}
        </div>
        
        {/* BAföG Check Toggle */}
        {program.totalMonthlyCosts > 0 && (
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={hasBafoegCheck}
                  onChange={(e) => setHasBafoegCheck(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-1 appearance-none checked:bg-blue-600 checked:border-blue-600"
                />
                {hasBafoegCheck && (
                  <svg
                    className="absolute left-0 top-0 w-4 h-4 text-white pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <span className="text-slate-400 group-hover:text-slate-300 text-xs">
                BAföG Check
              </span>
            </label>
            {hasBafoegCheck && (
              <p className="text-[10px] text-slate-500 mt-1.5 ml-6">
                Your BAföG entitlement: up to {BAFOEG_MAX_2026.toLocaleString('en-US')} €
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cost Counter Section - Bottom Right Corner */}
      {program.totalMonthlyCosts > 0 && (
        <div className="absolute bottom-6 right-6 flex flex-col items-end">
          {/* Label */}
          <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1.5">
            {hasBafoegCheck ? 'Net Costs (after BAföG)' : 'Monthly Budget 2026'}
          </span>
          {/* Counter with Ampel */}
          <div className="flex items-center gap-2">
            <CostCounter 
              value={hasBafoegCheck ? netGap : program.totalMonthlyCosts} 
              color={isBafoegFullyCovered ? 'cyan' : 'emerald'}
            />
            {!hasBafoegCheck && costCategory && categoryStyles && (
              <div className="relative">
                <div
                  className={`w-2 h-2 rounded-full ${categoryStyles.bgColor} animate-pulse cursor-help`}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                />
                {/* Tooltip */}
                {showTooltip && (
                  <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-white whitespace-nowrap z-10">
                    Comparison to DE average ({GERMAN_AVG_2026}€)
                    <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                  </div>
                )}
              </div>
            )}
            {hasBafoegCheck && isBafoegFullyCovered && (
              <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
            )}
          </div>
          {/* Dynamic Labels */}
          {hasBafoegCheck && isBafoegFullyCovered ? (
            <span className="text-cyan-400 text-[10px] font-medium mt-1">
              Fully covered by BAföG
            </span>
          ) : hasBafoegCheck && netGap > 0 ? (
            <span className="text-slate-400 text-[10px] mt-1">
              Remaining costs after BAföG
            </span>
          ) : !hasBafoegCheck && costCategory === 'green' && categoryStyles ? (
            <span className="text-emerald-400 text-[10px] font-medium mt-1">
              {categoryStyles.labelText}
            </span>
          ) : null}
        </div>
      )}

      {/* Footer - Different Button for Private vs Public */}
      <div className="pt-4 border-t border-slate-800">
        {isPrivate ? (
          <button
            onClick={onConsultationClick}
            className="text-slate-300 hover:text-white text-xs underline transition-colors"
          >
            Consultation
          </button>
        ) : (
          <button
            onClick={onDetailsClick}
            className="text-slate-300 hover:text-white text-xs underline transition-colors"
          >
            Details & Erasmus
          </button>
        )}
      </div>
    </div>
  );
}

