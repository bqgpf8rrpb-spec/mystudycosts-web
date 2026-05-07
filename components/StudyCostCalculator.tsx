'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
// Import icons from lucide-react - Next.js 15 will optimize these automatically via optimizePackageImports
import {
  MapPin,
  Plane,
  Shield,
  Building,
  Euro,
  Info,
  Search,
  ChevronDown,
  Loader2,
  ExternalLink,
  GraduationCap,
  Download,
  Wallet,
  GitCompare,
  Lock,
  ArrowRight,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Database,
  Briefcase,
  Coins,
  Book,
  BookOpen,
  Landmark,
  Calendar,
  Home,
  Radio,
  ShieldAlert,
  Check,
} from 'lucide-react';
import { useCurrency, type CurrencyCode } from '@/contexts/CurrencyContext';
import { trackEvent } from '@/lib/analytics';
import AffiliateLabel from '@/components/AffiliateLabel';
import { AFFILIATE_ENABLED, AFFILIATE_TRACKING_ENABLED } from '@/lib/feature-flags';
import { useTranslations } from 'next-intl';
import { pdf } from '@react-pdf/renderer';
import universitiesData from '@/data/universities.json';
import { calculateMonthlyRent } from '@/lib/costs';
import { OFFICIAL_LINKS, FRANKFURTER_APP_URL } from '@/lib/external-urls';
// FRANKFURTER_APP_URL used for attribution links
import { formatCurrency } from '@/lib/format';
import { DEFAULT_AVG_RENT_FALLBACK, DEFAULT_NON_EU_TUITION_FALLBACK, FRANKFURTER_API_URL } from '@/lib/constants';
import {
  BLOCKED_ACCOUNT_MONTHLY,
  BLOCKED_ACCOUNT_YEARLY,
  HEALTH_INSURANCE_PUBLIC,
  HEALTH_INSURANCE_PRIVATE,
  CALCULATOR_LIVING_EXPENSES,
  BLOCKED_ACCOUNT_PROVIDERS,
  RUNDFUNKBEITRAG_QUARTERLY,
  SECURITY_DEPOSIT_MULTIPLIER,
  INITIAL_HOUSEHOLD_SETUP,
  LANGUAGE_COURSE_MONTHLY,
  HOUSING_MULTIPLIER_DORM,
  HOUSING_MULTIPLIER_PRIVATE,
} from '@/lib/calculator-defaults';
import StudyReportPDF from '@/components/export/StudyReportPDF';
import { buildStudyCostExportPayload, buildStudyReportFileName } from '@/lib/export-utils';
import { useUserStore } from '@/lib/store/useUserStore';

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

// ============================================
// EDIT DATA HERE - Expanded Data Structure
// ============================================

// All countries worldwide (comprehensive list)
const COUNTRIES: Record<string, number> = {
  'Afghanistan': 75,
  'Albania': 75,
  'Algeria': 75,
  'Argentina': 75,
  'Australia': 75,
  'Austria': 0, // EU member
  'Bangladesh': 75,
  'Belarus': 75,
  'Belgium': 0, // EU member
  'Bolivia': 75,
  'Bosnia and Herzegovina': 75,
  'Brazil': 75,
  'Bulgaria': 0, // EU member
  'Cambodia': 75,
  'Canada': 75,
  'Chile': 75,
  'China': 75,
  'Colombia': 75,
  'Comoros': 75,
  'Congo': 75, // Republic of the Congo
  'Costa Rica': 75,
  'Croatia': 0, // EU member
  "Côte d'Ivoire": 75,
  'Democratic Republic of the Congo': 75,
  'Czech Republic': 0, // EU member
  'Denmark': 0, // EU member
  'Dominican Republic': 75,
  'Ecuador': 75,
  'Egypt': 75,
  'Estonia': 0, // EU member
  'Ethiopia': 75,
  'Finland': 0, // EU member
  'France': 0, // EU member
  'Georgia': 75,
  'Germany': 0, // Home country
  'Ghana': 75,
  'Greece': 0, // EU member
  'Hungary': 0, // EU member
  'Iceland': 0, // EEA member
  'India': 75,
  'Indonesia': 75,
  'Iran': 75,
  'Iraq': 75,
  'Ireland': 0, // EU member
  'Israel': 75,
  'Italy': 0, // EU member
  'Japan': 75,
  'Jordan': 75,
  'Kazakhstan': 75,
  'Kenya': 75,
  'Kosovo': 75,
  'Kuwait': 75,
  'Latvia': 0, // EU member
  'Lebanon': 75,
  'Lithuania': 0, // EU member
  'Luxembourg': 0, // EU member
  'Malaysia': 75,
  'Malta': 0, // EU member
  'Mexico': 75,
  'Morocco': 75,
  'Nepal': 75,
  'Netherlands': 0, // EU member
  'New Zealand': 75,
  'Nigeria': 75,
  'North Macedonia': 75,
  'Norway': 0, // EEA member
  'Pakistan': 75,
  'Peru': 75,
  'Philippines': 75,
  'Poland': 0, // EU member
  'Portugal': 0, // EU member
  'Romania': 0, // EU member
  'Russia': 75,
  'Saudi Arabia': 75,
  'Serbia': 75,
  'Singapore': 75,
  'Slovakia': 0, // EU member
  'Slovenia': 0, // EU member
  'South Africa': 75,
  'South Korea': 75,
  'Spain': 0, // EU member
  'Sri Lanka': 75,
  'Sweden': 0, // EU member
  'Switzerland': 0, // EEA-like status
  'Syria': 75,
  'Taiwan': 75,
  'Tanzania': 75,
  'Thailand': 75,
  'Tunisia': 75,
  'Turkey': 75,
  'Ukraine': 75,
  'United Arab Emirates': 75,
  'United Kingdom': 75,
  'United States': 75,
  'Uruguay': 75,
  'Venezuela': 75,
  'Vietnam': 75,
  'Yemen': 75,
  'Zimbabwe': 75,
};

// All German cities with universities/universities of applied sciences
const UNIVERSITY_CITIES: Record<string, number> = {
  'Aachen': 650,      // RWTH Aachen
  'Augsburg': 700,    // University of Augsburg
  'Bamberg': 580,     // University of Bamberg
  'Bayreuth': 550,    // University of Bayreuth
  'Berlin': 650,      // Multiple universities
  'Bielefeld': 580,   // Bielefeld University
  'Bochum': 600,      // Ruhr University Bochum
  'Bonn': 700,        // University of Bonn
  'Braunschweig': 600, // TU Braunschweig
  'Bremen': 650,      // University of Bremen
  'Chemnitz': 500,    // Chemnitz University of Technology
  'Cologne': 680,     // University of Cologne
  'Darmstadt': 750,   // TU Darmstadt
  'Dortmund': 600,    // TU Dortmund
  'Dresden': 600,     // TU Dresden
  'Duisburg': 550,    // University of Duisburg-Essen
  'Düsseldorf': 720,  // Heinrich Heine University
  'Erfurt': 550,      // University of Erfurt
  'Erlangen': 650,    // FAU Erlangen-Nürnberg
  'Essen': 580,       // University of Duisburg-Essen
  'Frankfurt': 750,   // Goethe University Frankfurt
  'Freiburg': 700,    // University of Freiburg
  'Gießen': 600,      // Justus Liebig University
  'Göttingen': 600,   // University of Göttingen
  'Greifswald': 500,  // University of Greifswald
  'Halle': 550,       // Martin Luther University
  'Hamburg': 700,     // University of Hamburg
  'Hanover': 650,     // Leibniz University Hanover
  'Heidelberg': 750,  // Heidelberg University
  'Jena': 550,        // Friedrich Schiller University
  'Kaiserslautern': 600, // TU Kaiserslautern
  'Karlsruhe': 680,   // KIT Karlsruhe
  'Kassel': 580,      // University of Kassel
  'Kiel': 600,        // Kiel University
  'Koblenz': 550,     // University of Koblenz-Landau
  'Konstanz': 700,    // University of Konstanz
  'Leipzig': 600,     // Leipzig University
  'Lübeck': 650,      // University of Lübeck
  'Magdeburg': 550,   // Otto von Guericke University
  'Mainz': 650,       // Johannes Gutenberg University
  'Mannheim': 700,    // University of Mannheim
  'Marburg': 600,     // Philipps University Marburg
  'Munich': 800,      // LMU Munich, TUM
  'Münster': 650,     // University of Münster
  'Oldenburg': 600,   // University of Oldenburg
  'Osnabrück': 600,   // University of Osnabrück
  'Passau': 600,      // University of Passau
  'Potsdam': 650,     // University of Potsdam
  'Regensburg': 600,  // University of Regensburg
  'Rostock': 550,     // University of Rostock
  'Saarbrücken': 600, // Saarland University
  'Siegen': 550,      // University of Siegen
  'Stuttgart': 720,   // University of Stuttgart
  'Trier': 600,       // Trier University
  'Tübingen': 700,    // University of Tübingen
  'Ulm': 650,         // Ulm University
  'Würzburg': 600,    // University of Würzburg
  'Wuppertal': 580,   // University of Wuppertal
};

import type { University } from '@/types/university';

/** Raw university entry from universities.json */
interface RawUniversityEntry {
  name: string;
  city: string;
  type?: string;
  semesterFee?: number;
  avgRent?: number;
  tuitionFee?: number;
  nonEUTuitionFee?: number;
  institutionType?: string;
  state?: string;
}

// Use imported universities data, ensuring type safety
const UNIVERSITIES: University[] = (universitiesData as RawUniversityEntry[]).map((u) => ({
  name: u.name,
  city: u.city,
  type: (u.type === 'private' ? 'private' : 'public') as University['type'],
  semesterFee: u.semesterFee || 0,
  avgRent: u.avgRent || DEFAULT_AVG_RENT_FALLBACK,
  tuitionFee: u.tuitionFee,
  nonEUTuitionFee: u.nonEUTuitionFee,
}));

// Visa fee structure: base fee + optional service fee
interface VisaFeeInfo {
  baseFee: number; // Embassy/Consulate fee (usually 75€)
  serviceFee?: number; // VFS/Visametric service fee (e.g., 40€ for India, Turkey)
  visaFree?: boolean; // True if visa-free entry (pay residence permit in Germany)
  note?: string; // Special note for this country
}

// VISA_DATA: Maps countries to their visa fee structure
const VISA_DATA: Record<string, VisaFeeInfo> = {
  // High service fee countries (VFS/Visametric required)
  'India': { baseFee: 75, serviceFee: 40 },
  'Turkey': { baseFee: 75, serviceFee: 40 },
  'Bangladesh': { baseFee: 75, serviceFee: 40 },
  'Pakistan': { baseFee: 75, serviceFee: 40 },
  'Nepal': { baseFee: 75, serviceFee: 40 },
  'Sri Lanka': { baseFee: 75, serviceFee: 40 },
  
  // Visa-free entry countries (pay residence permit in Germany ~110€)
  'United States': { baseFee: 0, visaFree: true },
  'USA': { baseFee: 0, visaFree: true },
  'Brazil': { baseFee: 0, visaFree: true },
  'South Korea': { baseFee: 0, visaFree: true },
  'Japan': { baseFee: 0, visaFree: true },
  'Canada': { baseFee: 0, visaFree: true },
  'Australia': { baseFee: 0, visaFree: true },
  'New Zealand': { baseFee: 0, visaFree: true },
  'Singapore': { baseFee: 0, visaFree: true },
  'Israel': { baseFee: 0, visaFree: true },
  'Chile': { baseFee: 0, visaFree: true },
  'Argentina': { baseFee: 0, visaFree: true },
  'Uruguay': { baseFee: 0, visaFree: true },
  
  // EU/EEA countries (no visa needed)
  'Austria': { baseFee: 0 },
  'Belgium': { baseFee: 0 },
  'Bulgaria': { baseFee: 0 },
  'Croatia': { baseFee: 0 },
  'Czech Republic': { baseFee: 0 },
  'Denmark': { baseFee: 0 },
  'Estonia': { baseFee: 0 },
  'Finland': { baseFee: 0 },
  'France': { baseFee: 0 },
  'Germany': { baseFee: 0 },
  'Greece': { baseFee: 0 },
  'Hungary': { baseFee: 0 },
  'Ireland': { baseFee: 0 },
  'Italy': { baseFee: 0 },
  'Latvia': { baseFee: 0 },
  'Lithuania': { baseFee: 0 },
  'Luxembourg': { baseFee: 0 },
  'Malta': { baseFee: 0 },
  'Netherlands': { baseFee: 0 },
  'Poland': { baseFee: 0 },
  'Portugal': { baseFee: 0 },
  'Romania': { baseFee: 0 },
  'Slovakia': { baseFee: 0 },
  'Slovenia': { baseFee: 0 },
  'Spain': { baseFee: 0 },
  'Sweden': { baseFee: 0 },
  'Iceland': { baseFee: 0 },
  'Norway': { baseFee: 0 },
  'Switzerland': { baseFee: 0 },
  
  // Default: Base fee only (75€)
};

// Helper function to get visa fee for a country
function getVisaFee(country: string, hasScholarship: boolean = false): { total: number; breakdown: string; note?: string } {
  if (hasScholarship) {
    return { total: 0, breakdown: '0€ (Scholarship exemption)' };
  }
  
  const visaInfo = VISA_DATA[country];
  if (!visaInfo) {
    // Default: base fee only
    return { total: 75, breakdown: '75€ (Embassy fee)' };
  }
  
  if (visaInfo.baseFee === 0 && visaInfo.visaFree) {
    return { 
      total: 0, 
      breakdown: '0€ (Visa-free entry)',
      note: 'residence_permit'
    };
  }
  
  if (visaInfo.baseFee === 0) {
    // EU/EEA - no visa needed
    return { total: 0, breakdown: '0€ (EU/EEA citizen)' };
  }
  
  const total = visaInfo.baseFee + (visaInfo.serviceFee || 0);
  const breakdown = visaInfo.serviceFee 
    ? `${visaInfo.baseFee}€ Embassy + ${visaInfo.serviceFee}€ Service Fee`
    : `${visaInfo.baseFee}€ (Embassy fee)`;
  
  return { 
    total, 
    breakdown,
    note: visaInfo.serviceFee ? 'service_fee' : undefined
  };
}

const STUDY_DATA = {
  CITIES: UNIVERSITY_CITIES,
  ORIGIN_COUNTRIES: COUNTRIES,
  UNIVERSITIES: UNIVERSITIES,
  FIXED_COSTS: {
    blockedAccountMonthly: BLOCKED_ACCOUNT_MONTHLY,
    blockedAccountYearly: BLOCKED_ACCOUNT_YEARLY,
    healthInsurancePublic: HEALTH_INSURANCE_PUBLIC,
    healthInsurancePrivate: HEALTH_INSURANCE_PRIVATE,
    livingExpenses: CALCULATOR_LIVING_EXPENSES,
  },
  BLOCKED_ACCOUNT_PROVIDERS,
  RUNDFUNKBEITRAG: {
    quarterly: RUNDFUNKBEITRAG_QUARTERLY,
    monthly: 18.36, // Monthly equivalent (for display)
  },
  ARRIVAL_COSTS: {
    securityDepositMultiplier: SECURITY_DEPOSIT_MULTIPLIER,
    initialHouseholdSetup: INITIAL_HOUSEHOLD_SETUP,
  },
  LANGUAGE_COURSE: {
    monthlyCost: LANGUAGE_COURSE_MONTHLY,
  },
} as const;

type City = keyof typeof STUDY_DATA.CITIES;
type OriginCountry = keyof typeof STUDY_DATA.ORIGIN_COUNTRIES;
type InsuranceType = 'public' | 'private';
type JobType = 'minijob' | 'working_student';
type HousingType = 'dorm' | 'wg' | 'private';

// City name mapping for English locale (convert German names to English)
const CITY_NAME_MAP_EN: Record<string, string> = {
  'Düsseldorf': 'Dusseldorf',
  'Gießen': 'Giessen',
  'Göttingen': 'Gottingen',
  'Lübeck': 'Luebeck',
  'Münster': 'Muenster',
  'Osnabrück': 'Osnabrueck',
  'Saarbrücken': 'Saarbruecken',
  'Tübingen': 'Tuebingen',
  'Würzburg': 'Wuerzburg',
  // Keep other cities as-is (they're already in English or don't need translation)
};

