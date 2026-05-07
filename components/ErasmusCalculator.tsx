'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useCurrency, type CurrencyCode } from '@/contexts/CurrencyContext';
import {
  GraduationCap,
  Book,
  MapPin,
  Euro,
  Shield,
  ArrowRight,
  CheckCircle2,
  Info,
  AlertCircle,
  PiggyBank,
  TrendingUp,
  Plane,
  Search,
  ChevronDown,
  Home,
  Utensils,
  Bus,
  ChevronRight,
  Clock,
  ExternalLink,
} from 'lucide-react';
import erasmusPartnersData from '@/data/erasmus-partners.json';
import universitiesData from '@/data/universities.json';
import { getGermanUniversityId, getPartnersByGermanUniversity, getCityCostData, isVisaRelevantDestination } from '@/lib/erasmus-costs';
import { partnerMatchesProgram } from '@/lib/program-subject-mapping';
import type { ErasmusPartner } from '@/data/erasmus-partner-types';
import PartnerVerificationBadge, { getPartnerCardBorderClass } from '@/components/PartnerVerificationBadge';
import AffiliateLabel from '@/components/AffiliateLabel';
import { trackEvent } from '@/lib/analytics';
import { HEALTH_INSURANCE } from '@/lib/affiliate-links';
import { AFFILIATE_ENABLED, AFFILIATE_TRACKING_ENABLED } from '@/lib/feature-flags';
import { getErasmusGrant } from '@/lib/erasmus-grants';
import { BAFOEG_ERASMUS_ADDON, BAFOEG_ERASMUS_TUITION_MAX, BAFOEG_ERASMUS_TRAVEL_ALLOWANCE } from '@/lib/bafoeg-logic';
import { SEMESTER_DURATION_MONTHS, FRANKFURTER_API_URL } from '@/lib/constants';
import { formatCurrency as formatCurrencyUtil } from '@/lib/format';

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

import type { PartnerUniversity, ErasmusPartnerData } from '@/data/erasmus-types';
import { useErasmusStore } from '@/lib/store/useErasmusStore';

interface CostBreakdown {
  partner: PartnerUniversity;
  monthlyLivingCost: number;
  erasmusGrant: number; // Total grant (base + social top-up if applicable)
  netMonthlyCost: number;
  totalSemesterCost: number;
  insuranceCost: number;
  totalCost: number;
  socialTopUp: number; // Social top-up amount (0 if not applicable)
  germanUniSemesterFee: number; // Heimat-Uni Semesterbeitrag (full amount per semester)
}

