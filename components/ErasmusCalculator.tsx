'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useCurrency, type CurrencyCode } from '@/contexts/CurrencyContext';
import {
  GraduationCap,
  Book,
  MapPin,
  Euro,
  Plane,
  Shield,
  ArrowRight,
  CheckCircle2,
  Info,
  AlertCircle,
} from 'lucide-react';
import erasmusPartnersData from '@/data/erasmus-partners.json';
import universitiesData from '@/data/universities.json';

// Erasmus Grant Amounts (2026) - Monthly amounts for Study Abroad by country
// Based on Erasmus+ 2026 grant tiers
const ERASMUS_GRANTS_BY_COUNTRY: Record<string, number> = {
  // €390/month: Higher living cost countries
  'Austria': 390,
  'Belgium': 390,
  'Denmark': 390,
  'Finland': 390,
  'France': 390,
  'Iceland': 390,
  'Ireland': 390,
  'Italy': 390,
  'Liechtenstein': 390,
  'Luxembourg': 390,
  'Netherlands': 390,
  'Norway': 390,
  'Sweden': 390,
  'Switzerland': 390,
  'United Kingdom': 390,
  // €330/month: Medium and lower living cost countries
  'Cyprus': 330,
  'Czech Republic': 330,
  'Greece': 330,
  'Malta': 330,
  'Portugal': 330,
  'Slovenia': 330,
  'Spain': 330,
  'Bulgaria': 330,
  'Croatia': 330,
  'Estonia': 330,
  'Hungary': 330,
  'Latvia': 330,
  'Lithuania': 330,
  'Poland': 330,
  'Romania': 330,
  'Slovakia': 330,
  // Default fallback for countries not explicitly listed
  'default': 330,
};

// Semester duration (months)
const SEMESTER_DURATION = 6;

// Exchange rates interface
interface ExchangeRates {
  USD: number;
  INR: number;
  CNY: number;
  GBP: number;
}

interface FrankfurterApiResponse {
  amount: number;
  base: string;
  date: string;
  rates: ExchangeRates;
}

interface PartnerUniversity {
  name: string;
  city: string;
  country: string;
  monthlyLivingCost: number;
  travelCost: number;
  insuranceCost: number;
}

interface ErasmusPartnerData {
  germanUniversity: string;
  courseOfStudy: string;
  partners: PartnerUniversity[];
}

interface CostBreakdown {
  partner: PartnerUniversity;
  monthlyLivingCost: number;
  erasmusGrant: number;
  netMonthlyCost: number;
  totalSemesterCost: number;
  travelCost: number;
  insuranceCost: number;
  totalCost: number;
}

interface ErasmusCalculatorProps {
  selectedUniversity?: string;
  selectedProgram?: string;
}

