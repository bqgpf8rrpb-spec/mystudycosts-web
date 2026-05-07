'use client';

import { useState, useMemo } from 'react';
import { MapPin, Euro, ShieldCheck, Info, HelpCircle, Home, Scale } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import AffiliateLabel from '@/components/AffiliateLabel';
import CostCounter from './CostCounter';
import Speedometer from '@/components/ui/Speedometer';
import { calculateNetGap, isBafoegSufficient, BAFOEG_MAX_2026 } from '@/lib/bafoeg-logic';
import { DEFAULT_AVG_RENT_FALLBACK, getMonthlySemesterFee, LIVING_EXPENSE_PADDING, PUBLIC_SEMESTER_FEE_THRESHOLD, SEMESTER_DURATION_MONTHS } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import { getEnglishProgramName } from '@/lib/utils';
import { calculateAdmissionChance } from '@/lib/admission';
import { trackEvent } from '@/lib/analytics';
import { formatNcDisplay, isOpenAdmissionNc } from '@/lib/nc-utils';

// Import dynamic cost calculation
import { calculateMonthlyRent } from '@/lib/costs';

// Helper function to get average rent for a city (now uses dynamic calculation)
function getCityRent(city: string): number {
  try {
    // Use dynamic calculation from lib/costs.ts
    return calculateMonthlyRent(city, 20); // 20 sqm typical WG room
  } catch (error) {
    // Fallback to default if calculation fails
    console.warn(`Failed to calculate rent for city: ${city}`, error);
    return DEFAULT_AVG_RENT_FALLBACK;
  }
}

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
  semester_fee?: number;
  instructionLanguage?: 'German' | 'English' | 'Bilingual';
}