// Helper function to get localized city name
function getLocalizedCityName(cityName: string, locale: string): string {
  if (locale === 'en' && CITY_NAME_MAP_EN[cityName]) {
    return CITY_NAME_MAP_EN[cityName];
  }
  return cityName;
}

// Scenario interface for comparison mode
interface Scenario {
  originCountry: OriginCountry | '';
  targetCity: City | '';
  selectedUniversity: string;
  isOtherUniversity: boolean; // True if "Other / Not Listed" is selected
  manualCity?: string; // Manual city input for "Other"
  manualRent?: number; // Manual rent input for "Other"
  manualSemesterFee?: number; // Manual semester fee for "Other"
  manualTuitionFee?: number; // Manual tuition fee for private universities
  housingType: HousingType; // Type of housing: dorm, wg, or private
  rentOverride?: number; // Manual rent override (optional)
  rundfunkbeitragPeople: number; // Number of people sharing the broadcasting fee (1 = full amount)
  needsLanguageCourse: boolean; // Whether the user needs a preparatory language course
  languageCourseDuration: 3 | 6 | 12 | 0; // Duration in months (0 = not selected)
  insuranceType: InsuranceType;
  jobType: JobType;
  hoursPerWeek: number;
  hourlyWage: number;
  hasScholarship: boolean; // Stipend/Erasmus scholarship exemption
  plannedSemesterStart: string; // ISO date string (YYYY-MM-DD)
}

// Calculated values interface
interface CalculatedValues {
  visaFee: number;
  visaFeeBreakdown: string;
  visaFeeNote?: string;
  monthlyRent: number;
  monthlyInsurance: number;
  monthlyRundfunkbeitrag: number;
  semesterFeeMonthly: number;
  nonEUTuitionFeeMonthly: number;
  privateTuitionFeeMonthly: number;
  securityDeposit: number; // 3x monthly rent
  initialHouseholdSetup: number; // Fixed 650€
  arrivalCostsTotal: number; // Security deposit + household setup
  languageCourseCost: number; // Language course cost (monthly cost * duration)
  upfrontTotal: number;
  monthlyTotal: number;
  annualTotal: number;
  grossMonthlyIncome: number;
  netMonthlyIncome: number;
  remainingBudget: number;
}

// Pre-compute options outside component for performance
const COUNTRY_OPTIONS = Object.keys(STUDY_DATA.ORIGIN_COUNTRIES) as OriginCountry[];
const CITY_OPTIONS = Object.keys(STUDY_DATA.CITIES) as City[];
const ALL_UNIVERSITY_OPTIONS = STUDY_DATA.UNIVERSITIES.map(u => u.name);

// University Search Component - Unified with SearchableCombobox behavior
interface UniversitySearchComponentProps {
  universities: University[];
  value: string;
  isOther: boolean;
  onSelect: (universityName: string) => void;
  cardZIndex?: number;
  disabled?: boolean;
  dataTestId?: string;
}

