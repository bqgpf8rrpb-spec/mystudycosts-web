'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Plane } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { getErasmusGrantAmount } from '@/lib/erasmus-grants';
import { BAFOEG_ERASMUS_ADDON } from '@/lib/bafoeg-logic';
import { DEFAULT_LIVING_EXPENSES, getMonthlySemesterFee } from '@/lib/constants';
import { useErasmusStore } from '@/lib/store/useErasmusStore';

interface CityData {
  name: string;
  city: string;
  country?: string; // For Erasmus grant calculation
  rent: number;
  semesterFee: number;
  livingExpenses?: number;
}

interface CostComparisonProps {
  homeCityData: CityData;
  partnerCityData: CityData;
}


export default function CostComparison({
  homeCityData,
  partnerCityData,
}: CostComparisonProps) {
  const { hasBAfoeg, setHasBAfoeg } = useErasmusStore();
  const [showStickySummary, setShowStickySummary] = useState(false);
  const homeSectionRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('BAfoeg');

  // Calculate Erasmus grant
  const erasmusGrant = useMemo(() => {
    return getErasmusGrantAmount(partnerCityData.country);
  }, [partnerCityData.country]);

  // Calculate BAföG Auslandszuschuss
  const bafoegZuschuss = hasBAfoeg ? BAFOEG_ERASMUS_ADDON : 0;

  // Calculate totals
  const homeTotal =
    homeCityData.rent +
    getMonthlySemesterFee(homeCityData.semesterFee) +
    (homeCityData.livingExpenses || DEFAULT_LIVING_EXPENSES);
  
  const partnerGrossTotal =
    partnerCityData.rent +
    0 + // Erasmus: No semester fee!
    (partnerCityData.livingExpenses || DEFAULT_LIVING_EXPENSES);

  // Net total after grants
  const partnerNetTotal = Math.max(0, partnerGrossTotal - erasmusGrant - bafoegZuschuss);

  // For progress bar comparison (max value for scaling)
  const maxCost = Math.max(homeTotal, partnerGrossTotal, 1000); // Ensure minimum scale

  // Net difference
  const netDifference = homeTotal - partnerNetTotal;

  // Intersection Observer to detect when home section is scrolled past
  useEffect(() => {
    const homeSection = homeSectionRef.current;
    if (!homeSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If home section is not intersecting (scrolled past), show sticky summary
          setShowStickySummary(!entry.isIntersecting && netDifference > 0);
        });
      },
      {
        threshold: 0,
        rootMargin: '-50px 0px 0px 0px', // Trigger when section is 50px above viewport
      }
    );

    observer.observe(homeSection);

    return () => {
      observer.disconnect();
    };
  }, [netDifference]);

  return (
    <div className="bg-slate-900/80 rounded-2xl p-5 md:p-8">
      <div className="flex flex-col md:grid md:grid-cols-2 gap-6 md:gap-8 relative">
        {/* Mobile Divider - Horizontal with Icon */}
        <div className="md:hidden flex items-center justify-center py-4">
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-slate-800"></div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600/20 border border-blue-600/30">
              <Plane className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 h-px bg-slate-800"></div>
          </div>
        </div>

        {/* Desktop Divider - Vertical */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-slate-800 transform -translate-x-1/2" />

        {/* Left Column - Home */}
        <div ref={homeSectionRef} className="space-y-4 md:space-y-6 w-full">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
              Study in {homeCityData.city}
            </h2>
            <p className="text-slate-400 text-xs md:text-sm">{homeCityData.name}</p>
          </div>

          {/* Cost Items */}
          <div className="space-y-3 md:space-y-4">
            {/* Rent */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 text-xs md:text-sm">Rent (incl. utilities)</span>
                <span className="text-white font-semibold text-sm md:text-base">
                  {formatCurrency(homeCityData.rent, 'EUR', 1)}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(homeCityData.rent / maxCost) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Semester Fee (Monthly) */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 text-xs md:text-sm">
                  Semester Fee (monthly)
                </span>
                <span className="text-white font-semibold text-sm md:text-base">
                  {formatCurrency(getMonthlySemesterFee(homeCityData.semesterFee), 'EUR', 1)}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(getMonthlySemesterFee(homeCityData.semesterFee) / maxCost) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Living Expenses */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 text-xs md:text-sm">Living Expenses</span>
                <span className="text-white font-semibold text-sm md:text-base">
                  {formatCurrency(homeCityData.livingExpenses || DEFAULT_LIVING_EXPENSES, 'EUR', 1)}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${((homeCityData.livingExpenses || DEFAULT_LIVING_EXPENSES) / maxCost) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="pt-3 md:pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-bold text-base md:text-lg">Total</span>
              <span className="text-white font-bold text-lg md:text-xl">
                {formatCurrency(homeTotal, 'EUR', 1)}
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all"
                style={{
                  width: `${(homeTotal / maxCost) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Erasmus */}
        <div className="space-y-4 md:space-y-6 w-full">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
              Erasmus in {partnerCityData.city}
            </h2>
            <p className="text-slate-400 text-xs md:text-sm">{partnerCityData.name}</p>
          </div>

          {/* Cost Items */}
          <div className="space-y-3 md:space-y-4">
            {/* Rent */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 text-xs md:text-sm">Local Rent</span>
                <span className="text-white font-semibold text-sm md:text-base">
                  {formatCurrency(partnerCityData.rent, 'EUR', 1)}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${(partnerCityData.rent / maxCost) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Semester Fee - Erasmus Advantage */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 text-xs md:text-sm">
                  Semester Fee
                </span>
                <span className="text-emerald-400 font-semibold text-sm md:text-base">0 €</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-slate-700 h-2 rounded-full" style={{ width: '0%' }} />
              </div>
              <p className="text-xs text-emerald-400 mt-1">
                ✓ Erasmus Advantage: No additional fee!
              </p>
            </div>

            {/* Living Expenses */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-300 text-xs md:text-sm">Living Expenses</span>
                <span className="text-white font-semibold text-sm md:text-base">
                  {formatCurrency(partnerCityData.livingExpenses || DEFAULT_LIVING_EXPENSES, 'EUR', 1)}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${((partnerCityData.livingExpenses || DEFAULT_LIVING_EXPENSES) / maxCost) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* BAföG Toggle */}
          <div className="pt-3 md:pt-4 border-t border-slate-800">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={hasBAfoeg}
                  onChange={(e) => setHasBAfoeg(e.target.checked)}
                  className="w-4 h-4 md:w-5 md:h-5 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 appearance-none checked:bg-blue-600 checked:border-blue-600"
                />
                {hasBAfoeg && (
                  <svg
                    className="absolute left-0 top-0 w-4 h-4 md:w-5 md:h-5 text-white pointer-events-none"
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
              <span className="text-slate-300 group-hover:text-white text-xs md:text-sm">
                I receive BAföG (State Funding)
              </span>
            </label>
            {hasBAfoeg && (
              <p className="text-xs text-emerald-400 mt-2 ml-7 md:ml-8">
                {t('bafoegSupplementConfirmation', { amount: BAFOEG_ERASMUS_ADDON })}
              </p>
            )}
          </div>

          {/* Grants Section */}
          <div className="pt-3 md:pt-4 border-t border-slate-800 space-y-2 md:space-y-3">
            <h3 className="text-slate-300 font-medium text-xs md:text-sm">Grants</h3>
            
            {/* Erasmus+ Grant */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-slate-400 text-xs md:text-sm">Erasmus+ Grant</span>
                <span className="text-emerald-400 font-semibold text-sm md:text-base">
                  -{formatCurrency(erasmusGrant, 'EUR', 1)}
                </span>
              </div>
              {partnerCityData.country && (
                <p className="text-xs text-slate-500">
                  {partnerCityData.country}
                </p>
              )}
            </div>

            {/* BAföG Auslandszuschuss */}
            {hasBAfoeg && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-slate-400 text-xs md:text-sm">BAföG Abroad Supplement</span>
                  <span className="text-emerald-400 font-semibold text-sm md:text-base">
                    -{formatCurrency(bafoegZuschuss, 'EUR', 1)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="pt-3 md:pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-bold text-base md:text-lg">Gross</span>
              <span className="text-slate-400 font-semibold text-base md:text-lg">
                {formatCurrency(partnerGrossTotal, 'EUR', 1)}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2 gap-2">
              <span className="text-white font-bold text-xs md:text-lg flex-shrink-0">Net</span>
              <span className="hidden md:inline text-white font-bold text-lg">(after grants)</span>
              <span className="text-emerald-400 font-bold text-lg md:text-xl whitespace-nowrap">
                {formatCurrency(partnerNetTotal, 'EUR', 1)}
              </span>
            </div>
            <p className="text-xs text-slate-500 md:hidden mb-2">after grants</p>
            <div className="w-full bg-slate-800 rounded-full h-3">
              <div
                className="bg-emerald-600 h-3 rounded-full transition-all"
                style={{
                  width: `${(partnerNetTotal / maxCost) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Net Difference Display */}
      <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-slate-800">
        {netDifference > 0 ? (
          <div className="text-center">
            <p className="text-slate-400 text-xs md:text-sm mb-2">
              You effectively save abroad
            </p>
            <p className="text-emerald-400 font-bold text-2xl md:text-3xl mb-1">
              {formatCurrency(netDifference, 'EUR', 1)}
            </p>
            <p className="text-slate-400 text-xs md:text-sm">
              per month through grants
            </p>
            <p className="text-emerald-400 font-semibold text-base md:text-lg mt-2 md:mt-3">
              ({formatCurrency(netDifference * 6, 'EUR', 1)} per semester)
            </p>
          </div>
        ) : netDifference < 0 ? (
          <div className="text-center">
            <p className="text-slate-400 text-xs md:text-sm mb-2">
              Additional costs abroad
            </p>
            <p className="text-rose-400 font-bold text-2xl md:text-3xl mb-1">
              {formatCurrency(Math.abs(netDifference), 'EUR', 1)}
            </p>
            <p className="text-slate-400 text-xs md:text-sm">
              per month
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-slate-400 text-xs md:text-sm">
              Costs are identical
            </p>
          </div>
        )}
      </div>

      {/* Mobile Sticky Summary */}
      {showStickySummary && netDifference > 0 && (
        <div
          className={`block md:hidden fixed bottom-0 left-0 right-0 z-50 bg-blue-600/95 backdrop-blur-md border-t border-blue-500/30 shadow-lg animate-in slide-in-from-bottom duration-500`}
        >
          <div className="flex items-center justify-between px-5 py-4 max-w-full">
            <span className="text-white text-sm font-medium flex-shrink-0">
              Your monthly savings
            </span>
            <span className="text-white font-bold text-xl ml-4 whitespace-nowrap">
              {formatCurrency(netDifference, 'EUR', 1)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