export default function ErasmusCalculator() {
  const t = useTranslations('Erasmus');
  const tBAfoeg = useTranslations('BAfoeg');
  const locale = useLocale();
  const { selectedCurrency } = useCurrency();
  const { selectedUniversity, selectedProgram, selectedPartner: initialSelectedPartner, hasBAfoeg: hasInlandsBAfoeg, setHasBAfoeg: setHasInlandsBAfoeg } = useErasmusStore();
  
  // State for cost breakdown toggle (expand living cost composition)
  const [isCostBreakdownExpanded, setIsCostBreakdownExpanded] = useState(false);
  
  // State for funding deduction (total funding amount to subtract from costs)
  const [fundingDeduction, setFundingDeduction] = useState<number>(0);

  // State for International Health Insurance override (null = use partner default)
  const [internationalHealthInsuranceOverride, setInternationalHealthInsuranceOverride] = useState<number | null>(null);
  // State for Visa & Documents (one-time cost, relevant for non-EU destinations)
  const [visaAndDocumentsCost, setVisaAndDocumentsCost] = useState<number>(0);
  
  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [hasExchangeRateError, setHasExchangeRateError] = useState(false);

  // Auto-scroll to details when a partner is selected in ErasmusSelector
  useEffect(() => {
    if (initialSelectedPartner) {
      document.getElementById('breakdown-anchor')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [initialSelectedPartner]);

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

        const response = await fetch(FRANKFURTER_API_URL, {
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
          setHasExchangeRateError(false);
        }
      } catch (error) {
        // Handle fetch errors gracefully (network errors, timeouts, invalid responses)
        if (isMounted) {
          setHasExchangeRateError(true);
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

  // Get partner universities for selected university AND program (no results when only university selected)
  const partnerUniversities = useMemo(() => {
    if (!selectedUniversity || !selectedProgram) return [];
    
    // Try new structure first
    try {
      const uniId = getGermanUniversityId(selectedUniversity);
      if (uniId) {
        const newPartners = getPartnersByGermanUniversity(uniId);
        if (newPartners && newPartners.length > 0) {
          // Convert and filter by program (subject_area)
          return newPartners
            .filter((partner: ErasmusPartner) =>
              partnerMatchesProgram(partner.subject_area, selectedProgram)
            )
            .map((partner: ErasmusPartner) => {
              const costData = getCityCostData(
                partner.partner_city,
                partner.partner_country,
                partner.cost_index
              );
              return {
                name: partner.partner_uni_name,
                city: partner.partner_city,
                country: partner.partner_country,
                monthlyLivingCost: costData.monthlyLivingCost,
                travelCost: costData.travelCost,
                insuranceCost: costData.insuranceCost,
                id: partner.id,
                confidence: partner.confidence,
                lastVerified: partner.last_verified,
                facultyDepartment: partner.faculty_department,
                spotsPerYear: partner.spots_per_year,
                spotsPerSemester: partner.spots_per_semester ?? (partner.spots_per_year != null ? Math.floor(partner.spots_per_year / 2) : undefined),
              } as PartnerUniversity;
            });
        }
      }
    } catch (error) {
      console.error('Error loading new partner structure:', error);
    }
    
    // Fallback to old structure (by university + program)
    const match = (erasmusPartnersData as ErasmusPartnerData[]).find(
      (data) =>
        data.germanUniversity === selectedUniversity &&
        data.courseOfStudy === selectedProgram
    );
    if (!match || match.partners === 'no_partners_available') return [];
    return (match.partners as PartnerUniversity[]) || [];
  }, [selectedUniversity, selectedProgram]);

  // German home university semester fee (student pays while abroad)
  const germanUniSemesterFee = useMemo(() => {
    if (!selectedUniversity) return 0;
    const uni = (universitiesData as Array<{ name: string; semesterFee?: number }>).find(
      (u) => u.name === selectedUniversity
    );
    return uni?.semesterFee ?? 0;
  }, [selectedUniversity]);

  // Calculate cost breakdowns for each partner (includes Heimat-Uni semester fee in costs)
  const costBreakdowns = useMemo((): CostBreakdown[] => {
    const monthlySemesterFee = germanUniSemesterFee / SEMESTER_DURATION_MONTHS;
    return partnerUniversities.map((partner: PartnerUniversity) => {
      const erasmusGrant = getErasmusGrant(partner.country).amount;
      const socialTopUp = hasInlandsBAfoeg ? BAFOEG_ERASMUS_ADDON : 0;
      const totalGrant = erasmusGrant + socialTopUp;
      // Net monthly = Living - Grants + Insurance + Semester fee (Heimat-Uni)
      const netMonthlyCost = partner.monthlyLivingCost - totalGrant + partner.insuranceCost + monthlySemesterFee;
      const totalSemesterCost = netMonthlyCost * SEMESTER_DURATION_MONTHS;
      const totalCost = totalSemesterCost;

      return {
        partner,
        monthlyLivingCost: partner.monthlyLivingCost,
        erasmusGrant: totalGrant, // Total grant including social top-up
        netMonthlyCost,
        totalSemesterCost,
        insuranceCost: partner.insuranceCost,
        totalCost,
        socialTopUp, // Store separately for display
        germanUniSemesterFee: germanUniSemesterFee,
      };
    });
  }, [partnerUniversities, hasInlandsBAfoeg, germanUniSemesterFee]);

  const formatCurrency = (amount: number): string =>
    formatCurrencyUtil(amount, selectedCurrency, conversionRate);

  // Show results only when university AND program selected (not when only university)
  const shouldShowResults = selectedUniversity && selectedProgram && partnerUniversities.length > 0;

  // Detail view: show when partner selected in ErasmusSelector (no redundant list - selector has the partner cards)
  const displayBreakdown = useMemo(() => {
    if (!initialSelectedPartner || costBreakdowns.length === 0) return null;
    return costBreakdowns.find(
      (b) =>
        b.partner.name === initialSelectedPartner.name &&
        b.partner.city === initialSelectedPartner.city &&
        b.partner.country === initialSelectedPartner.country
    ) ?? null;
  }, [initialSelectedPartner, costBreakdowns]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-24">
      {shouldShowResults && costBreakdowns.length > 0 ? (
        <>
          {hasExchangeRateError && (
            <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-950/30 px-4 py-3 text-yellow-100 text-sm">
              {t('exchangeRateFallback')}
            </div>
          )}
          {/* --- DETAIL VIEW - Only when partner selected in ErasmusSelector above --- */}
          {displayBreakdown ? (
            <div className="animate-in fade-in slide-in-from-bottom-10 duration-500 space-y-6">
              {/* Scroll Anchor */}
              <div id="breakdown-anchor" className="scroll-mt-24"></div>
              
              {(() => {
                const breakdown = displayBreakdown;
                const grantInfo = getErasmusGrant(breakdown.partner.country);
                const baseLivingCost = breakdown.monthlyLivingCost;
                const erasmusGrantAmount = breakdown.erasmusGrant - breakdown.socialTopUp;
                const totalGrants = breakdown.erasmusGrant;
                const effectiveInsuranceCost = internationalHealthInsuranceOverride ?? breakdown.insuranceCost;
                const monthlySemesterFee = breakdown.germanUniSemesterFee / SEMESTER_DURATION_MONTHS;
                const visaCost = isVisaRelevantDestination(breakdown.partner.country) ? visaAndDocumentsCost : 0;
                const netMonthlyCost = baseLivingCost - totalGrants + effectiveInsuranceCost + monthlySemesterFee;
                const totalSemesterCost = netMonthlyCost * SEMESTER_DURATION_MONTHS;
                const totalCost = totalSemesterCost + visaCost;
                
                return (
                  <>
                    {/* 1. FUNDING SECTION (The Yellow Box) */}
                    {/* Funding section for selected partner */}
                    <div className="p-1 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                      <div className="bg-slate-950/90 backdrop-blur-md p-6 rounded-2xl border border-amber-500/20">
                        <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                          <PiggyBank className="w-5 h-5" /> {t('fundingAndSupportTitle')}
                        </h3>
                        
                        {/* Erasmus Grant Summary */}
                        <div className="flex justify-between items-center mb-6 pb-6 border-b border-amber-500/10">
                          <div>
                            <div className="text-white font-medium">{t('estimatedErasmusGrant')}</div>
                            <div className="text-sm text-slate-400">{t('erasmusGrantBasedOn', { group: t(`erasmusGrantGroup${grantInfo.group}` as const), country: breakdown.partner.country })}</div>
                          </div>
                          <div className="text-2xl font-bold text-amber-400">
                            +{formatCurrency(erasmusGrantAmount)}
                            <span className="text-xs text-amber-400/60">{t('perMonthShort')}</span>
                          </div>
                        </div>

                        {/* BAföG Checker */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-white">{t('hasDomesticBafoeg')}</span>
                            <button
                              type="button"
                              onClick={() => setHasInlandsBAfoeg(!hasInlandsBAfoeg)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                                hasInlandsBAfoeg ? 'bg-amber-500' : 'bg-slate-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  hasInlandsBAfoeg ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>

                          {/* Dynamic BAföG Info Box */}
                          <div className="bg-amber-500/5 p-4 rounded-lg border border-amber-500/10">
                            {hasInlandsBAfoeg ? (
                              <div>
                                <div className="flex items-center gap-2 mb-3">
                                  <TrendingUp className="w-5 h-5 text-amber-400" />
                                  <p className="text-amber-200 font-semibold">{t('bafoegEligibleTitle')}</p>
                                </div>
                                <ul className="space-y-2 text-sm text-amber-200">
                                  <li className="flex gap-2 items-start">
                                    <Plane className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>{t('bafoegTravelAllowance', { amount: formatCurrency(BAFOEG_ERASMUS_TRAVEL_ALLOWANCE) })}</span>
                                  </li>
                                  <li className="flex gap-2 items-start">
                                    <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>{t('bafoegErasmusAllowance')}</span>
                                  </li>
                                  <li className="flex gap-2 items-start">
                                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>{t('bafoegInsuranceTopup')}</span>
                                  </li>
                                </ul>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm text-amber-200 mb-2">
                                  {t('bafoegCheckStillImportant')}
                                </p>
                                <p className="text-sm text-amber-200/80">
                                  {t('bafoegTipWithoutDomestic', {
                                    tuition: formatCurrency(BAFOEG_ERASMUS_TUITION_MAX),
                                    travel: formatCurrency(BAFOEG_ERASMUS_TRAVEL_ALLOWANCE),
                                  })}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. COST BREAKDOWN (The Calculation) */}
                    <div className={`p-8 rounded-2xl bg-slate-800 border border-slate-700 ${getPartnerCardBorderClass(breakdown.partner.confidence, true)}`}>
                      {/* Hero Section: Net Monthly Cost */}
                      <div className="mb-6">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                          {t('yourMonthlyShare')}
                        </div>
                        <div className="text-5xl font-extrabold text-white mb-2">
                          {formatCurrency(Math.max(0, netMonthlyCost))}
                        </div>
                        <div className="text-sm text-slate-400">
                          {t('totalSemesterCostLabel')}: {formatCurrency(Math.max(0, totalCost))}
                          {visaCost > 0 && (
                            <span className="text-slate-500 ml-1">
                              {t('includingVisaDocuments', { amount: formatCurrency(visaCost) })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Verification info */}
                      {(breakdown.partner.confidence || breakdown.partner.lastVerified || breakdown.partner.facultyDepartment || breakdown.partner.spotsPerYear || breakdown.partner.spotsPerSemester) && (
                        <div className="mb-6 flex flex-wrap gap-3 text-xs text-slate-400">
                          {breakdown.partner.confidence && (
                            <PartnerVerificationBadge confidence={breakdown.partner.confidence} />
                          )}
                          {breakdown.partner.lastVerified && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {t('verifiedOn')}: {new Date(breakdown.partner.lastVerified).toLocaleDateString(locale === 'en' ? 'en-GB' : 'de-DE')}
                            </span>
                          )}
                          {breakdown.partner.facultyDepartment && (
                            <span className="inline-flex items-center gap-1">
                              <Book className="w-3 h-3" />
                              {breakdown.partner.facultyDepartment.split('||')[0].trim()}
                            </span>
                          )}
                          {(breakdown.partner.spotsPerSemester ?? breakdown.partner.spotsPerYear) && (
                            <span className="inline-flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" />
                              {breakdown.partner.spotsPerSemester != null
                                ? t('spotsPerSemester', { count: breakdown.partner.spotsPerSemester })
                                : t('spotsPerYear', { count: breakdown.partner.spotsPerYear })}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Divider */}
                      <div className="border-t border-slate-700 my-6"></div>

                      {/* Calculation Breakdown */}
                      <div className="space-y-3">
                        {/* Ø Living Cost */}
                        <div 
                          className="flex items-center justify-between cursor-pointer group pb-3 border-b border-slate-700/50"
                          onClick={() => setIsCostBreakdownExpanded((prev) => !prev)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-slate-300 text-sm">{t('monthlyLivingCost')}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-slate-300 font-medium">
                              {formatCurrency(baseLivingCost)}
                            </div>
                            {/* Label & Arrow */}
                            <div className="flex items-center gap-1 text-teal-400 text-xs font-medium bg-teal-500/10 px-2.5 py-1 rounded-full border border-teal-500/20 group-hover:bg-teal-500/20 transition-colors">
                              <span>{t('averageLabel')}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isCostBreakdownExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Breakdown Table */}
                        {isCostBreakdownExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
                            <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">{t('costComposition')}</h4>
                            
                            <div className="space-y-2.5 text-sm">
                              <div className="flex justify-between items-center text-slate-300">
                                <span className="flex items-center gap-2">
                                  <Home className="w-4 h-4 text-slate-500" />
                                  {t('costRentSharedRoom')}
                                </span>
                                <span className="font-medium">~{formatCurrency(Math.round(baseLivingCost * 0.45))}</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-300">
                                <span className="flex items-center gap-2">
                                  <Utensils className="w-4 h-4 text-slate-500" />
                                  {t('costGroceries')}
                                </span>
                                <span className="font-medium">~{formatCurrency(Math.round(baseLivingCost * 0.30))}</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-300">
                                <span className="flex items-center gap-2">
                                  <Bus className="w-4 h-4 text-slate-500" />
                                  {t('costMobilityLeisure')}
                                </span>
                                <span className="font-medium">~{formatCurrency(Math.round(baseLivingCost * 0.25))}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Erasmus+ Grant (Deduction) */}
                        <div className="flex justify-between items-center text-emerald-400">
                          <span className="text-sm">{t('erasmusGrant')}</span>
                          <span className="font-medium">-{formatCurrency(erasmusGrantAmount)}</span>
                        </div>

                        {/* Social Top-Up (if BAföG recipient) */}
                        {breakdown.socialTopUp > 0 && (
                          <div data-testid="erasmus-social-topup" className="flex justify-between items-center text-emerald-400">
                            <span className="text-sm flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {tBAfoeg('socialTopUp.monthlyAmount', { amount: BAFOEG_ERASMUS_ADDON })}
                            </span>
                            <span className="font-medium">-{formatCurrency(breakdown.socialTopUp)}</span>
                          </div>
                        )}

                        {/* International Health Insurance (Addition) - user editable */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-slate-400">
                            <span className="text-sm flex items-center gap-2">
                              <Shield className="w-4 h-4 text-slate-500" />
                              {t('internationalHealthInsurance')}
                              <AffiliateLabel variant="subtle" />
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                step={5}
                                value={internationalHealthInsuranceOverride ?? effectiveInsuranceCost}
                                onChange={(e) => {
                                  const v = parseFloat(e.target.value);
                                  setInternationalHealthInsuranceOverride(Number.isNaN(v) ? null : v);
                                }}
                                className="w-20 px-2 py-1 text-sm bg-slate-900 border border-slate-600 rounded text-white"
                              />
                              <span className="text-xs text-slate-500">{t('perMonthShortEuro')}</span>
                            </div>
                          </div>
                          {AFFILIATE_ENABLED && HEALTH_INSURANCE && !HEALTH_INSURANCE.startsWith('YOUR_') && (
                            <a
                              href={HEALTH_INSURANCE}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                if (AFFILIATE_TRACKING_ENABLED) trackEvent('click_affiliate_link', 'Erasmus', 'HealthInsurance');
                              }}
                              className="text-xs text-teal-400 hover:text-teal-300 inline-flex items-center gap-1"
                            >
                              {t('compareInsuranceProviders')}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {/* Visa & Documents (one-time) - only relevant for non-EU destinations */}
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center text-slate-400">
                            <span className="text-sm flex items-center gap-2" title={t('visaAndDocumentsHint')}>
                              <Plane className="w-4 h-4 text-slate-500" />
                              {t('visaAndDocuments')}
                              {!isVisaRelevantDestination(breakdown.partner.country) && (
                                <Info className="w-3.5 h-3.5 text-slate-500" aria-label={t('visaAndDocumentsHint')} />
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                step={10}
                                value={visaAndDocumentsCost}
                                onChange={(e) => setVisaAndDocumentsCost(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-20 px-2 py-1 text-sm bg-slate-900 border border-slate-600 rounded text-white"
                                title={t('visaAndDocumentsHint')}
                              />
                              <span className="text-xs text-slate-500">€</span>
                            </div>
                          </div>
                          {!isVisaRelevantDestination(breakdown.partner.country) && (
                            <p className="text-xs text-slate-500">{t('visaAndDocumentsHint')}</p>
                          )}
                        </div>

                        {/* Semester fee (Heimat-Uni) */}
                        {breakdown.germanUniSemesterFee > 0 && (
                          <div className="flex justify-between items-center text-slate-400">
                            <span className="text-sm flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-slate-500" />
                              {t('homeUniversitySemesterFee')}
                            </span>
                            <span className="font-medium">+{formatCurrency(breakdown.germanUniSemesterFee)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}
        </>
      ) : (
        /* Empty State Placeholder */
        <div className="mt-8 flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-slate-700 bg-slate-900/20 text-slate-400">
          <Search className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-lg mb-2">{t('emptyStateTitle')}</p>
          <p className="text-sm text-center max-w-md">
            {t('emptyStateSubtitle')}
          </p>
        </div>
      )}
    </div>
  );
}