function UniversitySearchComponent({ universities, value, isOther, onSelect, cardZIndex = 90, disabled = false, dataTestId }: UniversitySearchComponentProps) {
  const t = useTranslations('Calculator');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Get locale for city name translation
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] || 'en';

  // Filter universities based on search query
  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return universities;
    
    return universities.filter(u => 
      u.name.toLowerCase().includes(query) ||
      u.city.toLowerCase().includes(query)
    );
  }, [searchQuery, universities]);

  // Add "Other / Not Listed" option and format labels
  const allOptions = useMemo(() => {
    const uniOptions = filteredOptions.map(u => {
      const localizedCity = getLocalizedCityName(u.city, locale);
      return { value: u.name, label: `${u.name} (${localizedCity})`, type: u.type };
    });
    return [...uniOptions, { value: 'OTHER_NOT_LISTED', label: t('otherNotListed'), type: 'other' as const }];
  }, [filteredOptions, t, locale]);

  // Calculate dropdown position when opening (same as SearchableCombobox)
  useEffect(() => {
    if (isOpen && inputWrapperRef.current) {
      const updatePosition = () => {
        if (inputWrapperRef.current) {
          const rect = inputWrapperRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          });
        }
      };
      
      updatePosition();
      
      // Update position on scroll/resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, filteredOptions.length]);

  // Handle outside click (same as SearchableCombobox)
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    }

    // Use capture phase to catch clicks before they bubble
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  // Handle keyboard navigation (same as SearchableCombobox)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev < allOptions.length - 1 ? prev + 1 : prev;
        // Scroll into view
        if (listRef.current && next >= 0) {
          const item = listRef.current.children[next] as HTMLElement;
          item?.scrollIntoView({ block: 'nearest' });
        }
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : -1;
        if (listRef.current && next >= 0) {
          const item = listRef.current.children[next] as HTMLElement;
          item?.scrollIntoView({ block: 'nearest' });
        }
        return next;
      });
    } else if (e.key === 'Enter' && focusedIndex >= 0 && allOptions[focusedIndex]) {
      e.preventDefault();
      handleSelect(allOptions[focusedIndex].value);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
      setFocusedIndex(-1);
    }
  };

  const handleSelect = (universityName: string) => {
    onSelect(universityName);
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  // Show search query when typing, otherwise show selected value
  const displayValue = searchQuery !== '' ? searchQuery : (isOther ? t('otherNotListed') : value || '');

  const toggleDropdown = () => {
    if (disabled) return;
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      inputRef.current?.focus();
    }
  };

  // Render dropdown via Portal (same as SearchableCombobox)
  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdownContent = (
      <>
        {allOptions.length > 0 && (
          <ul
            ref={listRef}
            className="bg-slate-900 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-[100] pointer-events-auto"
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 100,
            }}
          >
            {allOptions.map((option, index) => {
              const isSelected = !isOther && value === option.value;
              return (
                <li
                  key={option.value}
                  data-testid={dataTestId ? `${dataTestId}-option` : undefined}
                  data-value={option.value}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={`px-4 py-2 cursor-pointer transition-colors duration-150 ${
                    index === focusedIndex || isSelected
                      ? 'bg-blue-600/30 text-white'
                      : 'text-white/80 hover:bg-white/10'
                  } ${option.type === 'other' ? 'border-t border-white/10 font-medium' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex-1">{option.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-white flex-shrink-0" />
                    )}
                    {option.type === 'private' && !isSelected && (
                      <span className="text-xs px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded">{t('privateInsuranceLabel')}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {searchQuery && allOptions.length === 0 && (
          <div 
            className="bg-slate-900 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl p-4 z-[100] pointer-events-auto"
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 100,
            }}
          >
            <p className="text-white/60 text-sm">{t('noUniversitiesFound')}</p>
          </div>
        )}
      </>
    );

    return typeof document !== 'undefined' ? createPortal(dropdownContent, document.body) : null;
  };

  // Determine z-index class based on cardZIndex prop
  const zIndexClass = cardZIndex === 100 ? 'z-[100]' : cardZIndex === 90 ? 'z-[90]' : cardZIndex === 80 ? 'z-[80]' : 'z-[10]';
  
  return (
    <>
      <div className={`backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative ${zIndexClass}`}>
        <label className="block mb-2 text-sm font-medium text-white/80 flex items-center gap-2">
          <Search className="w-4 h-4" />
          {t('searchUniversity')}
        </label>
        <div ref={containerRef} className="relative">
          <div ref={inputWrapperRef} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={displayValue}
              onChange={(e) => {
                const newQuery = e.target.value;
                setSearchQuery(newQuery);
                // Clear selection if user starts typing
                if (newQuery && value && !isOther) {
                  onSelect('');
                }
                setIsOpen(true);
                setFocusedIndex(-1);
              }}
              onFocus={(e) => {
                if (disabled) return;
                setIsOpen(true);
                // Select all text when focused if a value is selected
                if (value && !isOther) {
                  e.target.select();
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? t('selectCity') : t('searchUniversityPlaceholder')}
              disabled={disabled}
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-10 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 relative z-10 disabled:opacity-50 disabled:cursor-not-allowed"
              {...(dataTestId ? { 'data-testid': dataTestId } : {})}
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleDropdown();
              }}
              disabled={disabled}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      {renderDropdown()}
    </>
  );
}

// Searchable Combobox Component
interface SearchableComboboxProps<T extends string> {
  options: T[];
  value: T | '';
  onChange: (value: T) => void;
  placeholder: string;
  icon: React.ReactNode;
  label: string;
  cardZIndex?: number;
  dataTestId?: string;
}

function SearchableCombobox<T extends string>({
  options,
  value,
  onChange,
  placeholder,
  icon,
  label,
  cardZIndex = 10,
  dataTestId,
}: SearchableComboboxProps<T>) {
  const t = useTranslations('Calculator');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputWrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter options based on search query
  const filteredOptions = useMemo(() => 
    options.filter((option) =>
      option.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [options, searchQuery]
  );

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && inputWrapperRef.current) {
      const updatePosition = () => {
        if (inputWrapperRef.current) {
          const rect = inputWrapperRef.current.getBoundingClientRect();
          setDropdownPosition({
            top: rect.bottom + 4, // 4px gap, fixed positioning uses viewport coordinates
            left: rect.left,
            width: rect.width,
          });
        }
      };
      
      updatePosition();
      
      // Update position on scroll/resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, filteredOptions.length]);

  // Handle outside click (including portal)
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current && 
        !containerRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    }

    // Use capture phase to catch clicks before they bubble
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev < filteredOptions.length - 1 ? prev + 1 : prev;
        // Scroll into view
        if (listRef.current && next >= 0) {
          const item = listRef.current.children[next] as HTMLElement;
          item?.scrollIntoView({ block: 'nearest' });
        }
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : -1;
        if (listRef.current && next >= 0) {
          const item = listRef.current.children[next] as HTMLElement;
          item?.scrollIntoView({ block: 'nearest' });
        }
        return next;
      });
    } else if (e.key === 'Enter' && focusedIndex >= 0 && filteredOptions[focusedIndex]) {
      e.preventDefault();
      handleSelect(filteredOptions[focusedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
      setFocusedIndex(-1);
    }
  };

  const handleSelect = (option: T) => {
    onChange(option);
    setIsOpen(false);
    setSearchQuery('');
    setFocusedIndex(-1);
  };

  // Show search query when typing, otherwise show selected value
  const displayValue = searchQuery !== '' ? searchQuery : (value || '');

  const toggleDropdown = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      inputRef.current?.focus();
    }
  };

  // Render dropdown via Portal
  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdownContent = (
      <>
        {filteredOptions.length > 0 && (
          <ul
            ref={listRef}
            className="bg-slate-900 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-[100] pointer-events-auto"
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 100,
            }}
          >
            {filteredOptions.map((option, index) => (
              <li
                key={option}
                data-testid={dataTestId ? `${dataTestId}-option` : undefined}
                data-value={option}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`px-4 py-2 cursor-pointer transition-colors duration-150 ${
                  index === focusedIndex || option === value
                    ? 'bg-blue-600/30 text-white'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {option}
              </li>
            ))}
          </ul>
        )}

        {searchQuery && filteredOptions.length === 0 && (
          <div 
            className="bg-slate-900 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl p-4 z-[100] pointer-events-auto"
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 100,
            }}
          >
            <p className="text-white/60 text-sm">{t('noResults')}</p>
          </div>
        )}
      </>
    );

    return typeof document !== 'undefined' ? createPortal(dropdownContent, document.body) : null;
  };

  // Determine z-index class based on cardZIndex prop
  const zIndexClass = cardZIndex === 100 ? 'z-[100]' : cardZIndex === 90 ? 'z-[90]' : cardZIndex === 80 ? 'z-[80]' : 'z-[10]';
  
  return (
    <>
      <div className={`backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative ${zIndexClass}`}>
        <label className="block mb-2 text-sm font-medium text-white/80 flex items-center gap-2">
          {icon}
          {label}
        </label>
        <div ref={containerRef} className="relative">
          <div ref={inputWrapperRef} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 z-10 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={displayValue}
              onChange={(e) => {
                const newQuery = e.target.value;
                setSearchQuery(newQuery);
                // Clear selection if user starts typing
                if (newQuery && value) {
                  onChange('' as T);
                }
                setIsOpen(true);
                setFocusedIndex(-1);
              }}
              onFocus={(e) => {
                setIsOpen(true);
                // Select all text when focused if a value is selected
                if (value) {
                  e.target.select();
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-10 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 relative z-10"
              {...(dataTestId ? { 'data-testid': dataTestId } : {})}
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleDropdown();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-white/10 rounded transition-colors"
              aria-label={t('toggleDropdown')}
            >
              <ChevronDown
                className={`w-4 h-4 text-white/40 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </div>
      {renderDropdown()}
    </>
  );
}

// Currency Selector Component (for Calculator - supports all currencies)
interface CurrencySelectorProps {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
}

function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currencies: CurrencyCode[] = ['EUR', 'USD', 'INR', 'CNY', 'GBP'];
  const currencyLabels: Record<CurrencyCode, string> = {
    EUR: 'EUR (€)',
    USD: 'USD ($)',
    INR: 'INR (₹)',
    CNY: 'CNY (¥)',
    GBP: 'GBP (£)',
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full backdrop-blur-sm bg-slate-950/80 border border-white/20 rounded-lg px-3 py-2 text-white/90 text-sm font-medium hover:bg-slate-950/90 transition-all duration-200 flex items-center justify-between relative z-10"
      >
        <span>{currencyLabels[value]}</span>
        <ChevronDown
          className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div 
          className="absolute top-full left-0 w-full mt-2 backdrop-blur-sm bg-slate-950/95 border border-white/20 rounded-lg shadow-2xl overflow-hidden pointer-events-auto z-[9999]"
          style={{ zIndex: 9999, position: 'absolute' }}
        >
          {currencies.map((currency) => (
            <button
              key={currency}
              type="button"
              onClick={() => {
                onChange(currency);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors duration-150 ${
                currency === value
                  ? 'bg-blue-600/30 text-white'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              {currencyLabels[currency]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Affiliate Links - Replace placeholders with actual affiliate URLs
const AFFILIATE_LINKS = {
  blockedAccount: 'YOUR_EXPATRIO_LINK_OR_FINTIBA_LINK', // Replace with Expatrio or Fintiba affiliate link
  healthInsurance: 'YOUR_FEATHER_LINK_OR_DR_WALTER_LINK', // Replace with Feather or DR-Walter affiliate link
  bankAccount: 'YOUR_BANK_ACCOUNT_LINK', // Replace with bank account affiliate link (e.g., N26, Comdirect)
} as const;

interface StudyCostCalculatorProps {
  initialCity?: City | '';
}

export default function StudyCostCalculator({ initialCity = '' }: StudyCostCalculatorProps = {}) {
  // Get current locale from pathname for locale-aware links
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] || 'en';
  
  // Translations
  const t = useTranslations('Calculator');
  
  // Comparison mode state
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  
  // UI state for info boxes
  const [showVisaInfo, setShowVisaInfo] = useState(false);
  const [openVisaInfo, setOpenVisaInfo] = useState(false);
  const [showMinijobInfo, setShowMinijobInfo] = useState(false);
  const [showWerkstudentInfo, setShowWerkstudentInfo] = useState(false);
  const [showHousingDormInfo, setShowHousingDormInfo] = useState(false);
  const [showHousingWGInfo, setShowHousingWGInfo] = useState(false);
  const [showHousingPrivateInfo, setShowHousingPrivateInfo] = useState(false);
  const [showRundfunkbeitragInfo, setShowRundfunkbeitragInfo] = useState(false);
  
  // Calculate default semester start (6 months from now)
  const getDefaultSemesterStart = (): string => {
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    return date.toISOString().split('T')[0];
  };

  // Primary scenario state
  const [primaryScenario, setPrimaryScenario] = useState<Scenario>({
    originCountry: '',
    targetCity: initialCity,
    selectedUniversity: '',
    isOtherUniversity: false,
    housingType: 'wg', // Default to shared flat
    rundfunkbeitragPeople: 1, // Default: 1 person (full amount)
    needsLanguageCourse: false,
    languageCourseDuration: 0,
    insuranceType: 'public',
    jobType: 'minijob',
    hoursPerWeek: 0,
    hourlyWage: 12.41,
    hasScholarship: false,
    plannedSemesterStart: getDefaultSemesterStart(),
  });
  
  // Comparison scenario state
  const [comparisonScenario, setComparisonScenario] = useState<Scenario>({
    originCountry: '',
    targetCity: '',
    selectedUniversity: '',
    isOtherUniversity: false,
    housingType: 'wg', // Default to shared flat
    rundfunkbeitragPeople: 1, // Default: 1 person (full amount)
    needsLanguageCourse: false,
    languageCourseDuration: 0,
    insuranceType: 'public',
    jobType: 'minijob',
    hoursPerWeek: 0,
    hourlyWage: 12.41,
    hasScholarship: false,
    plannedSemesterStart: getDefaultSemesterStart(),
  });
  
  // Currency from context (shared with Navbar)
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  const homeCity = useUserStore((state) => state.homeCity);
  
  // Exchange rates state
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [showInsuranceInfo, setShowInsuranceInfo] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const resultCardRef = useRef<HTMLDivElement>(null);
  const comparisonContainerRef = useRef<HTMLDivElement>(null);

  // Instructional guides for each checklist item
  const checklistItemGuides: Record<string, string[]> = {
    'apply-university': [
      t('guideApplyUniversity1'),
      t('guideApplyUniversity2'),
      t('guideApplyUniversity3'),
      t('guideApplyUniversity4'),
      t('guideApplyUniversity5'),
    ],
    'admission-letter': [
      t('guideAdmissionLetterIntro'),
      t('guideAdmissionLetter1'),
      t('guideAdmissionLetter2'),
      t('guideAdmissionLetter3'),
    ],
    'blocked-account': [
      t('guideBlockedAccount1'),
      t('guideBlockedAccount2'),
      t('guideBlockedAccount3'),
    ],
    'health-insurance': [
      t('guideHealthInsurance1'),
      t('guideHealthInsurance2'),
      t('guideHealthInsurance3'),
      t('guideHealthInsurance4'),
    ],
    'visa-appointment': [
      t('guideVisaAppointment1'),
      t('guideVisaAppointment2'),
      t('guideVisaAppointment3'),
      t('guideVisaAppointment4'),
    ],
    'accommodation': [
      t('guideAccommodation1'),
      t('guideAccommodation2'),
      t('guideAccommodation3'),
    ],
  };

  // Checklist items for "Your Next Steps"
  const checklistItems = [
    { 
      id: 'apply-university', 
      label: t('checklistApplyUniversity'), 
      subtext: t('checklistDeadlineCheck'),
      officialLink: OFFICIAL_LINKS.applyUniversity,
      officialLinkLabel: 'DAAD',
      guide: checklistItemGuides['apply-university'],
    },
    { 
      id: 'admission-letter', 
      label: t('checklistAdmissionLetter'),
      guide: checklistItemGuides['admission-letter'],
    },
    { 
      id: 'blocked-account', 
      label: t('checklistBlockedAccount'),
      affiliateLink: AFFILIATE_LINKS.blockedAccount,
      affiliateLinkLabel: t('recommendedProvider'),
      showIfNonEU: true,
      guide: checklistItemGuides['blocked-account'],
    },
    { 
      id: 'health-insurance', 
      label: t('checklistHealthInsurance'),
      affiliateLink: AFFILIATE_LINKS.healthInsurance,
      affiliateLinkLabel: t('getInsurance'),
      guide: checklistItemGuides['health-insurance'],
    },
    { 
      id: 'visa-appointment', 
      label: t('checklistVisaAppointment'),
      officialLink: OFFICIAL_LINKS.visaAppointment,
      officialLinkLabel: t('bookAppointment'),
      showIfNonEU: true,
      guide: checklistItemGuides['visa-appointment'],
    },
    { 
      id: 'accommodation', 
      label: t('checklistAccommodation'), 
      highlight: true, 
      highlightText: t('checklistHardestPart'),
      officialLinks: [
        { url: OFFICIAL_LINKS.accommodation.studentenwerk, label: t('studentenwerkLabel') },
        { url: OFFICIAL_LINKS.accommodation.wgGesucht, label: t('wgGesuchtLabel') },
      ],
      guide: checklistItemGuides['accommodation'],
    },
  ];

  // Checklist state - load from localStorage
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem('studyChecklist');
    return saved ? JSON.parse(saved) : {};
  });

  // Info box visibility state (for mobile click interaction)
  const [openInfoBox, setOpenInfoBox] = useState<string | null>(null);
  const infoBoxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (infoBoxTimeoutRef.current) {
        clearTimeout(infoBoxTimeoutRef.current);
      }
    };
  }, []);

  // Close info box when clicking outside (mobile)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openInfoBox && !target.closest('[data-info-box]') && !target.closest('[data-info-button]')) {
        setOpenInfoBox(null);
      }
    };

    if (openInfoBox && typeof window !== 'undefined' && window.innerWidth < 768) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openInfoBox]);

  // Save checklist state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('studyChecklist', JSON.stringify(checklistState));
    }
  }, [checklistState]);

  // Pre-fill calculator city from global profile when no explicit city is selected.
  useEffect(() => {
    if (!homeCity || initialCity || primaryScenario.targetCity) return;
    if (!(homeCity in STUDY_DATA.CITIES)) return;
    setPrimaryScenario((prev) => ({ ...prev, targetCity: homeCity as City }));
  }, [homeCity, initialCity, primaryScenario.targetCity]);

  // Determine if user is Non-EU (requires visa)
  const isNonEU = useMemo(() => {
    return primaryScenario.originCountry 
      ? STUDY_DATA.ORIGIN_COUNTRIES[primaryScenario.originCountry] > 0 
      : false;
  }, [primaryScenario.originCountry]);

  // Filter checklist items based on Non-EU status
  const visibleChecklistItems = useMemo(() => {
    return checklistItems.filter(item => {
      // Show item if it doesn't have showIfNonEU flag, or if user is Non-EU
      return !item.showIfNonEU || isNonEU;
    });
  }, [checklistItems, isNonEU]);

  // Calculate progress
  const progressPercentage = useMemo(() => {
    const checkedCount = visibleChecklistItems.filter(item => checklistState[item.id]).length;
    return checkedCount > 0 ? (checkedCount / visibleChecklistItems.length) * 100 : 0;
  }, [checklistState, visibleChecklistItems]);

  // Toggle checklist item
  const toggleChecklistItem = (id: string) => {
    setChecklistState(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };
  
  // Get selected university data (primary) - moved before other variables
  const selectedUniversityData = useMemo(() => {
    if (!primaryScenario.selectedUniversity || primaryScenario.isOtherUniversity) return null;
    return STUDY_DATA.UNIVERSITIES.find(u => u.name === primaryScenario.selectedUniversity);
  }, [primaryScenario.selectedUniversity, primaryScenario.isOtherUniversity]);

  // Use primary scenario for backwards compatibility (will refactor calculations next)
  const originCountry = primaryScenario.originCountry;
  const targetCity = primaryScenario.targetCity || (selectedUniversityData ? selectedUniversityData.city : '');
  const selectedUniversity = primaryScenario.selectedUniversity;
  const insuranceType = primaryScenario.insuranceType;
  const hoursPerWeek = primaryScenario.hoursPerWeek;
  const hourlyWage = primaryScenario.hourlyWage;

  // Calculate function - takes a scenario and returns calculated values
  const calculateScenario = useMemo(() => {
    return (scenario: Scenario): CalculatedValues => {
      // Get dynamic visa fee based on country and scholarship status
      const visaFeeInfo = scenario.originCountry 
        ? getVisaFee(scenario.originCountry, scenario.hasScholarship)
        : { total: 0, breakdown: '0€', note: undefined };
      const visaFee = visaFeeInfo.total;
      
      // Get university data
      const selectedUniversityData = scenario.selectedUniversity && !scenario.isOtherUniversity
        ? STUDY_DATA.UNIVERSITIES.find(u => u.name === scenario.selectedUniversity)
        : null;
      
      // Determine monthly rent: from override, manual input, or calculated based on housing type
      let monthlyRent = 0;
      
      // Priority 1: Manual override (user-specified rent)
      if (scenario.rentOverride && scenario.rentOverride > 0) {
        monthlyRent = scenario.rentOverride;
      }
      // Priority 2: Manual rent for "Other" university
      else if (scenario.isOtherUniversity && scenario.manualRent) {
        monthlyRent = scenario.manualRent;
      }
      // Priority 3: Calculate based on housing type and university/city data
      else {
        // Determine room size based on housing type
        let roomSize = 20; // Default WG room size
        switch (scenario.housingType) {
          case 'dorm':
            roomSize = 12; // Smaller dorm room
            break;
          case 'wg':
            roomSize = 20; // Standard WG room
            break;
          case 'private':
            roomSize = 35; // Larger private apartment
            break;
        }
        
        // Get city name for calculation
        const cityName = selectedUniversityData?.city || scenario.targetCity || '';
        
        if (cityName) {
          // Use dynamic calculation
          const calculatedRent = calculateMonthlyRent(cityName, roomSize);
          
          // Apply housing type adjustment (dorm is cheaper, private is more expensive)
          switch (scenario.housingType) {
            case 'dorm':
              monthlyRent = calculatedRent * HOUSING_MULTIPLIER_DORM;
              break;
            case 'wg':
              monthlyRent = calculatedRent; // 100% of calculated rent
              break;
            case 'private':
              monthlyRent = calculatedRent * HOUSING_MULTIPLIER_PRIVATE;
              break;
            default:
              monthlyRent = calculatedRent;
          }
        } else {
          // Fallback to old method if city not found
          let baseRent = 0;
          if (selectedUniversityData) {
            baseRent = selectedUniversityData.avgRent ?? DEFAULT_AVG_RENT_FALLBACK;
          } else if (scenario.targetCity) {
            baseRent = STUDY_DATA.CITIES[scenario.targetCity] || 0;
          }
          
          // Apply housing type multiplier
          switch (scenario.housingType) {
            case 'dorm':
              monthlyRent = baseRent * HOUSING_MULTIPLIER_DORM;
              break;
            case 'wg':
              monthlyRent = baseRent;
              break;
            case 'private':
              monthlyRent = baseRent * HOUSING_MULTIPLIER_PRIVATE;
              break;
            default:
              monthlyRent = baseRent;
          }
        }
      }
      
      const monthlyInsurance = scenario.insuranceType === 'public' 
        ? STUDY_DATA.FIXED_COSTS.healthInsurancePublic 
        : STUDY_DATA.FIXED_COSTS.healthInsurancePrivate;
      
      // Rundfunkbeitrag (Broadcasting Fee) - mandatory for all households
      // Quarterly billing: 55.08€ every 3 months, divided by number of people
      const quarterlyRundfunkbeitrag = STUDY_DATA.RUNDFUNKBEITRAG.quarterly;
      const peopleSharing = Math.max(1, scenario.rundfunkbeitragPeople); // At least 1 person
      const monthlyRundfunkbeitrag = (quarterlyRundfunkbeitrag / 3) / peopleSharing; // Monthly equivalent per person
      
      // Semester fee (monthly pro rata - divided by 6 months per semester)
      let semesterFeeMonthly = 0;
      if (scenario.isOtherUniversity && scenario.manualSemesterFee) {
        semesterFeeMonthly = scenario.manualSemesterFee / 6;
      } else if (selectedUniversityData) {
        semesterFeeMonthly = (selectedUniversityData.semesterFee ?? 0) / 6;
      }
      
      // Check if origin country is non-EU (visa fee > 0 means non-EU)
      const isNonEU = scenario.originCountry ? STUDY_DATA.ORIGIN_COUNTRIES[scenario.originCountry] > 0 : false;
      
      // Private university tuition fee (monthly pro rata)
      let privateTuitionFeeMonthly = 0;
      if (selectedUniversityData?.type === 'private' && selectedUniversityData.tuitionFee) {
        privateTuitionFeeMonthly = selectedUniversityData.tuitionFee / 6;
      } else if (scenario.isOtherUniversity && scenario.manualTuitionFee) {
        privateTuitionFeeMonthly = scenario.manualTuitionFee / 6;
      }
      
      // Non-EU Tuition Fee (monthly pro rata - divided by 6 months per semester)
      const nonEUTuitionFeeMonthly = (isNonEU && selectedUniversityData?.nonEUTuitionFee) 
        ? selectedUniversityData.nonEUTuitionFee / 6 
        : 0;
      
      // Arrival costs (one-time, excluding flights)
      const securityDeposit = monthlyRent * STUDY_DATA.ARRIVAL_COSTS.securityDepositMultiplier; // 3 months' rent
      const initialHouseholdSetup = STUDY_DATA.ARRIVAL_COSTS.initialHouseholdSetup; // Fixed 650€
      const arrivalCostsTotal = securityDeposit + initialHouseholdSetup;
      
      // Language course cost (one-time, if needed)
      const languageCourseCost = scenario.needsLanguageCourse && scenario.languageCourseDuration > 0
        ? STUDY_DATA.LANGUAGE_COURSE.monthlyCost * scenario.languageCourseDuration
        : 0;
      
      // Upfront costs (one-time)
      const blockedAccountTotal = STUDY_DATA.FIXED_COSTS.blockedAccountYearly;
      const upfrontTotal = visaFee + blockedAccountTotal + languageCourseCost;

      // Monthly costs
      const monthlyLivingExpenses = STUDY_DATA.FIXED_COSTS.livingExpenses;
      const monthlyTotal = monthlyRent + monthlyInsurance + monthlyRundfunkbeitrag + monthlyLivingExpenses + semesterFeeMonthly + nonEUTuitionFeeMonthly + privateTuitionFeeMonthly;

      // Annual costs (12 months)
      const annualTotal = monthlyTotal * 12;

      // Calculate monthly income based on job type
      let grossMonthlyIncome = 0;
      let netMonthlyIncome = 0;
      
      if (scenario.jobType === 'minijob') {
        // Minijob: Hard cap at €538/month
        // Calculate based on hours and wage, but cap at €538
        const calculatedIncome = scenario.hoursPerWeek * 4.33 * scenario.hourlyWage;
        grossMonthlyIncome = Math.min(calculatedIncome, 538);
        // Minijob: Usually tax-free, no deductions
        netMonthlyIncome = grossMonthlyIncome;
      } else {
        // Working Student: Up to 20 hours/week, apply social security deduction
        grossMonthlyIncome = scenario.hoursPerWeek * 4.33 * scenario.hourlyWage;
        // Working Student: ~10% deduction for social security (pension insurance)
        const socialSecurityRate = 0.10; // 10% for pension insurance
        netMonthlyIncome = grossMonthlyIncome * (1 - socialSecurityRate);
      }
      
      // Calculate remaining budget (expenses - income)
      const remainingBudget = monthlyTotal - netMonthlyIncome;

      return {
        visaFee,
        visaFeeBreakdown: visaFeeInfo.breakdown,
        visaFeeNote: visaFeeInfo.note,
        monthlyRent,
        monthlyInsurance,
        monthlyRundfunkbeitrag,
        semesterFeeMonthly,
        nonEUTuitionFeeMonthly,
        privateTuitionFeeMonthly,
        securityDeposit,
        initialHouseholdSetup,
        arrivalCostsTotal,
        languageCourseCost,
        upfrontTotal,
        monthlyTotal,
        annualTotal,
        grossMonthlyIncome,
        netMonthlyIncome,
        remainingBudget,
      };
    };
  }, []);

  // Calculate values for primary scenario
  const primaryCalculated = useMemo(() => calculateScenario(primaryScenario), [primaryScenario, calculateScenario]);
  
  // Calculate values for comparison scenario
  const comparisonCalculated = useMemo(() => calculateScenario(comparisonScenario), [comparisonScenario, calculateScenario]);

  // Track calculation events when user makes meaningful selections
  useEffect(() => {
    if ((primaryScenario.selectedUniversity || primaryScenario.isOtherUniversity) && primaryScenario.originCountry) {
      // Track calculation event with scenario details
      const cityName = primaryScenario.targetCity || (primaryScenario.isOtherUniversity ? primaryScenario.manualCity : '');
      const calculationKey = `${primaryScenario.originCountry}-${cityName}-${primaryScenario.selectedUniversity || 'other'}`;
      const lastTracked = sessionStorage.getItem('lastCalculationTracked');
      
      // Only track if this is a new calculation (not already tracked)
      if (lastTracked !== calculationKey) {
        trackEvent('calculate_costs', 'Calculator', calculationKey);
        // Also send GA4 event with custom parameters
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'calculate_costs', {
            selected_city: cityName,
            selected_university: primaryScenario.selectedUniversity || 'other',
            origin_country: primaryScenario.originCountry,
          });
        }
        sessionStorage.setItem('lastCalculationTracked', calculationKey);
      }
    }
  }, [primaryScenario.targetCity, primaryScenario.originCountry, primaryScenario.selectedUniversity, primaryScenario.isOtherUniversity, primaryScenario.manualCity]);

  // Filter universities by selected city (primary)
  const filteredUniversities = useMemo(() => {
    if (!primaryScenario.targetCity) {
      return []; // No universities shown until city is selected
    }
    // Case-insensitive city matching to handle any discrepancies
    const cityName = primaryScenario.targetCity;
    const filtered = STUDY_DATA.UNIVERSITIES.filter(u => 
      u.city.toLowerCase() === cityName.toLowerCase() || 
      u.city === cityName
    );
    return filtered;
  }, [primaryScenario.targetCity]);

  // Filter universities by selected city (comparison)
  const comparisonFilteredUniversities = useMemo(() => {
    if (!comparisonScenario.targetCity) {
      return []; // No universities shown until city is selected
    }
    return STUDY_DATA.UNIVERSITIES.filter(u => u.city === comparisonScenario.targetCity);
  }, [comparisonScenario.targetCity]);

  // Fetch exchange rates on mount
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const fetchRates = async () => {
      try {
        setIsLoadingRates(true);
        setApiError(false);
        
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
        }
      } catch (error) {
        // Handle fetch errors gracefully (network errors, timeouts, invalid responses)
        if (isMounted) {
          setApiError(true);
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

  // Use calculated values from primary scenario
  const {
    visaFee,
    visaFeeBreakdown,
    visaFeeNote,
    monthlyRent,
    monthlyInsurance,
    monthlyRundfunkbeitrag,
    semesterFeeMonthly,
    nonEUTuitionFeeMonthly,
    securityDeposit,
    initialHouseholdSetup,
    arrivalCostsTotal,
    languageCourseCost,
    upfrontTotal,
    monthlyTotal,
    annualTotal,
    grossMonthlyIncome,
    netMonthlyIncome,
    remainingBudget,
  } = primaryCalculated;
  
  const blockedAccountTotal = STUDY_DATA.FIXED_COSTS.blockedAccountYearly;
  const monthlyLivingExpenses = STUDY_DATA.FIXED_COSTS.livingExpenses;

  // Convert to selected currency
  const convertedMonthlyTotal = monthlyTotal * conversionRate;
  const convertedAnnualTotal = annualTotal * conversionRate;
  const convertedUpfrontTotal = upfrontTotal * conversionRate;
  const convertedFirstYearTotal = (annualTotal + upfrontTotal) * conversionRate;
  const convertedGrossMonthlyIncome = grossMonthlyIncome * conversionRate;
  const convertedNetMonthlyIncome = netMonthlyIncome * conversionRate;
  const convertedRemainingBudget = remainingBudget * conversionRate;

  // Modular PDF export pipeline with central payload.
  const handleExportPDF = async () => {
    trackEvent('export_pdf', 'Calculator', isComparisonMode ? 'comparison_mode' : 'single_mode');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'pdf_download', {
        mode: isComparisonMode ? 'comparison_mode' : 'single_mode',
      });
    }

    if (typeof window === 'undefined') return;

    setIsExportingPDF(true);

    try {
      // Validation
      if (!primaryCalculated || (!primaryScenario.selectedUniversity && !primaryScenario.isOtherUniversity)) {
        throw new Error(t('selectUniversityFirst'));
      }

      const localizedCity = primaryScenario.targetCity
        ? getLocalizedCityName(primaryScenario.targetCity, locale)
        : t('notSelected');
      const localizedHousingType = primaryScenario.housingType === 'dorm'
        ? t('housingTypeDorm')
        : primaryScenario.housingType === 'wg'
          ? t('housingTypeWG')
          : primaryScenario.housingType === 'private'
            ? t('housingTypePrivate')
            : t('notSelected');

      const recommendationItems = visibleChecklistItems
        .filter((item) => !checklistState[item.id])
        .map((item) => item.label);

      const payload = buildStudyCostExportPayload({
        locale,
        currencyCode: selectedCurrency,
        university: primaryScenario.selectedUniversity || t('notSelected'),
        city: localizedCity,
        countryOfOrigin: primaryScenario.originCountry || t('notSelected'),
        housingType: localizedHousingType,
        monthlyTotal: formatCurrency(monthlyTotal * conversionRate, selectedCurrency),
        annualTotal: formatCurrency(annualTotal * conversionRate, selectedCurrency),
        upfrontTotal: formatCurrency(upfrontTotal * conversionRate, selectedCurrency),
        firstYearTotal: formatCurrency((annualTotal + upfrontTotal) * conversionRate, selectedCurrency),
        costBreakdown: [
          { label: t('averageRent'), value: formatCurrency(primaryCalculated.monthlyRent * conversionRate, selectedCurrency) },
          { label: t('averageHealthInsurance'), value: formatCurrency(primaryCalculated.monthlyInsurance * conversionRate, selectedCurrency) },
          { label: t('rundfunkbeitrag'), value: formatCurrency(primaryCalculated.monthlyRundfunkbeitrag * conversionRate, selectedCurrency) },
          { label: t('averageSemesterFeeProRata'), value: formatCurrency(primaryCalculated.semesterFeeMonthly * conversionRate, selectedCurrency) },
          ...(primaryCalculated.nonEUTuitionFeeMonthly > 0
            ? [{ label: t('nonEUTuitionFeeProRata'), value: formatCurrency(primaryCalculated.nonEUTuitionFeeMonthly * conversionRate, selectedCurrency) }]
            : []),
          { label: t('livingExpenses'), value: formatCurrency(monthlyLivingExpenses * conversionRate, selectedCurrency) },
          { label: t('monthlyTotal'), value: formatCurrency(primaryCalculated.monthlyTotal * conversionRate, selectedCurrency) },
        ],
        recommendationItems: recommendationItems.length > 0
          ? recommendationItems
          : [t('noOpenNextSteps')],
        i18n: {
          reportTitle: t('pdfReportTitle'),
          profileUniversity: t('pdfProfileUniversity'),
          profileCity: t('pdfProfileCity'),
          profileCountryOfOrigin: t('pdfProfileCountry'),
          profileHousingType: t('pdfProfileHousingType'),
          recommendationsTitle: t('pdfNextStepsTitle'),
          recommendationsNote: t('pdfNextStepsNote'),
          financialAdviceTitle: t('pdfFinancialAdviceTitle'),
          checklistTitle: t('pdfChecklistTitle'),
          tipPrefix: t('pdfTipPrefix'),
          checklistItems: [
            t('pdfChecklistItem1'),
            t('pdfChecklistItem2'),
            t('pdfChecklistItem3'),
            t('pdfChecklistItem4'),
          ],
          tipHighRent: t('pdfTipHighRent'),
          tipHighInsurance: t('pdfTipHighInsurance'),
          tipHighMonthlyTotal: t('pdfTipHighMonthlyTotal'),
          tipPrivateHousing: t('pdfTipPrivateHousing'),
          tipVisaPlanning: t('pdfTipVisaPlanning'),
          tipBudgetTracking: t('pdfTipBudgetTracking', { city: localizedCity }),
        },
      });

      const blob = await pdf(<StudyReportPDF payload={payload} />).toBlob();
      const fileName = buildStudyReportFileName(localizedCity);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      
    } catch (error) {
      console.error('[PDF Export] ERROR:', error);
      alert(t('pdfExportError') + '\n\n' + t('checkConsoleDetails'));
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Calculate difference for comparison summary
  const monthlyDifference = useMemo(() => {
    if (!isComparisonMode || !primaryScenario.targetCity || !comparisonScenario.targetCity) return null;
    return comparisonCalculated.monthlyTotal - primaryCalculated.monthlyTotal;
  }, [isComparisonMode, primaryCalculated.monthlyTotal, comparisonCalculated.monthlyTotal, primaryScenario.targetCity, comparisonScenario.targetCity]);

  // High-demand cities that need accommodation warning
  const highDemandCities = ['Munich', 'Berlin', 'Hamburg'];

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6">
      {/* Comparison Mode Toggle */}
      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={() => {
            setIsComparisonMode(!isComparisonMode);
            // When enabling comparison mode, copy primary scenario if comparison is empty
            if (!isComparisonMode && !comparisonScenario.targetCity) {
              setComparisonScenario({
                ...primaryScenario,
                targetCity: '',
                selectedUniversity: '',
              });
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
            isComparisonMode
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-slate-800 hover:bg-slate-700 text-white/80 border border-white/10'
          }`}
        >
          <GitCompare className="w-4 h-4" />
          <span>{isComparisonMode ? t('exitComparison') : t('compareWithAnotherCity')}</span>
        </button>
      </div>

      {/* Comparison Summary Card */}
      {isComparisonMode && primaryScenario.targetCity && comparisonScenario.targetCity && monthlyDifference !== null && (
        <div className="mb-6 backdrop-blur-sm bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-white/20 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">{t('comparisonSummary')}</h3>
              <p className="text-white/80 text-sm">
                <span className="font-semibold">{getLocalizedCityName(comparisonScenario.targetCity, locale)}</span> vs <span className="font-semibold">{getLocalizedCityName(primaryScenario.targetCity, locale)}</span>
              </p>
            </div>
            <div className={`text-right ${monthlyDifference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <div className="text-2xl font-bold">
                {monthlyDifference >= 0 ? '+' : ''}{formatCurrency(Math.abs(monthlyDifference) * conversionRate, selectedCurrency)}
              </div>
              <div className="text-sm text-white/70">
                {monthlyDifference >= 0 ? t('moreExpensive') : t('lessExpensive')} {t('perMonth')}
              </div>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={(!primaryScenario.selectedUniversity && !primaryScenario.isOtherUniversity) || (!comparisonScenario.selectedUniversity && !comparisonScenario.isOtherUniversity) || isExportingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              aria-label={t('downloadReport')}
              title={t('downloadReport')}
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">{t('generating')}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('downloadReport')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Calculator Layout */}
      {!isComparisonMode ? (
        // Single column view (original layout)
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 relative">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-4 relative min-w-0 z-[100]">
          {/* Origin Country Combobox */}
          <SearchableCombobox
            options={COUNTRY_OPTIONS}
            value={primaryScenario.originCountry}
            onChange={(value) => setPrimaryScenario(prev => ({ ...prev, originCountry: value }))}
            placeholder={t('originCountryPlaceholder')}
            icon={<Plane className="w-4 h-4" />}
            label={t('originCountryLabel')}
            cardZIndex={100}
          />

          {/* Scholarship Checkbox */}
          {primaryScenario.originCountry && (
            <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={primaryScenario.hasScholarship}
                  onChange={(e) => setPrimaryScenario(prev => ({ ...prev, hasScholarship: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 bg-black/40 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-white/80 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  {t('scholarshipCheckbox')}
                </span>
              </label>
            </div>
          )}

          {/* City Selection - Must be selected first */}
          <SearchableCombobox
            options={CITY_OPTIONS}
            value={primaryScenario.targetCity}
            onChange={(value) => {
              setPrimaryScenario(prev => ({
                ...prev,
                targetCity: value as City,
                selectedUniversity: '', // Clear university when city changes
                isOtherUniversity: false,
                manualRent: undefined,
                manualSemesterFee: undefined,
                manualTuitionFee: undefined,
              }));
            }}
            placeholder={t('targetCityPlaceholder')}
            icon={<MapPin className="w-4 h-4" />}
            label={t('targetCityLabel')}
            cardZIndex={95}
            dataTestId="calculator-city-select"
          />

          {/* University Search - Only shown after city is selected */}
          <UniversitySearchComponent
            universities={filteredUniversities}
            value={primaryScenario.selectedUniversity}
            isOther={primaryScenario.isOtherUniversity}
            disabled={!primaryScenario.targetCity}
            dataTestId="calculator-university-select"
            onSelect={(universityName) => {
              if (universityName === 'OTHER_NOT_LISTED') {
                setPrimaryScenario(prev => ({
                  ...prev,
                  selectedUniversity: '',
                  isOtherUniversity: true,
                }));
              } else {
                const university = STUDY_DATA.UNIVERSITIES.find(u => u.name === universityName);
                if (university) {
                  setPrimaryScenario(prev => ({
                    ...prev,
                    selectedUniversity: universityName,
                    isOtherUniversity: false,
                    manualRent: undefined,
                    manualSemesterFee: undefined,
                    manualTuitionFee: undefined,
                  }));
                }
              }
            }}
            cardZIndex={90}
          />

          {/* Manual Inputs for "Other / Not Listed" */}
          {primaryScenario.isOtherUniversity && (
            <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-semibold text-white/80 mb-3">{t('otherNotListed')}</h3>
              <div>
                <label className="block text-xs text-white/60 mb-2">{t('manualCityInput')}</label>
                <input
                  type="text"
                  value={primaryScenario.manualCity || ''}
                  onChange={(e) => {
                    const cityValue = e.target.value as City;
                    setPrimaryScenario(prev => ({
                      ...prev,
                      manualCity: e.target.value,
                      targetCity: cityValue,
                    }));
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('enterCityName')}
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-2">{t('manualRentInput')}</label>
                <input
                  type="number"
                  value={primaryScenario.manualRent || ''}
                  onChange={(e) => setPrimaryScenario(prev => ({ ...prev, manualRent: parseFloat(e.target.value) || undefined }))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('manualRentPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-2">{t('manualSemesterFeeInput')}</label>
                <input
                  type="number"
                  value={primaryScenario.manualSemesterFee || ''}
                  onChange={(e) => setPrimaryScenario(prev => ({ ...prev, manualSemesterFee: parseFloat(e.target.value) || undefined }))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t('manualSemesterFeePlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Auto-populated Info & Accommodation Warning */}
          {primaryScenario.selectedUniversity && !primaryScenario.isOtherUniversity && selectedUniversityData && (
            <>
              <div className="backdrop-blur-sm bg-blue-950/30 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-blue-200/90 leading-relaxed">
                      {t('universityAutoPopulated')}
                    </p>
                  </div>
                </div>
              </div>
              {highDemandCities.includes(selectedUniversityData.city) && (
                <div className="backdrop-blur-sm bg-yellow-950/30 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-200 mb-1">{t('housingWarning')}</h4>
                      <p className="text-xs text-yellow-200/90 leading-relaxed">
                        {t('housingWarningText', { city: getLocalizedCityName(selectedUniversityData.city, locale) })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {selectedUniversityData.type === 'private' && (
                <div className="backdrop-blur-sm bg-purple-950/30 border border-purple-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-purple-200/90 leading-relaxed mb-3">
                        {t('privateUniversityNote')}
                      </p>
                      <input
                        type="number"
                        value={primaryScenario.manualTuitionFee || selectedUniversityData.tuitionFee || ''}
                        onChange={(e) => setPrimaryScenario(prev => ({ ...prev, manualTuitionFee: parseFloat(e.target.value) || undefined }))}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder={`e.g., ${selectedUniversityData.tuitionFee || 10000}`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* University Data Disclaimer */}
          {(primaryScenario.selectedUniversity || primaryScenario.isOtherUniversity) && (
            <div className="backdrop-blur-sm bg-slate-950/50 border border-white/5 rounded-xl p-3">
              <p className="text-xs text-slate-400 italic leading-relaxed">
                {t('universityDisclaimer')}
              </p>
            </div>
          )}

          {/* Housing Type Selection */}
          {(primaryScenario.selectedUniversity || primaryScenario.isOtherUniversity) && (
            <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
              <label className="block text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                <Home className="w-4 h-4" />
                {t('housingType')}
              </label>
              
              <div className="space-y-3">
                {/* Dorm Option */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="housingType"
                    value="dorm"
                    checked={primaryScenario.housingType === 'dorm'}
                    onChange={(e) => setPrimaryScenario(prev => ({ ...prev, housingType: e.target.value as HousingType, rentOverride: undefined }))}
                    className="w-4 h-4 mt-0.5 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white/80 text-sm">{t('housingTypeDorm')}</span>
                      <div className="relative group/info">
                        <Info 
                          className="w-3.5 h-3.5 text-blue-400 cursor-pointer"
                          onClick={() => setShowHousingDormInfo(!showHousingDormInfo)}
                        />
                        {showHousingDormInfo && (
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-900/95 border border-white/20 rounded-lg shadow-xl z-50 backdrop-blur-md">
                            <p className="text-white/80 text-xs leading-relaxed">
                              {t('housingTypeDormInfo')}
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowHousingDormInfo(false)}
                              className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                              {t('close')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {primaryScenario.housingType === 'dorm' && (
                      <p className="text-white/50 text-xs mt-1">
                        Estimated: {formatCurrency((selectedUniversityData?.avgRent || STUDY_DATA.CITIES[primaryScenario.targetCity] || DEFAULT_AVG_RENT_FALLBACK) * HOUSING_MULTIPLIER_DORM)}/month
                      </p>
                    )}
                  </div>
                </label>

                {/* WG Option */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="housingType"
                    value="wg"
                    checked={primaryScenario.housingType === 'wg'}
                    onChange={(e) => setPrimaryScenario(prev => ({ ...prev, housingType: e.target.value as HousingType, rentOverride: undefined }))}
                    className="w-4 h-4 mt-0.5 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white/80 text-sm">{t('housingTypeWG')}</span>
                      <div className="relative group/info">
                        <Info 
                          className="w-3.5 h-3.5 text-blue-400 cursor-pointer"
                          onClick={() => setShowHousingWGInfo(!showHousingWGInfo)}
                        />
                        {showHousingWGInfo && (
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-900/95 border border-white/20 rounded-lg shadow-xl z-50 backdrop-blur-md">
                            <p className="text-white/80 text-xs leading-relaxed">
                              {t('housingTypeWGInfo')}
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowHousingWGInfo(false)}
                              className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                              {t('close')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {primaryScenario.housingType === 'wg' && (
                      <p className="text-white/50 text-xs mt-1">
                        Estimated: {formatCurrency(selectedUniversityData?.avgRent || STUDY_DATA.CITIES[primaryScenario.targetCity] || DEFAULT_AVG_RENT_FALLBACK)}/month
                      </p>
                    )}
                  </div>
                </label>

                {/* Private Option */}
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="housingType"
                    value="private"
                    checked={primaryScenario.housingType === 'private'}
                    onChange={(e) => setPrimaryScenario(prev => ({ ...prev, housingType: e.target.value as HousingType, rentOverride: undefined }))}
                    className="w-4 h-4 mt-0.5 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white/80 text-sm">{t('housingTypePrivate')}</span>
                      <div className="relative group/info">
                        <Info 
                          className="w-3.5 h-3.5 text-blue-400 cursor-pointer"
                          onClick={() => setShowHousingPrivateInfo(!showHousingPrivateInfo)}
                        />
                        {showHousingPrivateInfo && (
                          <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-900/95 border border-white/20 rounded-lg shadow-xl z-50 backdrop-blur-md">
                            <p className="text-white/80 text-xs leading-relaxed">
                              {t('housingTypePrivateInfo')}
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowHousingPrivateInfo(false)}
                              className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                            >
                              {t('close')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {primaryScenario.housingType === 'private' && (
                      <p className="text-white/50 text-xs mt-1">
                        Estimated: {formatCurrency((selectedUniversityData?.avgRent || STUDY_DATA.CITIES[primaryScenario.targetCity] || DEFAULT_AVG_RENT_FALLBACK) * HOUSING_MULTIPLIER_PRIVATE)}/month
                      </p>
                    )}
                  </div>
                </label>
              </div>

              {/* Rent Override Input */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <label className="block text-xs text-white/60 mb-2">{t('housingRentOverride')}</label>
                <input
                  type="number"
                  data-testid="calculator-rent-override"
                  value={primaryScenario.rentOverride || ''}
                  onChange={(e) => setPrimaryScenario(prev => ({ ...prev, rentOverride: parseFloat(e.target.value) || undefined }))}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty to use calculated estimate"
                />
                <p className="text-white/40 text-xs mt-1.5">
                  {t('housingRentOverrideNote')}
                </p>
              </div>
            </div>
          )}

          {/* Planned Semester Start Date Input */}
          {(primaryScenario.selectedUniversity || primaryScenario.isOtherUniversity) && (
            <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
              <label className="block text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Planned Semester Start
              </label>
              <input
                type="date"
                value={primaryScenario.plannedSemesterStart}
                onChange={(e) => setPrimaryScenario(prev => ({ ...prev, plannedSemesterStart: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-white/50 text-xs mt-2">
                Select when you plan to start your studies in Germany. The timeline below will adjust automatically.
              </p>
            </div>
          )}

          {/* Rundfunkbeitrag (Broadcasting Fee) */}
          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
            <div className="flex items-start justify-between mb-3">
              <label className="block text-sm font-medium text-white/80 flex items-center gap-2">
                <Radio className="w-4 h-4" />
                {t('rundfunkbeitrag')}
              </label>
              <div className="relative">
                <Info 
                  className="w-4 h-4 text-blue-400 cursor-pointer"
                  onClick={() => setShowRundfunkbeitragInfo(!showRundfunkbeitragInfo)}
                />
                {showRundfunkbeitragInfo && (
                  <div className="absolute right-0 bottom-full mb-2 w-72 p-3 bg-slate-900/95 border border-white/20 rounded-lg shadow-xl z-50 backdrop-blur-md">
                    <p className="text-white/80 text-xs leading-relaxed">
                      {t('rundfunkbeitragInfo')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowRundfunkbeitragInfo(false)}
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">
                  {formatCurrency(monthlyRundfunkbeitrag * conversionRate, selectedCurrency)}/month
                </span>
                <span className="text-white/50 text-xs">
                  {t('rundfunkbeitragMonthly')}
                </span>
              </div>
              <div className="text-white/50 text-xs mb-2">
                {t('rundfunkbeitragQuarterly')}
              </div>
              
              <div>
                <label className="block text-xs text-white/60 mb-2">
                  {t('rundfunkbeitragPeople')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={primaryScenario.rundfunkbeitragPeople}
                  onChange={(e) => {
                    const value = Math.max(1, parseInt(e.target.value) || 1);
                    setPrimaryScenario(prev => ({ ...prev, rundfunkbeitragPeople: value }));
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Language Course Option */}
          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
            <div className="flex items-start justify-between mb-3">
              <label className="block text-sm font-medium text-white/80 flex items-center gap-2">
                <Book className="w-4 h-4" />
                {t('languageCourse')}
              </label>
            </div>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={primaryScenario.needsLanguageCourse}
                  onChange={(e) => setPrimaryScenario(prev => ({ 
                    ...prev, 
                    needsLanguageCourse: e.target.checked,
                    languageCourseDuration: e.target.checked ? 6 : 0 // Default to 6 months if enabled
                  }))}
                  className="w-4 h-4 text-blue-600 bg-black/40 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-white/80 text-sm">
                  {t('languageCourseQuestion')}
                </span>
              </label>
              
              {primaryScenario.needsLanguageCourse && (
                <div>
                  <label className="block text-xs text-white/60 mb-2">
                    {t('courseDuration')}
                  </label>
                  <select
                    value={primaryScenario.languageCourseDuration}
                    onChange={(e) => setPrimaryScenario(prev => ({ 
                      ...prev, 
                      languageCourseDuration: parseInt(e.target.value) as 3 | 6 | 12 | 0
                    }))}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={0}>{t('courseDuration')}</option>
                    <option value={3}>{t('courseDuration3')}</option>
                    <option value={6}>{t('courseDuration6')}</option>
                    <option value={12}>{t('courseDuration12')}</option>
                  </select>
                  {primaryScenario.languageCourseDuration > 0 && (
                    <p className="text-white/50 text-xs mt-2">
                      {t('languageCourseCostNote')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Health Insurance Type Radio */}
          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
            <div className="flex items-start justify-between mb-3">
              <label className="block text-sm font-medium text-white/80 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t('healthInsuranceType')}
              </label>
              <button
                type="button"
                className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 transition-colors"
                onClick={() => setShowInsuranceInfo(!showInsuranceInfo)}
              >
                <Info className="w-3 h-3" />
                {t('learnMore')}
              </button>
            </div>
            
            {/* Info Block */}
            {showInsuranceInfo && (
              <div className="mb-3 p-3 bg-blue-950/30 border border-blue-500/20 rounded-lg">
              <p className="text-white/80 text-xs mb-2">
                <strong className="text-white">{t('publicInsuranceLabel')}:</strong> {t('publicInsuranceDescription', { amount: formatCurrency(STUDY_DATA.FIXED_COSTS.healthInsurancePublic) })}
              </p>
              <p className="text-white/80 text-xs">
                <strong className="text-white">{t('privateInsuranceLabel')}:</strong> {t('privateInsuranceDescription', { amount: formatCurrency(STUDY_DATA.FIXED_COSTS.healthInsurancePrivate) })}
              </p>
              </div>
            )}

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="insurance"
                      value="public"
                      checked={primaryScenario.insuranceType === 'public'}
                      onChange={(e) => setPrimaryScenario(prev => ({ ...prev, insuranceType: e.target.value as InsuranceType }))}
                  className="w-4 h-4 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-white/80">{t('publicInsuranceLabel')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="insurance"
                      value="private"
                      checked={primaryScenario.insuranceType === 'private'}
                      onChange={(e) => setPrimaryScenario(prev => ({ ...prev, insuranceType: e.target.value as InsuranceType }))}
                  className="w-4 h-4 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-white/80">{t('privateInsuranceLabel')}</span>
              </label>
            </div>
            <p className="text-white/50 text-xs mt-2">
              {t('averageMonthlyPrice')}: {formatCurrency(primaryCalculated.monthlyInsurance)}
            </p>
          </div>
        </div>

        {/* Result Dashboard */}
        <div className="lg:col-span-1 relative z-[10] min-w-0">
          <div 
            id="pdf-content"
            ref={resultCardRef}
            className="backdrop-blur-sm bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/20 rounded-xl p-4 sm:p-6 sticky top-6 relative z-[10]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Euro className="w-5 h-5" />
                {t('costBreakdown')}
              </h2>
              <button
                onClick={handleExportPDF}
                disabled={!primaryScenario.selectedUniversity && !primaryScenario.isOtherUniversity || isExportingPDF}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                aria-label={t('downloadReport')}
                title={(primaryScenario.selectedUniversity || primaryScenario.isOtherUniversity) ? t('downloadReport') : t('selectUniversityFirst')}
              >
                {isExportingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">{t('generating')}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('downloadReport')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Currency Selector */}
            <div className="mb-6">
              <label className="block text-xs text-white/60 mb-2">{t('displayCurrency')}</label>
              <CurrencySelector value={selectedCurrency} onChange={setSelectedCurrency} />
              {isLoadingRates && (
                <div className="mt-2 animate-pulse">
                  <div className="h-3 w-44 rounded bg-slate-700/70" />
                </div>
              )}
              {!isLoadingRates && !apiError && exchangeRates && (
                <p className="mt-2 text-white/40 text-xs">
                  {t('liveRatesProvidedBy')}{' '}
                  <a
                    href={FRANKFURTER_APP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
                  >
                    {t('frankfurterAPI')}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              )}
              {apiError && (
                <p className="mt-2 text-yellow-400/70 text-xs">
                  {t('usingDefaultRates')}
                </p>
              )}
            </div>

            {/* Upfront Costs Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide mb-3">
                {t('upfrontCostsOneTime')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center group relative">
                  <span className="text-white/70 text-sm flex items-center gap-1">
                    <Plane className="w-3 h-3" />
                    {t('visaFee')}
                    {primaryScenario.originCountry && visaFeeBreakdown && (
                      <div className="relative">
                        <Info 
                          className="w-3 h-3 text-blue-400 cursor-help ml-1" 
                          onMouseEnter={() => {
                            setShowVisaInfo(true);
                            setOpenVisaInfo(true);
                          }}
                          onMouseLeave={() => {
                            setShowVisaInfo(false);
                            if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                              setOpenVisaInfo(false);
                            }
                          }}
                          onClick={() => {
                            setOpenVisaInfo(!openVisaInfo);
                            setShowVisaInfo(!openVisaInfo);
                          }}
                        />
                        {(showVisaInfo || openVisaInfo) && (
                          <div 
                            className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-900/95 border border-white/20 rounded-lg shadow-xl z-50 backdrop-blur-md"
                            onMouseEnter={() => {
                              setShowVisaInfo(true);
                              setOpenVisaInfo(true);
                            }}
                            onMouseLeave={() => {
                              setShowVisaInfo(false);
                              if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                                setOpenVisaInfo(false);
                              }
                            }}
                          >
                            <p className="text-white text-xs mb-1 font-semibold">{t('breakdown')}</p>
                            <p className="text-white/80 text-xs mb-2">{visaFeeBreakdown}</p>
                            {visaFeeNote === 'service_fee' && (
                              <p className="text-blue-300/80 text-xs italic">
                                {t('visaNoteService')}
                              </p>
                            )}
                            {visaFeeNote === 'residence_permit' && (
                              <p className="text-blue-300/80 text-xs italic">
                                {t('visaNoteFree')}
                              </p>
                            )}
                            <button
                              type="button"
                              className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline"
                              onClick={() => {
                                setShowVisaInfo(false);
                                setOpenVisaInfo(false);
                              }}
                            >
                              {t('close')}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </span>
                  <span className="text-white font-semibold">
                    {primaryScenario.originCountry ? formatCurrency(visaFee * conversionRate, selectedCurrency) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {t('blockedAccount')}
                  </span>
                  <span className="text-white font-semibold">
                    {formatCurrency(blockedAccountTotal * conversionRate, selectedCurrency)}
                  </span>
                </div>
                {primaryScenario.needsLanguageCourse && primaryScenario.languageCourseDuration > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm flex items-center gap-1">
                      <Book className="w-3 h-3" />
                      {t('languageCourseCost')}
                    </span>
                    <span className="text-white font-semibold">
                      {formatCurrency(languageCourseCost * conversionRate, selectedCurrency)}
                    </span>
                  </div>
                )}
                <div className="border-t border-white/20 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">{t('upfrontTotal')}</span>
                    <span className="text-white font-bold text-lg">
                      {primaryScenario.originCountry ? formatCurrency(convertedUpfrontTotal, selectedCurrency) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* One-time Arrival Costs Section */}
            {(primaryScenario.selectedUniversity || primaryScenario.isOtherUniversity) && monthlyRent > 0 && (
              <div className="mb-6 backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 sm:p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  {t('arrivalCostsTitle')}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <span className="text-white/70 text-sm flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {t('securityDeposit')}
                      </span>
                      <p className="text-white/50 text-xs mt-0.5">
                        {t('securityDepositNote')}
                      </p>
                    </div>
                    <span className="text-white font-semibold ml-4">
                      {formatCurrency(securityDeposit * conversionRate, selectedCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <span className="text-white/70 text-sm flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {t('initialHouseholdSetup')}
                        <span className="text-white/50 text-xs ml-1">({t('estimatedAverage')})</span>
                      </span>
                      <p className="text-white/50 text-xs mt-0.5">
                        {t('initialHouseholdSetupAmount')}
                      </p>
                    </div>
                    <span className="text-white font-semibold ml-4">
                      {formatCurrency(initialHouseholdSetup * conversionRate, selectedCurrency)}
                    </span>
                  </div>
                  <div className="border-t border-white/20 pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold">{t('arrivalCostsTotal')}</span>
                      <span className="text-white font-bold text-lg">
                        {formatCurrency(arrivalCostsTotal * conversionRate, selectedCurrency)}
                      </span>
                    </div>
                    <p className="text-white/50 text-xs mt-1.5">
                      {t('arrivalCostsNote')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Language Course Affiliate CTA */}
            {primaryScenario.needsLanguageCourse && primaryScenario.languageCourseDuration > 0 && (
              <div className="mb-6 backdrop-blur-sm bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-4 sm:p-6">
                <div className="flex items-start gap-3">
                  <Book className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">
                      {t('findLanguageCourses')}
                    </h3>
                    <p className="text-white/70 text-sm mb-4">
                      Compare certified language schools, intensive courses, and find the best option for your German language preparation.
                    </p>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        // Placeholder for future affiliate link
                        if (typeof window !== 'undefined') {
                          window.alert(t('affiliatePlaceholder'));
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Search className="w-4 h-4" />
                      {t('searchCourses')}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Blocked Account Info Section - Only show if Non-EU (requires visa) */}
            {primaryScenario.originCountry && visaFee > 0 && (
              <div className="mb-6 backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">{t('blockedAccountTitle')}</h3>
                </div>
                
                <div className="mb-4 space-y-2">
                  <p className="text-white/80 text-sm">
                    {t('blockedAccountDescription')}
                  </p>
                  <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/80 text-sm">{t('requiredAmountPerMonth')}</span>
                      <span className="text-white font-bold">
                        {formatCurrency(STUDY_DATA.FIXED_COSTS.blockedAccountMonthly * conversionRate, selectedCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80 text-sm">{t('requiredAmountPerYear')}</span>
                      <span className="text-white font-bold">
                        {formatCurrency(STUDY_DATA.FIXED_COSTS.blockedAccountYearly * conversionRate, selectedCurrency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Provider Comparison Table */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-white/90 mb-3">{t('compareProviders')}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-3 text-white/70 font-medium">{t('providerColumn')}</th>
                          <th className="text-right py-2 px-3 text-white/70 font-medium">{t('setupFeeColumn')}</th>
                          <th className="text-right py-2 px-3 text-white/70 font-medium">{t('monthlyFeeColumn')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {STUDY_DATA.BLOCKED_ACCOUNT_PROVIDERS.map((provider, index) => (
                          <tr key={provider.name} className={index < STUDY_DATA.BLOCKED_ACCOUNT_PROVIDERS.length - 1 ? 'border-b border-white/5' : ''}>
                            <td className="py-2 px-3 text-white/90 font-medium">{provider.name}</td>
                            <td className="py-2 px-3 text-right text-white/80">
                              {formatCurrency(provider.setupFee * conversionRate, selectedCurrency)}
                            </td>
                            <td className="py-2 px-3 text-right text-white/80">
                              {formatCurrency(provider.monthlyFee * conversionRate, selectedCurrency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-white/50 text-xs mt-2">
                    Fees may vary. Please check provider websites for current rates.
                  </p>
                </div>

                {/* CTA Button */}
                <a
                  href={`/${locale}/blog/blocked-account-guide`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors w-full justify-center"
                >
                  <span>{t('learnHowToOpenBlockedAccount')}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Monthly Costs Section */}
            <div className="border-t border-white/20 pt-6">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide mb-3">
                {t('monthlyCosts')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    Average Rent
                  </span>
                  <span className="text-white font-semibold">
                    {(primaryScenario.selectedUniversity || primaryScenario.isOtherUniversity) ? formatCurrency(monthlyRent * conversionRate, selectedCurrency) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Average Health Insurance
                  </span>
                  <span className="text-white font-semibold">
                    {formatCurrency(monthlyInsurance * conversionRate, selectedCurrency)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm flex items-center gap-1">
                    <Radio className="w-3 h-3" />
                    {t('rundfunkbeitrag')}
                    {primaryScenario.rundfunkbeitragPeople > 1 && (
                      <span className="text-white/50 text-xs ml-1">({primaryScenario.rundfunkbeitragPeople} {t('people')})</span>
                    )}
                  </span>
                  <span className="text-white font-semibold">
                    {formatCurrency(monthlyRundfunkbeitrag * conversionRate, selectedCurrency)}
                  </span>
                </div>
                {selectedUniversityData && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {t('averageSemesterFeeProRata')}
                    </span>
                    <span className="text-white font-semibold">
                      {formatCurrency(semesterFeeMonthly * conversionRate, selectedCurrency)}
                    </span>
                  </div>
                )}
                {primaryCalculated.privateTuitionFeeMonthly > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      {t('privateUniversityTuitionProRata')}
                    </span>
                    <span className="text-white font-semibold">
                      {formatCurrency(primaryCalculated.privateTuitionFeeMonthly * conversionRate, selectedCurrency)}
                    </span>
                  </div>
                )}
                {nonEUTuitionFeeMonthly > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        {t('nonEUTuitionFeeProRata')}
                      </span>
                      <span className="text-white font-semibold">
                        {formatCurrency(nonEUTuitionFeeMonthly * conversionRate, selectedCurrency)}
                      </span>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-950/30 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-200/90 text-xs flex items-start gap-2">
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong className="text-yellow-200">{t('note')}</strong>{' '}
                          {t('nonEuTuitionNote', {
                            amount: formatCurrency(
                              selectedUniversityData?.nonEUTuitionFee || DEFAULT_NON_EU_TUITION_FALLBACK
                            ),
                          })}
                        </span>
                      </p>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>{t('estimatedLivingExpenses')}</span>
                  </span>
                  <span className="text-slate-400 text-xs font-medium">
                    {formatCurrency(monthlyLivingExpenses * conversionRate, selectedCurrency)}
                  </span>
                </div>
                <p className="mt-4 text-xs text-slate-400 italic">
                  {t('rentSemesterDataNote')}
                </p>
                <div className="border-t border-white/20 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-lg">{t('monthlyTotal')}</span>
                    <span data-testid="calculator-monthly-total" className="text-white font-bold text-2xl">
                      {(primaryScenario.selectedUniversity || primaryScenario.isOtherUniversity) ? formatCurrency(convertedMonthlyTotal, selectedCurrency) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Annual Total */}
            {(primaryScenario.selectedUniversity || primaryScenario.isOtherUniversity) && (
              <div className="border-t border-white/20 pt-6 mt-6">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-white/70 text-sm mb-2">{t('annualCost')}</div>
                  <div className="text-3xl font-bold text-white">
                    {formatCurrency(convertedAnnualTotal, selectedCurrency)}
                  </div>
                  <p className="text-white/60 text-xs mt-2">
                    Plus upfront costs: {formatCurrency(convertedUpfrontTotal, selectedCurrency)}
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <div className="text-white/70 text-xs mb-1">{t('totalFirstYear')}</div>
                    <div className="text-xl font-bold text-white">
                      {formatCurrency(convertedFirstYearTotal, selectedCurrency)}
                    </div>
                  </div>
                  <p className="mt-4 text-[10px] text-slate-500 italic leading-tight">
                    * Schätzwerte für 2026. Die tatsächlichen Kosten für Miete und Semesterbeiträge 
                    können je nach individuellem Standort und Verbrauch variieren. Stand: Januar 2026.
                  </p>
                </div>
              </div>
            )}

            {/* Legal Disclaimer - Comprehensive */}
            <div className="mt-6 pt-4 border-t border-white/20">
              <div className="backdrop-blur-sm bg-slate-950/60 border border-white/10 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-xs font-semibold text-white/90 mb-2">
                      {t('legalDisclaimerTitle')}
                    </h3>
                    <p className="text-xs text-white/70 leading-relaxed">
                      {t('legalDisclaimer')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      ) : null}

      {/* Your Financial Balance Card - Separate card below */}
      {!isComparisonMode && primaryScenario.targetCity && (
        <div className="mt-6 backdrop-blur-sm bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5" />
            {t('yourFinancialBalance')}
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/80 text-sm">{t('totalMonthlyCosts')}</span>
              <span className="text-white font-semibold text-lg">
                {formatCurrency(convertedMonthlyTotal, selectedCurrency)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/80 text-sm">{t('netJobIncome')}</span>
              <span className="text-white font-semibold text-lg">
                {formatCurrency(convertedNetMonthlyIncome, selectedCurrency)}
              </span>
            </div>

            <div className="pt-4 border-t-2 border-white/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/90 text-base font-medium">{t('remainingAmountToCover')}</span>
                <span className={`font-bold text-2xl ${
                  convertedRemainingBudget <= 0
                    ? 'text-green-400'
                    : convertedRemainingBudget <= 200
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {formatCurrency(convertedRemainingBudget, selectedCurrency)}
                </span>
              </div>
              <p className={`text-xs mt-2 ${
                convertedRemainingBudget <= 0
                  ? 'text-green-300/80'
                  : convertedRemainingBudget <= 200
                  ? 'text-yellow-300/80'
                  : 'text-red-300/80'
              }`}>
                {convertedRemainingBudget <= 0
                  ? t('jobIncomeCoversExpenses')
                  : convertedRemainingBudget <= 200
                  ? t('smallGap')
                  : t('significantGap')}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Financial Planning Section - Separate from cost breakdown */}
      {!isComparisonMode && primaryScenario.targetCity && (
        <div className="mt-8 backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            {t('financialPlanning')}
          </h2>

          {/* Job Type Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-3">{t('jobType')}</label>
            <div className="flex gap-2 bg-slate-900/50 border border-white/10 rounded-lg p-1">
              <button
                type="button"
                onClick={() => {
                  setPrimaryScenario(prev => ({ 
                    ...prev, 
                    jobType: 'minijob',
                    hoursPerWeek: prev.hoursPerWeek || 0,
                  }));
                }}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 relative ${
                  primaryScenario.jobType === 'minijob'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  {t('minijob')}
                  <div className="relative group">
                    <Info 
                      className="w-3.5 h-3.5 text-blue-300 cursor-help" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMinijobInfo(!showMinijobInfo);
                      }}
                    />
                    {showMinijobInfo && (
                      <div 
                        className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-slate-900/95 border border-white/20 rounded-lg shadow-xl z-50 backdrop-blur-md"
                      >
                        <p className="text-white text-xs leading-relaxed">
                          {t('minijobInfo')}
                        </p>
                      </div>
                    )}
                  </div>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPrimaryScenario(prev => ({ 
                    ...prev, 
                    jobType: 'working_student',
                    hoursPerWeek: prev.hoursPerWeek || 10,
                  }));
                }}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 relative ${
                  primaryScenario.jobType === 'working_student'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  {t('workingStudent')}
                  <div className="relative group">
                    <Info 
                      className="w-3.5 h-3.5 text-blue-300 cursor-help" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowWerkstudentInfo(!showWerkstudentInfo);
                      }}
                    />
                    {showWerkstudentInfo && (
                      <div 
                        className="absolute right-0 bottom-full mb-2 w-72 p-3 bg-slate-900/95 border border-white/20 rounded-lg shadow-xl z-50 backdrop-blur-md"
                      >
                        <p className="text-white text-xs leading-relaxed">
                          {t('werkstudentInfo')}
                        </p>
                      </div>
                    )}
                  </div>
                </span>
              </button>
            </div>
          </div>

          {/* 140-Day Rule Info Note */}
          <div className="mb-6 backdrop-blur-sm bg-blue-950/30 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-blue-200/90 leading-relaxed">
                  <strong className="text-blue-200">{t('dayRule140Title')}</strong> {t('dayRule140')}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Hours per Week Input */}
            <div>
              <label className="block text-xs text-white/70 mb-2">
                {t('hoursPerWeek')} {primaryScenario.jobType === 'working_student' ? t('hoursPerWeekMaxStudents') : t('hoursPerWeekCapped')}
              </label>
              <input
                type="number"
                min="0"
                max={primaryScenario.jobType === 'working_student' ? 20 : undefined}
                value={primaryScenario.hoursPerWeek}
                onChange={(e) => {
                  const maxValue = primaryScenario.jobType === 'working_student' ? 20 : Infinity;
                  const value = Math.min(maxValue, Math.max(0, parseFloat(e.target.value) || 0));
                  setPrimaryScenario(prev => ({ ...prev, hoursPerWeek: value }));
                }}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {primaryScenario.jobType === 'working_student' && (
                <>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={primaryScenario.hoursPerWeek}
                    onChange={(e) => setPrimaryScenario(prev => ({ ...prev, hoursPerWeek: parseFloat(e.target.value) }))}
                    className="w-full mt-2 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>{t('hours0')}</span>
                    <span>{t('hours20')}</span>
                  </div>
                  {primaryScenario.hoursPerWeek > 20 && (
                    <p className="text-xs text-yellow-400/90 mt-2 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{t('hoursWarning')}</span>
                    </p>
                  )}
                </>
              )}
              {primaryScenario.jobType === 'minijob' && (
                <p className="text-xs text-white/50 mt-1">
                  {t('minijobEarningsCapped')}
                </p>
              )}
            </div>

            {/* Hourly Wage Input */}
            <div>
              <label className="block text-xs text-white/70 mb-2">
                {t('hourlyWage')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={primaryScenario.hourlyWage}
                onChange={(e) => {
                  const value = Math.max(0, parseFloat(e.target.value) || 0);
                  setPrimaryScenario(prev => ({ ...prev, hourlyWage: value }));
                }}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-white/50 mt-1">
                {t('currentGermanMinimumWage')}
              </p>
            </div>

            {/* Income Breakdown */}
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">{t('grossMonthlyIncome')}</span>
                <span className="text-white font-semibold">
                  {formatCurrency(convertedGrossMonthlyIncome, selectedCurrency)}
                </span>
              </div>
              {primaryScenario.jobType === 'working_student' && primaryCalculated.grossMonthlyIncome > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50">
                    {t('lessSocialSecurity')}
                  </span>
                  <span className="text-white/50">
                    -{formatCurrency((primaryCalculated.grossMonthlyIncome * 0.10) * conversionRate, selectedCurrency)}
                  </span>
                </div>
              )}
              {primaryScenario.jobType === 'minijob' && primaryCalculated.grossMonthlyIncome >= 538 && (
                <div className="flex justify-between items-center text-xs text-yellow-400/80">
                  <span>{t('cappedAtMinijobLimit')}</span>
                  <span>—</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm font-medium">{t('netMonthlyIncome')}</span>
                  <span className="text-white font-bold">
                    {formatCurrency(convertedNetMonthlyIncome, selectedCurrency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Legal Warning Box - Self-Employment */}
            <div className="mt-6 backdrop-blur-sm bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-yellow-200/90 leading-relaxed font-medium">
                    {t('selfEmploymentWarning')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isComparisonMode ? (
        // Comparison mode: Side-by-side view
        <div ref={comparisonContainerRef} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
          {/* Primary Scenario Column */}
          <div className="space-y-4 relative z-[100]">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {t('scenarioA')}: {primaryScenario.targetCity ? getLocalizedCityName(primaryScenario.targetCity, locale) : t('selectCity')}
            </h3>
            <div className="space-y-4">
              <SearchableCombobox
                options={COUNTRY_OPTIONS}
                value={primaryScenario.originCountry}
                onChange={(value) => setPrimaryScenario(prev => ({ ...prev, originCountry: value }))}
                placeholder={t('originCountryPlaceholder')}
                icon={<Plane className="w-4 h-4" />}
                label={t('originCountryLabel')}
                cardZIndex={150}
              />
              {/* City Selection for Primary Scenario - Must be selected first */}
              <SearchableCombobox
                options={CITY_OPTIONS}
                value={primaryScenario.targetCity}
                onChange={(value) => {
                  setPrimaryScenario(prev => ({
                    ...prev,
                    targetCity: value as City,
                    selectedUniversity: '', // Clear university when city changes
                    isOtherUniversity: false,
                    manualRent: undefined,
                    manualSemesterFee: undefined,
                    manualTuitionFee: undefined,
                  }));
                }}
                placeholder={t('targetCityPlaceholder')}
                icon={<MapPin className="w-4 h-4" />}
                label={t('targetCityLabel')}
                cardZIndex={145}
              />
              {/* University Search for Primary Scenario */}
              <UniversitySearchComponent
                universities={filteredUniversities}
                value={primaryScenario.selectedUniversity}
                isOther={primaryScenario.isOtherUniversity}
                disabled={!primaryScenario.targetCity}
                onSelect={(universityName) => {
                  if (universityName === 'OTHER_NOT_LISTED') {
                    setPrimaryScenario(prev => ({
                      ...prev,
                      selectedUniversity: '',
                      isOtherUniversity: true,
                    }));
                  } else {
                    const university = STUDY_DATA.UNIVERSITIES.find(u => u.name === universityName);
                    if (university) {
                      setPrimaryScenario(prev => ({
                        ...prev,
                        selectedUniversity: universityName,
                        isOtherUniversity: false,
                        manualRent: undefined,
                        manualSemesterFee: undefined,
                        manualTuitionFee: undefined,
                      }));
                    }
                  }
                }}
                cardZIndex={140}
              />

              {/* Housing Type Selection for Primary Scenario */}
              {(primaryScenario.selectedUniversity || primaryScenario.isOtherUniversity) && (
                <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
                  <label className="block text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    {t('housingType')}
                  </label>
                  
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="housingTypePrimary"
                        value="dorm"
                        checked={primaryScenario.housingType === 'dorm'}
                        onChange={(e) => setPrimaryScenario(prev => ({ ...prev, housingType: e.target.value as HousingType, rentOverride: undefined }))}
                        className="w-4 h-4 mt-0.5 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-white/80 text-sm">{t('housingTypeDorm')}</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="housingTypePrimary"
                        value="wg"
                        checked={primaryScenario.housingType === 'wg'}
                        onChange={(e) => setPrimaryScenario(prev => ({ ...prev, housingType: e.target.value as HousingType, rentOverride: undefined }))}
                        className="w-4 h-4 mt-0.5 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-white/80 text-sm">{t('housingTypeWG')}</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="housingTypePrimary"
                        value="private"
                        checked={primaryScenario.housingType === 'private'}
                        onChange={(e) => setPrimaryScenario(prev => ({ ...prev, housingType: e.target.value as HousingType, rentOverride: undefined }))}
                        className="w-4 h-4 mt-0.5 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-white/80 text-sm">{t('housingTypePrivate')}</span>
                    </label>
                  </div>

                  {/* Rent Override Input for Primary Scenario */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <label className="block text-xs text-white/60 mb-2">{t('housingRentOverride')}</label>
                    <input
                      type="number"
                      value={primaryScenario.rentOverride || ''}
                      onChange={(e) => setPrimaryScenario(prev => ({ ...prev, rentOverride: parseFloat(e.target.value) || undefined }))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={t('housingRentOverridePlaceholder')}
                    />
                  </div>
                </div>
              )}

              {/* Language Course Option for Primary Scenario */}
              <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
                <div className="flex items-start justify-between mb-3">
                  <label className="block text-sm font-medium text-white/80 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    {t('languageCourse')}
                  </label>
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={primaryScenario.needsLanguageCourse}
                      onChange={(e) => setPrimaryScenario(prev => ({ 
                        ...prev, 
                        needsLanguageCourse: e.target.checked,
                        languageCourseDuration: e.target.checked ? 6 : 0
                      }))}
                      className="w-4 h-4 text-blue-600 bg-black/40 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-white/80 text-sm">
                      {t('languageCourseQuestion')}
                    </span>
                  </label>
                  
                  {primaryScenario.needsLanguageCourse && (
                    <div>
                      <label className="block text-xs text-white/60 mb-2">
                        {t('courseDuration')}
                      </label>
                      <select
                        value={primaryScenario.languageCourseDuration}
                        onChange={(e) => setPrimaryScenario(prev => ({ 
                          ...prev, 
                          languageCourseDuration: parseInt(e.target.value) as 3 | 6 | 12 | 0
                        }))}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={0}>{t('courseDuration')}</option>
                        <option value={3}>{t('courseDuration3')}</option>
                        <option value={6}>{t('courseDuration6')}</option>
                        <option value={12}>{t('courseDuration12')}</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Rundfunkbeitrag for Primary Scenario */}
              <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
                <div className="flex items-start justify-between mb-3">
                  <label className="block text-sm font-medium text-white/80 flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    {t('rundfunkbeitrag')}
                  </label>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">
                      {formatCurrency((STUDY_DATA.RUNDFUNKBEITRAG.quarterly / 3 / Math.max(1, primaryScenario.rundfunkbeitragPeople)) * conversionRate, selectedCurrency)}/month
                    </span>
                    <span className="text-white/50 text-xs">
                      {t('rundfunkbeitragMonthly')}
                    </span>
                  </div>
                  <div className="text-white/50 text-xs mb-2">
                    {t('rundfunkbeitragQuarterly')}
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-2">
                      {t('rundfunkbeitragPeople')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={primaryScenario.rundfunkbeitragPeople}
                      onChange={(e) => {
                        const value = Math.max(1, parseInt(e.target.value) || 1);
                        setPrimaryScenario(prev => ({ ...prev, rundfunkbeitragPeople: value }));
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* One-time Arrival Costs Section for Primary Scenario */}
              {(primaryScenario.selectedUniversity || primaryScenario.isOtherUniversity) && primaryCalculated.monthlyRent > 0 && (
                <div className="mb-6 backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 sm:p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    {t('arrivalCostsTitle')}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <span className="text-white/70 text-sm flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          {t('securityDeposit')}
                        </span>
                        <p className="text-white/50 text-xs mt-0.5">
                          {t('securityDepositNote')}
                        </p>
                      </div>
                      <span className="text-white font-semibold ml-4">
                        {formatCurrency(primaryCalculated.securityDeposit * conversionRate, selectedCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <span className="text-white/70 text-sm flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {t('initialHouseholdSetup')}
                          <span className="text-white/50 text-xs ml-1">({t('estimatedAverage')})</span>
                        </span>
                        <p className="text-white/50 text-xs mt-0.5">
                          {t('initialHouseholdSetupAmount')}
                        </p>
                      </div>
                      <span className="text-white font-semibold ml-4">
                        {formatCurrency(primaryCalculated.initialHouseholdSetup * conversionRate, selectedCurrency)}
                      </span>
                    </div>
                    <div className="border-t border-white/20 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-bold">{t('arrivalCostsTotal')}</span>
                        <span className="text-white font-bold text-lg">
                          {formatCurrency(primaryCalculated.arrivalCostsTotal * conversionRate, selectedCurrency)}
                        </span>
                      </div>
                      <p className="text-white/50 text-xs mt-1.5">
                        {t('arrivalCostsNote')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="backdrop-blur-sm bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/20 rounded-xl p-4 sm:p-6 relative">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Euro className="w-5 h-5" />
                {t('costBreakdown')}
              </h4>
              {primaryScenario.targetCity && comparisonScenario.targetCity && monthlyDifference !== null && monthlyDifference !== 0 && (
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${
                  monthlyDifference < 0 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {monthlyDifference < 0 ? '-' : '+'}{formatCurrency(Math.abs(monthlyDifference) * conversionRate, selectedCurrency)}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <div className="text-white/70 text-sm mb-2">{t('monthlyTotal')}</div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(primaryCalculated.monthlyTotal * conversionRate, selectedCurrency)}
                  </div>
                </div>
                <div>
                  <div className="text-white/70 text-sm mb-2">{t('annualTotal')}</div>
                  <div className="text-xl font-bold text-white">
                    {formatCurrency(primaryCalculated.annualTotal * conversionRate, selectedCurrency)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Vertical Divider - Hidden on mobile */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2"></div>

          {/* Comparison Scenario Column */}
          <div className="space-y-4 relative z-[50]">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {t('scenarioB')}: {comparisonScenario.targetCity ? getLocalizedCityName(comparisonScenario.targetCity, locale) : t('selectCity')}
            </h3>
            <div className="space-y-4">
              <SearchableCombobox
                options={COUNTRY_OPTIONS}
                value={comparisonScenario.originCountry}
                onChange={(value) => setComparisonScenario(prev => ({ ...prev, originCountry: value }))}
                placeholder={t('originCountryPlaceholder')}
                icon={<Plane className="w-4 h-4" />}
                label={t('originCountryLabel')}
                cardZIndex={100}
              />
              {/* City Selection for Comparison - Must be selected first */}
              <SearchableCombobox
                options={CITY_OPTIONS}
                value={comparisonScenario.targetCity}
                onChange={(value) => {
                  setComparisonScenario(prev => ({
                    ...prev,
                    targetCity: value as City,
                    selectedUniversity: '', // Clear university when city changes
                    isOtherUniversity: false,
                    manualRent: undefined,
                    manualSemesterFee: undefined,
                    manualTuitionFee: undefined,
                  }));
                }}
                placeholder={t('targetCityPlaceholder')}
                icon={<MapPin className="w-4 h-4" />}
                label={t('targetCityLabel')}
                cardZIndex={95}
              />

              {/* University Search for Comparison */}
              <UniversitySearchComponent
                universities={comparisonFilteredUniversities}
                value={comparisonScenario.selectedUniversity}
                isOther={comparisonScenario.isOtherUniversity}
                disabled={!comparisonScenario.targetCity}
                onSelect={(universityName) => {
                  if (universityName === 'OTHER_NOT_LISTED') {
                    setComparisonScenario(prev => ({
                      ...prev,
                      selectedUniversity: '',
                      isOtherUniversity: true,
                    }));
                  } else {
                    const university = STUDY_DATA.UNIVERSITIES.find(u => u.name === universityName);
                    if (university) {
                      setComparisonScenario(prev => ({
                        ...prev,
                        selectedUniversity: universityName,
                        isOtherUniversity: false,
                        manualRent: undefined,
                        manualSemesterFee: undefined,
                        manualTuitionFee: undefined,
                      }));
                    }
                  }
                }}
                cardZIndex={90}
              />

              {/* Housing Type Selection for Comparison */}
              {(comparisonScenario.selectedUniversity || comparisonScenario.isOtherUniversity) && (
                <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
                  <label className="block text-sm font-medium text-white/80 mb-3 flex items-center gap-2">
                    <Home className="w-4 h-4" />
                    {t('housingType')}
                  </label>
                  
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="housingTypeComparison"
                        value="dorm"
                        checked={comparisonScenario.housingType === 'dorm'}
                        onChange={(e) => setComparisonScenario(prev => ({ ...prev, housingType: e.target.value as HousingType, rentOverride: undefined }))}
                        className="w-4 h-4 mt-0.5 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-white/80 text-sm">{t('housingTypeDorm')}</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="housingTypeComparison"
                        value="wg"
                        checked={comparisonScenario.housingType === 'wg'}
                        onChange={(e) => setComparisonScenario(prev => ({ ...prev, housingType: e.target.value as HousingType, rentOverride: undefined }))}
                        className="w-4 h-4 mt-0.5 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-white/80 text-sm">{t('housingTypeWG')}</span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="housingTypeComparison"
                        value="private"
                        checked={comparisonScenario.housingType === 'private'}
                        onChange={(e) => setComparisonScenario(prev => ({ ...prev, housingType: e.target.value as HousingType, rentOverride: undefined }))}
                        className="w-4 h-4 mt-0.5 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-white/80 text-sm">{t('housingTypePrivate')}</span>
                    </label>
                  </div>

                  {/* Rent Override Input for Comparison */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <label className="block text-xs text-white/60 mb-2">{t('housingRentOverride')}</label>
                    <input
                      type="number"
                      value={comparisonScenario.rentOverride || ''}
                      onChange={(e) => setComparisonScenario(prev => ({ ...prev, rentOverride: parseFloat(e.target.value) || undefined }))}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Leave empty to use calculated estimate"
                    />
                  </div>
                </div>
              )}

              {/* Language Course Option for Comparison */}
              <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
                <div className="flex items-start justify-between mb-3">
                  <label className="block text-sm font-medium text-white/80 flex items-center gap-2">
                    <Book className="w-4 h-4" />
                    {t('languageCourse')}
                  </label>
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={comparisonScenario.needsLanguageCourse}
                      onChange={(e) => setComparisonScenario(prev => ({ 
                        ...prev, 
                        needsLanguageCourse: e.target.checked,
                        languageCourseDuration: e.target.checked ? 6 : 0
                      }))}
                      className="w-4 h-4 text-blue-600 bg-black/40 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="text-white/80 text-sm">
                      {t('languageCourseQuestion')}
                    </span>
                  </label>
                  
                  {comparisonScenario.needsLanguageCourse && (
                    <div>
                      <label className="block text-xs text-white/60 mb-2">
                        {t('courseDuration')}
                      </label>
                      <select
                        value={comparisonScenario.languageCourseDuration}
                        onChange={(e) => setComparisonScenario(prev => ({ 
                          ...prev, 
                          languageCourseDuration: parseInt(e.target.value) as 3 | 6 | 12 | 0
                        }))}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={0}>{t('courseDuration')}</option>
                        <option value={3}>{t('courseDuration3')}</option>
                        <option value={6}>{t('courseDuration6')}</option>
                        <option value={12}>{t('courseDuration12')}</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Rundfunkbeitrag for Comparison */}
              <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
                <div className="flex items-start justify-between mb-3">
                  <label className="block text-sm font-medium text-white/80 flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    {t('rundfunkbeitrag')}
                  </label>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/70 text-sm">
                      {formatCurrency((STUDY_DATA.RUNDFUNKBEITRAG.quarterly / 3 / Math.max(1, comparisonScenario.rundfunkbeitragPeople)) * conversionRate, selectedCurrency)}/month
                    </span>
                    <span className="text-white/50 text-xs">
                      {t('rundfunkbeitragMonthly')}
                    </span>
                  </div>
                  <div className="text-white/50 text-xs mb-2">
                    {t('rundfunkbeitragQuarterly')}
                  </div>
                  
                  <div>
                    <label className="block text-xs text-white/60 mb-2">
                      {t('rundfunkbeitragPeople')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={comparisonScenario.rundfunkbeitragPeople}
                      onChange={(e) => {
                        const value = Math.max(1, parseInt(e.target.value) || 1);
                        setComparisonScenario(prev => ({ ...prev, rundfunkbeitragPeople: value }));
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Accommodation Warning for Comparison City */}
              {comparisonScenario.targetCity && highDemandCities.includes(comparisonScenario.targetCity) && (
                <div className="backdrop-blur-sm bg-yellow-950/30 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-200 mb-1">{t('housingWarning')}</h4>
                      <p className="text-xs text-yellow-200/90 leading-relaxed">
                        {t('housingWarningText', { city: getLocalizedCityName(comparisonScenario.targetCity, locale) })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* One-time Arrival Costs Section for Comparison */}
              {(comparisonScenario.selectedUniversity || comparisonScenario.isOtherUniversity) && comparisonCalculated.monthlyRent > 0 && (
                <div className="mb-6 backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 sm:p-6">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    {t('arrivalCostsTitle')}
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <span className="text-white/70 text-sm flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          {t('securityDeposit')}
                        </span>
                        <p className="text-white/50 text-xs mt-0.5">
                          {t('securityDepositNote')}
                        </p>
                      </div>
                      <span className="text-white font-semibold ml-4">
                        {formatCurrency(comparisonCalculated.securityDeposit * conversionRate, selectedCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <span className="text-white/70 text-sm flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {t('initialHouseholdSetup')}
                          <span className="text-white/50 text-xs ml-1">({t('estimatedAverage')})</span>
                        </span>
                        <p className="text-white/50 text-xs mt-0.5">
                          {t('initialHouseholdSetupAmount')}
                        </p>
                      </div>
                      <span className="text-white font-semibold ml-4">
                        {formatCurrency(comparisonCalculated.initialHouseholdSetup * conversionRate, selectedCurrency)}
                      </span>
                    </div>
                    <div className="border-t border-white/20 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-bold">{t('arrivalCostsTotal')}</span>
                        <span className="text-white font-bold text-lg">
                          {formatCurrency(comparisonCalculated.arrivalCostsTotal * conversionRate, selectedCurrency)}
                        </span>
                      </div>
                      <p className="text-white/50 text-xs mt-1.5">
                        Note: This excludes flight costs and is separate from visa/blocked account fees.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="backdrop-blur-sm bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/20 rounded-xl p-4 sm:p-6 relative">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Euro className="w-5 h-5" />
                {t('costBreakdown')}
              </h4>
              {primaryScenario.targetCity && comparisonScenario.targetCity && monthlyDifference !== null && monthlyDifference !== 0 && (
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${
                  monthlyDifference > 0 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {monthlyDifference > 0 ? '-' : '+'}{formatCurrency(Math.abs(monthlyDifference) * conversionRate, selectedCurrency)}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <div className="text-white/70 text-sm mb-2">{t('monthlyTotal')}</div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(comparisonCalculated.monthlyTotal * conversionRate, selectedCurrency)}
                  </div>
                </div>
                <div>
                  <div className="text-white/70 text-sm mb-2">{t('annualTotal')}</div>
                  <div className="text-xl font-bold text-white">
                    {formatCurrency(comparisonCalculated.annualTotal * conversionRate, selectedCurrency)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      
      {/* Currency Selector - Advanced (only show if not EUR/USD/INR, otherwise use Navbar toggle) */}
      {!['EUR', 'USD', 'INR'].includes(selectedCurrency) && (
        <div className="mt-6 flex justify-center">
          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4">
            <label className="block text-xs text-white/60 mb-2 text-center">{t('displayCurrencyAdvanced')}</label>
            <CurrencySelector value={selectedCurrency} onChange={setSelectedCurrency} />
          {isLoadingRates && (
            <div className="mt-2 flex justify-center animate-pulse">
              <div className="h-3 w-44 rounded bg-slate-700/70" />
            </div>
          )}
          {!isLoadingRates && !apiError && exchangeRates && (
            <p className="mt-2 text-white/40 text-xs text-center">
              {t('liveRatesProvidedBy')}{' '}
              <a
                href={FRANKFURTER_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
              >
                {t('frankfurterAPI')}
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          )}
          {apiError && (
            <p className="mt-2 text-yellow-400/70 text-xs text-center">
              {t('usingDefaultRates')}
            </p>
          )}
          </div>
        </div>
      )}

      {/* Your Next Steps Checklist */}
      <div className="mt-12 mb-6">
        <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{t('nextStepsTitle')}</h2>
            <p className="text-white/70 text-sm">
              {t('nextStepsSubtitle')}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/80 text-sm font-medium">{t('progressLabel')}</span>
              <span className="text-white/60 text-sm">
                {t('progressCompletedCount', {
                  done: visibleChecklistItems.filter((item) => checklistState[item.id]).length,
                  total: visibleChecklistItems.length,
                })}
              </span>
            </div>
            <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            {visibleChecklistItems.map((item) => {
              const isChecked = checklistState[item.id] || false;
              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-3 p-4 rounded-lg transition-all duration-200 ${
                    isChecked 
                      ? 'bg-green-950/30 border border-green-500/30' 
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleChecklistItem(item.id)}
                      className="mt-0.5 flex-shrink-0 cursor-pointer"
                    >
                      {isChecked ? (
                        <CheckCircle2 className="w-6 h-6 text-green-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-white/40" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${
                          isChecked ? 'text-white/60 line-through' : 'text-white'
                        }`}>
                          {item.label}
                        </span>
                        {item.highlight && (
                          <span className="px-2 py-0.5 bg-yellow-950/30 border border-yellow-500/30 text-yellow-400 text-xs font-medium rounded">
                            {item.highlightText}
                          </span>
                        )}
                      </div>
                      {item.subtext && (
                        <p className="text-xs text-white/50 mt-1">{item.subtext}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Links with Info Icons */}
                  <div className="ml-9 space-y-2">
                    <div className="flex flex-wrap gap-2 items-center">
                      {/* Official Link */}
                      {item.officialLink && (
                        <a
                          href={item.officialLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-medium rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>{item.officialLinkLabel}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      
                      {/* Multiple Official Links (for accommodation) */}
                      {item.officialLinks && item.officialLinks.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-medium rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>{link.label}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                      
                    {/* Affiliate Link (more prominent button style) - hidden when AFFILIATE_ENABLED=false */}
                    {AFFILIATE_ENABLED && item.affiliateLink && !item.affiliateLink.startsWith('YOUR_') && (
                      <a
                        href={item.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs font-medium rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (AFFILIATE_TRACKING_ENABLED) {
                            trackEvent('click_affiliate_link', 'Checklist', item.label || item.id);
                            const providerName = item.affiliateLink.includes('expatrio') ? 'Expatrio' 
                              : item.affiliateLink.includes('fintiba') ? 'Fintiba'
                              : item.affiliateLink.includes('feather') ? 'Feather'
                              : item.affiliateLink.includes('dr-walter') || item.affiliateLink.includes('drwalter') ? 'DR-Walter'
                              : item.label || item.id;
                            if (typeof window !== 'undefined' && window.gtag) {
                              window.gtag('event', 'affiliate_click', {
                                provider_name: providerName,
                                checklist_item: item.label || item.id,
                              });
                            }
                          }
                        }}
                      >
                        <span>{item.affiliateLinkLabel || 'Compare & Open'}</span>
                        <AffiliateLabel variant="subtle" className="ml-1" />
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                      {/* Info Icon - Show guide */}
                      {item.guide && (
                        <div className="relative" data-info-box>
                          <button
                            type="button"
                            data-info-button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Toggle on click (works for mobile and as fallback for desktop)
                              if (openInfoBox === item.id) {
                                setOpenInfoBox(null);
                              } else {
                                setOpenInfoBox(item.id);
                              }
                            }}
                            onMouseEnter={() => {
                              // Show on hover for desktop (with small delay for better UX)
                              if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                                if (infoBoxTimeoutRef.current) {
                                  clearTimeout(infoBoxTimeoutRef.current);
                                }
                                infoBoxTimeoutRef.current = setTimeout(() => {
                                  setOpenInfoBox(item.id);
                                }, 100);
                              }
                            }}
                            onMouseLeave={() => {
                              // Delay closing on desktop to allow moving to the info box
                              if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                                if (infoBoxTimeoutRef.current) {
                                  clearTimeout(infoBoxTimeoutRef.current);
                                }
                                infoBoxTimeoutRef.current = setTimeout(() => {
                                  setOpenInfoBox(null);
                                }, 200);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 transition-colors"
                            aria-label="Show instructions"
                            aria-expanded={openInfoBox === item.id}
                          >
                            <Info className="w-4 h-4" />
                          </button>

                          {/* Info Box Tooltip/Popover - Desktop: hover shows, Mobile: click shows */}
                          <div 
                            className={`absolute left-0 top-full mt-2 z-[100] w-80 max-w-[calc(100vw-2rem)] backdrop-blur-md bg-slate-950/95 border border-white/30 rounded-lg shadow-2xl p-4 transition-all duration-200 ${
                              openInfoBox === item.id 
                                ? 'opacity-100 visible translate-y-0 pointer-events-auto' 
                                : 'opacity-0 invisible -translate-y-1 pointer-events-none'
                            }`}
                            onMouseEnter={() => {
                              // Keep open when hovering over the box (desktop)
                              if (infoBoxTimeoutRef.current) {
                                clearTimeout(infoBoxTimeoutRef.current);
                              }
                            }}
                            onMouseLeave={() => {
                              // Close when mouse leaves the box (desktop only)
                              if (typeof window !== 'undefined' && window.innerWidth >= 768) {
                                setOpenInfoBox(null);
                              }
                            }}
                          >
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-white mb-2">{t('howTo')}</h4>
                              <ul className="space-y-1.5">
                                {item.guide.map((step, index) => (
                                  <li key={index} className="text-xs text-white/80 leading-relaxed">
                                    {step}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {/* Arrow pointer */}
                            <div className="absolute -top-1.5 left-4 w-3 h-3 bg-slate-950/95 border-l border-t border-white/30 rotate-45"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reset Button */}
          {Object.keys(checklistState).some(key => checklistState[key]) && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <button
                type="button"
                onClick={() => setChecklistState({})}
                className="text-white/60 hover:text-white/80 text-sm transition-colors"
              >
                {t('resetChecklist')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Road to Germany Timeline */}
      {!isComparisonMode && primaryScenario.targetCity && (
        <RoadToGermanyTimeline 
          semesterStartDate={primaryScenario.plannedSemesterStart}
          onDateChange={(date) => setPrimaryScenario(prev => ({ ...prev, plannedSemesterStart: date }))}
          locale={locale}
        />
      )}

      {/* Data Transparency Section - Moved to bottom */}
      <div className="mt-20 mb-6 backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">{t('howWeCalculate')}</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                {t('howWeCalculateText')}{' '}
                <a
                  href={FRANKFURTER_APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
                >
                  {t('frankfurterAPI')}
                  <ExternalLink className="w-3 h-3" />
                </a>
                . {t('howWeCalculateLinkText')}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1.5 bg-blue-950/30 border border-blue-500/30 text-blue-300 text-xs font-medium rounded-full">
              {t('lastUpdated')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Road to Germany Timeline Component
interface RoadToGermanyTimelineProps {
  semesterStartDate: string;
  onDateChange: (date: string) => void;
  locale: string;
}

interface TimelineMilestone {
  id: string;
  monthsBefore: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  date: Date;
  isPast: boolean;
  isCurrent: boolean;
  affiliateLink?: string;
  affiliateLabel?: string;
  affiliateLinkKey?: string;
}

function RoadToGermanyTimeline({ semesterStartDate, onDateChange, locale }: RoadToGermanyTimelineProps) {
  const t = useTranslations('Timeline');
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  
  // Timeline progress state with localStorage sync
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    const saved = localStorage.getItem('timelineProgress');
    return saved ? JSON.parse(saved) : {};
  });

  // Sync completed steps to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('timelineProgress', JSON.stringify(completedSteps));
    }
  }, [completedSteps]);

  // Toggle step completion
  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId],
    }));
  };
  
  // Get today's date (stable reference)
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Parse semester start date
  const semesterStart = useMemo(() => {
    const date = new Date(semesterStartDate);
    date.setHours(0, 0, 0, 0);
    return date;
  }, [semesterStartDate]);

  // Affiliate link placeholders
  const AFFILIATE_LINKS = {
    SPERRKONTO: process.env.NEXT_PUBLIC_AFFILIATE_SPERRKONTO || 'YOUR_EXPATRIO_OR_FINTIBA_LINK',
    GIROKONTO: process.env.NEXT_PUBLIC_AFFILIATE_GIROKONTO || 'YOUR_N26_OR_DKB_LINK',
  };

  // Calculate milestones
  const milestones: TimelineMilestone[] = useMemo(() => {
    const steps = [
      { id: 'university', monthsBefore: 6, icon: Book, titleKey: 'universityTitle', descKey: 'universityDesc' },
      { 
        id: 'admission', 
        monthsBefore: 4, 
        icon: Wallet, 
        titleKey: 'admissionTitle', 
        descKey: 'admissionDesc',
        affiliateLink: AFFILIATE_LINKS.SPERRKONTO,
        affiliateLabel: t('blockedAccountCTA'),
        affiliateLinkKey: 'SPERRKONTO',
      },
      { id: 'visaAppointment', monthsBefore: 3, icon: Calendar, titleKey: 'visaAppointmentTitle', descKey: 'visaAppointmentDesc' },
      { id: 'visaApplication', monthsBefore: 2, icon: Landmark, titleKey: 'visaApplicationTitle', descKey: 'visaApplicationDesc' },
      { id: 'accommodation', monthsBefore: 1, icon: Home, titleKey: 'accommodationTitle', descKey: 'accommodationDesc' },
      { 
        id: 'arrival', 
        monthsBefore: 0, 
        icon: Plane, 
        titleKey: 'arrivalTitle', 
        descKey: 'arrivalDesc',
        affiliateLink: AFFILIATE_LINKS.GIROKONTO,
        affiliateLabel: t('bankAccountCTA'),
        affiliateLinkKey: 'GIROKONTO',
      },
    ];

    return steps.map((step) => {
      const milestoneDate = new Date(semesterStart);
      milestoneDate.setMonth(milestoneDate.getMonth() - step.monthsBefore);
      milestoneDate.setHours(0, 0, 0, 0);

      const isPast = milestoneDate < today;
      const isCurrent = milestoneDate.getTime() === today.getTime() || 
        (milestoneDate < today && milestoneDate.getTime() >= today.getTime() - 7 * 24 * 60 * 60 * 1000); // Within last week

      return {
        id: step.id,
        monthsBefore: step.monthsBefore,
        title: t(step.titleKey),
        description: t(step.descKey),
        icon: <step.icon className="w-5 h-5" />,
        date: milestoneDate,
        isPast,
        isCurrent,
        affiliateLink: step.affiliateLink,
        affiliateLabel: step.affiliateLabel,
        affiliateLinkKey: step.affiliateLinkKey,
      };
    });
  }, [semesterStartDate, today, t]);

  // Format date for display
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  // Calculate progress
  const totalSteps = milestones.length;
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercentage = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  return (
    <div className="mt-12 backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <MapPin className="w-6 h-6" />
              {t('title')}
            </h2>
            <p className="text-white/70 text-sm">
              {t('subtitle')}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">
              {t('progress', { completed: completedCount, total: totalSteps })}
            </span>
            <span className="text-white/60 text-xs">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-white/20" />

        {/* Milestones */}
        <div className="space-y-6">
          {milestones.map((milestone) => {
            const isChecked = completedSteps[milestone.id] || false;
            return (
              <div
                key={milestone.id}
                className="relative pl-14"
              >
                {/* Icon Circle */}
                <div
                  className={`absolute left-0 top-0 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isChecked
                      ? 'bg-green-600 border-green-400 shadow-lg shadow-green-500/50'
                      : milestone.isCurrent
                      ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/50'
                      : milestone.isPast
                      ? 'bg-green-600/20 border-green-500/50'
                      : 'bg-slate-800/50 border-white/30'
                  }`}
                >
                  <div className={isChecked ? 'text-white' : 'text-white'}>
                    {milestone.icon}
                  </div>
                </div>

                {/* Content Card */}
                <div
                  className={`backdrop-blur-sm rounded-lg p-4 border transition-all cursor-pointer hover:border-white/30 ${
                    isChecked
                      ? 'bg-green-950/20 border-green-500/30 opacity-75'
                      : milestone.isCurrent
                      ? 'bg-blue-950/30 border-blue-500/50'
                      : milestone.isPast
                      ? 'bg-green-950/20 border-green-500/30'
                      : 'bg-slate-900/50 border-white/10'
                  }`}
                  onClick={(e) => {
                    // Don't toggle expansion if clicking the checkbox
                    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                      return;
                    }
                    setExpandedStep(expandedStep === milestone.id ? null : milestone.id);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        {/* Checkbox */}
                        <label
                          className="flex items-center cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleStep(milestone.id);
                            }}
                            className="w-4 h-4 text-green-600 bg-black/40 border-white/20 rounded focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
                          />
                        </label>
                        <h3 className={`font-semibold text-sm flex-1 ${
                          isChecked 
                            ? 'text-white/50 line-through' 
                            : 'text-white'
                        }`}>
                          {milestone.title}
                        </h3>
                        {!isChecked && milestone.isCurrent && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                            {t('current')}
                          </span>
                        )}
                        {!isChecked && milestone.isPast && !milestone.isCurrent && (
                          <span className="px-2 py-0.5 bg-green-600/20 text-green-300 text-xs rounded-full border border-green-500/30">
                            {t('completed')}
                          </span>
                        )}
                        {isChecked && (
                          <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {t('done')}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mb-2 ${
                        isChecked 
                          ? 'text-white/40 line-through' 
                          : 'text-white/60'
                      }`}>
                        {formatDate(milestone.date)} • {milestone.monthsBefore === 0 ? t('month0') : t('monthsBefore', { months: milestone.monthsBefore })}
                      </p>
                      {expandedStep === milestone.id && (
                        <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                          <p className="text-white/80 text-xs leading-relaxed">
                            {milestone.description}
                          </p>
                          {/* Affiliate Link Button - hidden when AFFILIATE_ENABLED=false */}
                          {AFFILIATE_ENABLED && milestone.affiliateLink && milestone.affiliateLabel && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                              {milestone.affiliateLink !== 'YOUR_EXPATRIO_OR_FINTIBA_LINK' && milestone.affiliateLink !== 'YOUR_N26_OR_DKB_LINK' ? (
                                <a
                                  href={milestone.affiliateLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (AFFILIATE_TRACKING_ENABLED) {
                                      const providerName = milestone.affiliateLinkKey === 'SPERRKONTO' ? 'BlockedAccount' : 'BankAccount';
                                      trackEvent('click_affiliate_link', 'Timeline', providerName);
                                      if (typeof window !== 'undefined' && window.gtag) {
                                        window.gtag('event', 'affiliate_click', {
                                          provider_name: providerName,
                                          timeline_step: milestone.id,
                                        });
                                      }
                                    }
                                  }}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-xs font-medium rounded-lg transition-colors group"
                                >
                                  <Wallet className="w-3.5 h-3.5" />
                                  <span>{milestone.affiliateLabel}</span>
                                  <AffiliateLabel variant="subtle" className="ml-1" />
                                  <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                                </a>
                              ) : (
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-white/10 text-white/50 text-xs font-medium rounded-lg cursor-not-allowed">
                                  <Wallet className="w-3.5 h-3.5" />
                                  <span>{milestone.affiliateLabel}</span>
                                  <AffiliateLabel variant="subtle" className="ml-1" />
                                  <span className="text-[10px] text-white/40 ml-1">({t('placeholderLabel')})</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Info className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legal Disclaimer for Timeline */}
      <div className="mt-6 pt-4 border-t border-white/10">
        <div className="flex items-start gap-2 text-slate-400 text-xs italic leading-relaxed">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-yellow-400/70" />
          <p>
            {t('timelineDisclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}