export default function ErasmusCalculator({ 
  selectedUniversity = '', 
  selectedProgram = '' 
}: ErasmusCalculatorProps) {
  const t = useTranslations('Erasmus');
  const { selectedCurrency } = useCurrency();

  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  // Fetch exchange rates on mount
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchRates = async () => {
      try {
        setIsLoadingRates(true);
        
        // Set timeout for fetch request
        const timeoutId = setTimeout(() => {
          abortController.abort();
        }, 10000); // 10 second timeout

        const response = await fetch('https://api.frankfurter.app/latest?from=EUR', {
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as FrankfurterApiResponse;
        
        // Validate response structure
        if (!data.rates || typeof data.rates !== 'object') {
          throw new Error('Invalid API response structure');
        }

        if (isMounted) {
          setExchangeRates(data.rates);
        }
      } catch (error) {
        // Handle fetch errors gracefully (network errors, timeouts, invalid responses)
        if (isMounted) {
          setExchangeRates({
            USD: 1,
            INR: 1,
            CNY: 1,
            GBP: 1,
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingRates(false);
        }
      }
    };

    fetchRates();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Get exchange rate for selected currency (default to 1:1 if not loaded or EUR)
  const getRate = (currency: CurrencyCode): number => {
    if (currency === 'EUR') return 1;
    if (!exchangeRates) return 1;
    return exchangeRates[currency] || 1;
  };

  const conversionRate = getRate(selectedCurrency);

  // Get partner universities for selected combination
  const partnerUniversities = useMemo(() => {
    if (!selectedUniversity || !selectedProgram) return [];
    const match = (erasmusPartnersData as ErasmusPartnerData[]).find(
      (data) =>
        data.germanUniversity === selectedUniversity &&
        data.courseOfStudy === selectedProgram
    );
    return (match?.partners as PartnerUniversity[]) || [];
  }, [selectedUniversity, selectedProgram]);

  // Calculate cost breakdowns for each partner
  const costBreakdowns = useMemo((): CostBreakdown[] => {
    return partnerUniversities.map((partner: PartnerUniversity) => {
      const erasmusGrant = ERASMUS_GRANTS_BY_COUNTRY[partner.country] || ERASMUS_GRANTS_BY_COUNTRY['default'];
      const netMonthlyCost = partner.monthlyLivingCost - erasmusGrant;
      const totalSemesterCost = netMonthlyCost * SEMESTER_DURATION;
      const totalCost = totalSemesterCost + partner.travelCost + (partner.insuranceCost * SEMESTER_DURATION);

      return {
        partner,
        monthlyLivingCost: partner.monthlyLivingCost,
        erasmusGrant,
        netMonthlyCost,
        totalSemesterCost,
        travelCost: partner.travelCost,
        insuranceCost: partner.insuranceCost,
        totalCost,
      };
    });
  }, [partnerUniversities]);

  const formatCurrency = (amount: number): string => {
    const converted = amount * conversionRate;
    const rounded = Math.round(converted * 100) / 100;
    const wholePart = Math.floor(rounded);
    const centsPart = Math.round((rounded - wholePart) * 100);
    const formattedWhole = wholePart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    const currencySymbols: Record<CurrencyCode, string> = {
      EUR: '€',
      USD: '$',
      INR: '₹',
      CNY: '¥',
      GBP: '£',
    };
    const symbol = currencySymbols[selectedCurrency] || '€';
    
    return `${symbol} ${formattedWhole},${centsPart.toString().padStart(2, '0')}`;
  };

  // Only show results if we have selections and partners
  const shouldShowResults = selectedUniversity && selectedProgram && partnerUniversities.length > 0;

  // Don't render anything if no selection
  if (!shouldShowResults) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6">
      {/* Results: Cost Breakdown */}
      {costBreakdowns.length > 0 && (
        <div className="space-y-6">
          {/* Summary Header */}
          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6 sm:p-8">
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-white mb-2">{t('costBreakdown')}</h3>
              <p className="text-white/70">{selectedUniversity} - {selectedProgram}</p>
            </div>
          </div>

          {/* Partner University Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {costBreakdowns.map((breakdown, index) => (
              <div
                key={index}
                className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6"
              >
                {/* Partner University Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-blue-400" />
                    <h4 className="text-lg font-bold text-white">{breakdown.partner.name}</h4>
                  </div>
                  <p className="text-white/60 text-sm">
                    {breakdown.partner.city}, {breakdown.partner.country}
                  </p>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm">{t('monthlyLivingCost')}</span>
                    <span className="text-white font-medium">{formatCurrency(breakdown.monthlyLivingCost)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-blue-400">
                    <span className="text-sm">{t('erasmusGrant')}</span>
                    <span className="font-medium">-{formatCurrency(breakdown.erasmusGrant)}</span>
                  </div>
                  
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm">{t('netMonthlyCost')}</span>
                      <span className="text-white font-medium">{formatCurrency(breakdown.netMonthlyCost)}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Plane className="w-4 h-4 text-white/60" />
                      <span className="text-white/70 text-xs">{t('travelCost')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">{t('oneTime')}</span>
                      <span className="text-white/80 text-sm">{formatCurrency(breakdown.travelCost)}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-white/60" />
                      <span className="text-white/70 text-xs">{t('insuranceCost')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">{t('perMonth')}</span>
                      <span className="text-white/80 text-sm">{formatCurrency(breakdown.insuranceCost)}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t-2 border-blue-500/30">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-white font-medium">{t('totalSemesterCost')}</span>
                      <span className="text-white font-bold text-lg">{formatCurrency(breakdown.totalCost)}</span>
                    </div>
                    <p className="text-white/60 text-xs">{t('forSixMonths')}</p>
                  </div>
                </div>

                {breakdown.netMonthlyCost < 0 && (
                  <div className="bg-green-950/30 border border-green-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-green-400" />
                      <p className="text-green-300 text-xs font-medium">
                        {t('grantCoversExpenses')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-white/70 text-sm space-y-2">
                <p>{t('infoNote')}</p>
                <p className="text-xs text-white/60">{t('disclaimer')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


