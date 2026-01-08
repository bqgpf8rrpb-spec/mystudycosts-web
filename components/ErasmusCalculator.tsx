'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
  erasmusGrant: number; // Total grant (base + social top-up if applicable)
  netMonthlyCost: number;
  totalSemesterCost: number;
  insuranceCost: number;
  totalCost: number;
  socialTopUp: number; // Social top-up amount (0 if not applicable)
}

interface ErasmusCalculatorProps {
  selectedUniversity?: string;
  selectedProgram?: string;
  hasBAfoeg?: boolean;
}

export default function ErasmusCalculator({ 
  selectedUniversity = '', 
  selectedProgram = '',
  hasBAfoeg: initialHasBAfoeg = false
}: ErasmusCalculatorProps) {
  const t = useTranslations('Erasmus');
  const tBAfoeg = useTranslations('BAfoeg');
  const { selectedCurrency } = useCurrency();
  
  // State for BAföG toggle
  const [hasInlandsBAfoeg, setHasInlandsBAfoeg] = useState(initialHasBAfoeg);
  
  // State for cost breakdown toggle (track by partner index)
  const [openBreakdownIndex, setOpenBreakdownIndex] = useState<number | null>(null);
  
  // State for selected partner university (for detailed view)
  const [selectedPartnerIndex, setSelectedPartnerIndex] = useState<number | null>(null);
  
  // State for funding deduction (total funding amount to subtract from costs)
  const [fundingDeduction, setFundingDeduction] = useState<number>(0);
  
  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);

  // Auto-scroll to details when a partner is selected
  useEffect(() => {
    if (selectedPartnerIndex !== null) {
      document.getElementById('breakdown-anchor')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedPartnerIndex]);

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

  // Social Top-Up amount for BAföG recipients (2026)
  const SOCIAL_TOP_UP_AMOUNT = 250;

  // Calculate cost breakdowns for each partner
  const costBreakdowns = useMemo((): CostBreakdown[] => {
    return partnerUniversities.map((partner: PartnerUniversity) => {
      const erasmusGrant = ERASMUS_GRANTS_BY_COUNTRY[partner.country] || ERASMUS_GRANTS_BY_COUNTRY['default'];
      const socialTopUp = hasInlandsBAfoeg ? SOCIAL_TOP_UP_AMOUNT : 0;
      const totalGrant = erasmusGrant + socialTopUp;
      const netMonthlyCost = partner.monthlyLivingCost - totalGrant;
      const totalSemesterCost = netMonthlyCost * SEMESTER_DURATION;
      const totalCost = totalSemesterCost + (partner.insuranceCost * SEMESTER_DURATION);

      return {
        partner,
        monthlyLivingCost: partner.monthlyLivingCost,
        erasmusGrant: totalGrant, // Total grant including social top-up
        netMonthlyCost,
        totalSemesterCost,
        insuranceCost: partner.insuranceCost,
        totalCost,
        socialTopUp, // Store separately for display
      };
    });
  }, [partnerUniversities, hasInlandsBAfoeg]);

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

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-24">
      {shouldShowResults && costBreakdowns.length > 0 ? (
        <>
          {/* --- LIST VIEW (Master) --- */}
          <div className="space-y-4 mb-10">
            <h2 className="text-xl font-bold text-white mb-4">Ergebnisse</h2>
            
            {/* Search Results Loop */}
            {costBreakdowns.map((breakdown, index) => (
              <div 
                key={index}
                onClick={() => setSelectedPartnerIndex(index)}
                className={`
                  group relative p-5 rounded-xl border cursor-pointer transition-all duration-300
                  ${selectedPartnerIndex === index 
                    ? 'bg-slate-800 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                    : 'bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800/50'
                  }
                `}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    {/* Number Badge or Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${selectedPartnerIndex === index ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                      {breakdown.partner.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{breakdown.partner.name}</h3>
                      <p className="text-sm text-slate-400">{breakdown.partner.city}, {breakdown.partner.country}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-cyan-400 uppercase tracking-widest mb-1">Ø Kosten</div>
                    <div className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {formatCurrency(breakdown.monthlyLivingCost)} <ChevronRight className="inline w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* --- DETAIL VIEW (Slave) - Opens on Click --- */}
          {selectedPartnerIndex !== null && costBreakdowns[selectedPartnerIndex] ? (
            <div className="animate-in fade-in slide-in-from-bottom-10 duration-500 space-y-6">
              {/* Scroll Anchor */}
              <div id="breakdown-anchor" className="scroll-mt-24"></div>
              
              {(() => {
                const breakdown = costBreakdowns[selectedPartnerIndex];
                // Calculate Net Monthly Cost: (Living Cost - Grants + Insurance)
                const baseLivingCost = breakdown.monthlyLivingCost;
                const erasmusGrantAmount = breakdown.erasmusGrant - breakdown.socialTopUp; // Base grant without social top-up
                const totalGrants = breakdown.erasmusGrant; // Total grants (base + social top-up if applicable)
                const insuranceCost = breakdown.insuranceCost;
                const netMonthlyCost = baseLivingCost - totalGrants + insuranceCost;
                const totalSemesterCost = netMonthlyCost * SEMESTER_DURATION;
                
                return (
                  <>
                    {/* 1. FUNDING SECTION (The Yellow Box) */}
                    {/* Forces render if selectedPartnerIndex exists */}
                    <div className="p-1 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                      <div className="bg-slate-950/90 backdrop-blur-md p-6 rounded-2xl border border-amber-500/20">
                        <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                          <PiggyBank className="w-5 h-5" /> Finanzierung & Förderung
                        </h3>
                        
                        {/* Erasmus Grant Summary */}
                        <div className="flex justify-between items-center mb-6 pb-6 border-b border-amber-500/10">
                          <div>
                            <div className="text-white font-medium">Geschätzter Erasmus-Zuschuss</div>
                            <div className="text-sm text-slate-400">Basierend auf Ländergruppe ({breakdown.partner.country})</div>
                          </div>
                          <div className="text-2xl font-bold text-amber-400">
                            +{formatCurrency(erasmusGrantAmount)}
                            <span className="text-xs text-amber-400/60">/mtl.</span>
                          </div>
                        </div>

                        {/* BAföG Checker */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-white">Beziehst du Inlands-BAföG?</span>
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
                                  <p className="text-amber-200 font-semibold">Jackpot! Im Ausland bekommst du wahrscheinlich noch mehr.</p>
                                </div>
                                <ul className="space-y-2 text-sm text-amber-200">
                                  <li className="flex gap-2 items-start">
                                    <Plane className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span><strong>500€</strong> Reisekostenpauschale (einmalig, EU)</span>
                                  </li>
                                  <li className="flex gap-2 items-start">
                                    <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span><strong>300€</strong> Erasmus-Freibetrag (bis zu 300€ Erasmus-Geld werden NICHT angerechnet!)</span>
                                  </li>
                                  <li className="flex gap-2 items-start">
                                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>Krankenversicherungs-Zuschlag: ca. <strong>94€/Monat</strong> (falls zutreffend)</span>
                                  </li>
                                </ul>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm text-amber-200 mb-2">
                                  <strong>Wichtig:</strong> Prüfe trotzdem deinen Anspruch!
                                </p>
                                <p className="text-sm text-amber-200/80">
                                  <strong>Geheimtipp:</strong> Durch höhere Freibeträge im Ausland sind viele Studenten förderberechtigt, auch ohne Inlands-BAföG. Du könntest bis zu <strong>5.600€</strong> für Studiengebühren + <strong>500€</strong> Reisekosten erhalten.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. COST BREAKDOWN (The Calculation) */}
                    <div className="p-8 rounded-2xl bg-slate-800 border border-slate-700">
                      {/* Hero Section: Net Monthly Cost */}
                      <div className="mb-6">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                          Dein monatlicher Eigenanteil
                        </div>
                        <div className="text-5xl font-extrabold text-white mb-2">
                          {formatCurrency(Math.max(0, netMonthlyCost))}
                        </div>
                        <div className="text-sm text-slate-400">
                          Gesamtkosten für 1 Semester: {formatCurrency(Math.max(0, totalSemesterCost))}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-slate-700 my-6"></div>

                      {/* Calculation Breakdown */}
                      <div className="space-y-3">
                        {/* Ø Living Cost */}
                        <div 
                          className="flex items-center justify-between cursor-pointer group pb-3 border-b border-slate-700/50"
                          onClick={() => setOpenBreakdownIndex(openBreakdownIndex === selectedPartnerIndex ? null : selectedPartnerIndex)}
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
                              <span>Ø Durchschnitt</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${openBreakdownIndex === selectedPartnerIndex ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </div>

                        {/* Collapsible Breakdown Table */}
                        {openBreakdownIndex === selectedPartnerIndex && (
                          <div className="mt-3 pt-3 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
                            <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Zusammensetzung</h4>
                            
                            <div className="space-y-2.5 text-sm">
                              <div className="flex justify-between items-center text-slate-300">
                                <span className="flex items-center gap-2">
                                  <Home className="w-4 h-4 text-slate-500" />
                                  Miete (WG-Zimmer)
                                </span>
                                <span className="font-medium">~{formatCurrency(Math.round(baseLivingCost * 0.45))}</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-300">
                                <span className="flex items-center gap-2">
                                  <Utensils className="w-4 h-4 text-slate-500" />
                                  Lebensmittel
                                </span>
                                <span className="font-medium">~{formatCurrency(Math.round(baseLivingCost * 0.30))}</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-300">
                                <span className="flex items-center gap-2">
                                  <Bus className="w-4 h-4 text-slate-500" />
                                  Mobilität & Freizeit
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
                          <div className="flex justify-between items-center text-emerald-400">
                            <span className="text-sm flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {tBAfoeg('socialTopUp.monthlyAmount')}
                            </span>
                            <span className="font-medium">-{formatCurrency(breakdown.socialTopUp)}</span>
                          </div>
                        )}

                        {/* Insurance (Addition) */}
                        <div className="flex justify-between items-center text-slate-400">
                          <span className="text-sm flex items-center gap-2">
                            <Shield className="w-4 h-4 text-slate-500" />
                            {t('insuranceCost')}
                          </span>
                          <span className="font-medium">+{formatCurrency(insuranceCost)}</span>
                        </div>
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
          <p className="text-lg mb-2">Wohin soll es gehen?</p>
          <p className="text-sm text-center max-w-md">
            Wähle eine Stadt oder Uni, um deine Kosten und Förderung zu berechnen.
          </p>
        </div>
      )}
    </div>
  );
}