interface ProgramCardProps {
  program: NCIndexEntry;
  userGpa?: number; // User's GPA for admission chances (from global state or input)
  onDetailsClick?: () => void;
  onConsultationClick?: () => void;
  isSelectedForComparison?: boolean;
  onToggleComparison?: (programId: string) => void;
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
  userGpa,
  onDetailsClick,
  onConsultationClick,
  isSelectedForComparison = false,
  onToggleComparison,
}: ProgramCardProps) {
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] === 'en' ? 'en' : 'de';
  const t = useTranslations('NCChecker');
  const programComparisonId = `${program.programName}__${program.university}__${program.city}`;
  const isPrivate = program.type === 'Privat';
  const [showTooltip, setShowTooltip] = useState(false);
  const [showWhyTooltip, setShowWhyTooltip] = useState(false);
  const [hasBafoegCheck, setHasBafoegCheck] = useState(false);
  
  const monthlySemesterFee = program.semester_fee
    ? Math.round(getMonthlySemesterFee(program.semester_fee))
    : 50;
  
  // Get average rent for the city
  const cityRentEstimate = getCityRent(program.city);
  
  // For cost breakdown, use city rent estimate or calculate from totalMonthlyCosts
  // Priority: Use city rent estimate if available, otherwise derive from total costs
  const monthlyRent = cityRentEstimate || Math.max(0, program.totalMonthlyCosts - monthlySemesterFee - LIVING_EXPENSE_PADDING);
  
  // Calculate admission chance if user GPA is available
  const normalizedNcForChance = isOpenAdmissionNc(program.nc) ? null : program.nc;

  const admissionChance = useMemo(() => {
    if (userGpa !== undefined && userGpa !== null) {
      return calculateAdmissionChance(userGpa, normalizedNcForChance);
    }
    return null;
  }, [userGpa, normalizedNcForChance]);
  
  const isPublicUniversity = !isPrivate && (!program.semester_fee || program.semester_fee < PUBLIC_SEMESTER_FEE_THRESHOLD);
  const isPrivateOrHighFee = isPrivate || (program.semester_fee && program.semester_fee >= PUBLIC_SEMESTER_FEE_THRESHOLD);
  
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
    <div className="relative bg-slate-900/40 border border-slate-800 rounded-xl p-4 md:p-6 hover:border-blue-500/50 transition-colors shadow-lg shadow-blue-500/5">
      {/* Header with University/Program Name and Type Badges */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {/* English Name - Main Title */}
            <h3 className="text-lg md:text-xl font-bold text-white line-clamp-2 mb-1">
              {getEnglishProgramName(program.programName)}
            </h3>
            {/* Original German Name - Subtitle (only if German-taught or no language specified) */}
            {/* Hybrid-Naming Logic: Only show German original if instruction is German */}
            {(program.instructionLanguage === 'German' || !program.instructionLanguage) && (
              <p className="text-xs md:text-sm text-slate-400 italic">
                {t('originalNamePrefix')}: {program.programName}
              </p>
            )}
          </div>
          {/* Instruction Language Badge - Prominent placement near title */}
          {program.instructionLanguage && (
            <div className="flex-shrink-0 mt-1 self-start">
              {program.instructionLanguage === 'English' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md">
                  <span className="text-xs">🇬🇧</span>
                  <span className="text-blue-400 text-xs font-medium">
                    {t('instructionEnglish')}
                  </span>
                </div>
              ) : program.instructionLanguage === 'Bilingual' ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 rounded-md">
                  <span className="text-xs">🌐</span>
                  <span className="text-purple-400 text-xs font-medium">
                    {t('instructionBilingual')}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-500/10 border border-slate-500/20 rounded-md">
                  <span className="text-xs">🇩🇪</span>
                  <span className="text-slate-400 text-xs font-medium">
                    {t('instructionGerman')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1 text-slate-400 text-sm mb-3">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{program.university}</span>
          </div>
          <span className="hidden sm:inline mx-1">•</span>
          <span className="sm:ml-0">{program.city}</span>
        </div>
        
        {/* Public vs. Private Badges - Badge System */}
        <div className="flex items-center gap-2 flex-wrap">
          {isPublicUniversity ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-blue-400 text-xs font-medium">
                {t('publicStateFunded')}
              </span>
            </div>
          ) : isPrivateOrHighFee ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-teal-400 text-xs font-medium">
                  {t('flexibleAdmission')}
                </span>
              </div>
              {/* Affiliate Label & Why Tooltip */}
              <div className="relative group">
                <button
                  type="button"
                  onMouseEnter={() => setShowWhyTooltip(true)}
                  onMouseLeave={() => setShowWhyTooltip(false)}
                  onClick={() => setShowWhyTooltip(!showWhyTooltip)}
                  className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 border border-slate-700 rounded-md hover:border-slate-600 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-slate-400 text-xs">{t('whyThis')}</span>
                  <AffiliateLabel variant="subtle" className="ml-0.5" />
                </button>
                {/* Why Tooltip */}
                {showWhyTooltip && (
                  <div className="absolute left-0 top-full mt-2 w-72 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white/90 z-20 shadow-xl">
                    <p className="font-semibold text-white mb-1.5">{t('whyConsiderTitle')}</p>
                    <p className="text-white/80 leading-relaxed mb-2">
                      {t('whyConsiderBody')}
                    </p>
                    <div className="absolute left-4 top-0 transform -translate-y-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-slate-900"></div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Monthly Cost Estimate - PROMINENT (Proves we are a Study Cost Calculator first) */}
      {program.totalMonthlyCosts > 0 && (
        <div className="mb-4 p-3 md:p-4 bg-slate-800/40 border border-slate-700/60 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Euro className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
              {t('monthlyCostEstimate2026')}
            </span>
          </div>
          <div className="space-y-2.5">
            {/* Rent Row */}
            {monthlyRent > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <div className="flex items-center gap-2 text-slate-300">
                  <Home className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-xs md:text-sm">{t('rentInclUtilities')}</span>
                </div>
                <span className="text-white font-semibold text-sm md:text-base sm:text-right">
                  {formatCurrency(monthlyRent, 'EUR', 1)}
                </span>
              </div>
            )}
            {/* Semester Fee Row */}
            {monthlySemesterFee > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <div className="flex items-center gap-2 text-slate-300 min-w-0">
                  <Euro className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-xs md:text-sm">
                    {t('semesterFee')}
                    {program.semester_fee && (
                      <span className="text-slate-500 ml-1 text-xs hidden sm:inline">
                        ({formatCurrency(program.semester_fee, 'EUR', 1)} / {SEMESTER_DURATION_MONTHS} months)
                      </span>
                    )}
                  </span>
                </div>
                <span className="text-white font-semibold text-sm md:text-base sm:text-right">
                  {formatCurrency(monthlySemesterFee, 'EUR', 1)}
                </span>
              </div>
            )}
            {/* Total Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 pt-2.5 border-t border-slate-700/60">
              <span className="text-white font-semibold text-sm md:text-base">{t('total')}</span>
              <span className="text-white font-bold text-lg md:text-xl sm:text-right">
                {formatCurrency(program.totalMonthlyCosts, 'EUR', 1)}{t('perMonthShort')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Admission Chances Speedometer - Visually Subdued (Secondary to costs) */}
      {admissionChance && (
        <div className="mb-4 p-3 bg-slate-800/30 border border-slate-700/40 rounded-lg opacity-90">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider">
              {t('admissionChances')}
            </span>
            {!isOpenAdmissionNc(program.nc) && program.nc !== null && (
              <span className="text-xs text-slate-600">
                NC: {program.nc} | GPA: {userGpa?.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-center scale-75 md:scale-100 origin-center">
            <Speedometer
              score={admissionChance.score}
              label={admissionChance.label}
              color={admissionChance.color}
              size={100}
              showPercentage={true}
            />
          </div>
        </div>
      )}

      {/* Stats Grid - NC Badge and BAföG Toggle */}
      <div className="mb-4 space-y-3">
        <div className="flex flex-col">
          <span className="text-xs text-slate-500 mb-1">{t('ncGradeCutoff')}</span>
          {program.nc !== null ? (
            <span className="text-blue-400 font-semibold text-lg">
              {formatNcDisplay(program.nc, locale)}
            </span>
          ) : (
            <span className="text-blue-400 text-sm font-medium">{formatNcDisplay(null, locale)}</span>
          )}
        </div>
        
        {/* BAföG Check Toggle */}
        {program.totalMonthlyCosts > 0 && (
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-800/30 transition-colors touch-manipulation min-h-[44px]">
              <div className="relative flex-shrink-0">
                <input
                  type="checkbox"
                  checked={hasBafoegCheck}
                  onChange={(e) => setHasBafoegCheck(e.target.checked)}
                  className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 appearance-none checked:bg-blue-600 checked:border-blue-600 touch-manipulation"
                />
                {hasBafoegCheck && (
                  <svg
                    className="absolute left-0 top-0 w-5 h-5 text-white pointer-events-none"
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
              <span className="text-slate-400 group-hover:text-slate-300 text-xs md:text-sm">
                {t('bafoegCheck')}
              </span>
            </label>
            {hasBafoegCheck && (
              <p className="text-[10px] md:text-xs text-slate-500 mt-1.5 ml-11">
                {t('bafoegEntitlementUpTo', { amount: formatCurrency(BAFOEG_MAX_2026, 'EUR', 1) })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cost Summary Section - Shown after breakdown */}
      {program.totalMonthlyCosts > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex flex-col flex-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 block">
                {hasBafoegCheck ? t('netCostsAfterBafoeg') : t('totalMonthlyBudget')}
              </span>
              <div className="flex items-center gap-3">
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
                        {t('comparisonToGermanAverage', { amount: GERMAN_AVG_2026 })}
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
              <div className="mt-2">
                {hasBafoegCheck && isBafoegFullyCovered ? (
                  <span className="text-cyan-400 text-[10px] font-medium">
                    {t('fullyCoveredByBafoeg')}
                  </span>
                ) : hasBafoegCheck && netGap > 0 ? (
                  <span className="text-slate-400 text-[10px]">
                    {t('remainingCostsAfterBafoeg')}
                  </span>
                ) : !hasBafoegCheck && costCategory === 'green' && categoryStyles ? (
                  <span className="text-emerald-400 text-[10px] font-medium">
                    {categoryStyles.labelText}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer - Different Button for Private vs Public */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onToggleComparison?.(programComparisonId)}
            disabled={!onToggleComparison}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isSelectedForComparison
                ? 'border-blue-400/70 bg-blue-500/20 text-blue-200'
                : 'border-white/20 bg-slate-800/50 text-slate-300 hover:border-blue-400/60 hover:text-white'
            } ${!onToggleComparison ? 'cursor-not-allowed opacity-40' : ''}`}
          >
            <Scale className="h-3.5 w-3.5" />
            {t('compare')}
          </button>
          {isPrivate ? (
            <button
              onClick={onConsultationClick}
              className="text-slate-300 hover:text-white text-xs underline transition-colors"
            >
              {t('consultation')}
            </button>
          ) : (
            <button
              onClick={() => {
                trackEvent('program_click', 'NC Checker', program.programName);
                onDetailsClick?.();
              }}
              className="text-slate-300 hover:text-white text-xs underline transition-colors"
            >
              {t('detailsAndErasmus')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

