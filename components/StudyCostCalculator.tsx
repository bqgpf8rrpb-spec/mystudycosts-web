'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { MapPin, Plane, Shield, Building, Euro, Info, Search, ChevronDown, Loader2, ExternalLink, GraduationCap, Download, Wallet, GitCompare, Lock, ArrowRight, CheckCircle2, Circle, AlertTriangle, Database, Briefcase, Coins } from 'lucide-react';
import { useCurrency, type CurrencyCode } from '@/contexts/CurrencyContext';
import { trackEvent } from '@/lib/analytics';

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

// Currency formatting function: dot as thousands separator, cents only if not zero
function formatCurrency(amount: number, currency: CurrencyCode = 'EUR'): string {
  const wholePart = Math.floor(amount);
  const centsPart = Math.round((amount - wholePart) * 100);
  
  // Format whole part with dot as thousands separator
  const formattedWhole = wholePart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  // Currency symbols
  const currencySymbols: Record<CurrencyCode, string> = {
    EUR: '€',
    USD: '$',
    INR: '₹',
    CNY: '¥',
    GBP: '£',
  };
  
  const symbol = currencySymbols[currency];
  
  // Only add cents if they are not zero
  if (centsPart === 0) {
    return `${symbol}${formattedWhole}`;
  } else {
    return `${symbol}${formattedWhole},${centsPart.toString().padStart(2, '0')}`;
  }
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
  'Costa Rica': 75,
  'Croatia': 0, // EU member
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

// German Universities with Semester Fees
interface University {
  name: string;
  city: string;
  semesterFee: number;
  nonEUTuitionFee?: number; // Optional: ~1,500€ per semester for non-EU students (e.g., Baden-Württemberg)
}

const UNIVERSITIES: University[] = [
  { name: 'TU Munich', city: 'Munich', semesterFee: 147 },
  { name: 'LMU Munich', city: 'Munich', semesterFee: 142 },
  { name: 'HU Berlin', city: 'Berlin', semesterFee: 315 },
  { name: 'FU Berlin', city: 'Berlin', semesterFee: 315 },
  { name: 'TU Berlin', city: 'Berlin', semesterFee: 314 },
  { name: 'Heidelberg University', city: 'Heidelberg', semesterFee: 185, nonEUTuitionFee: 1500 },
  { name: 'University of Hamburg', city: 'Hamburg', semesterFee: 335 },
  { name: 'TU Darmstadt', city: 'Darmstadt', semesterFee: 285 },
  { name: 'University of Cologne', city: 'Cologne', semesterFee: 321 },
  { name: 'RWTH Aachen', city: 'Aachen', semesterFee: 304 },
  { name: 'University of Bonn', city: 'Bonn', semesterFee: 299 },
  { name: 'TU Dresden', city: 'Dresden', semesterFee: 275 },
  { name: 'University of Stuttgart', city: 'Stuttgart', semesterFee: 170, nonEUTuitionFee: 1500 },
  { name: 'KIT Karlsruhe', city: 'Karlsruhe', semesterFee: 162, nonEUTuitionFee: 1500 },
  { name: 'University of Tübingen', city: 'Tübingen', semesterFee: 176, nonEUTuitionFee: 1500 },
  { name: 'University of Freiburg', city: 'Freiburg', semesterFee: 186, nonEUTuitionFee: 1500 },
  { name: 'University of Münster', city: 'Münster', semesterFee: 311 },
  { name: 'FAU Erlangen-Nürnberg', city: 'Erlangen', semesterFee: 142 },
  { name: 'University of Göttingen', city: 'Göttingen', semesterFee: 377 },
  { name: 'TU Braunschweig', city: 'Braunschweig', semesterFee: 374 },
  { name: 'University of Mannheim', city: 'Mannheim', semesterFee: 187, nonEUTuitionFee: 1500 },
  { name: 'University of Konstanz', city: 'Konstanz', semesterFee: 177, nonEUTuitionFee: 1500 },
  { name: 'Leibniz University Hanover', city: 'Hanover', semesterFee: 436 },
  { name: 'University of Würzburg', city: 'Würzburg', semesterFee: 129 },
  { name: 'University of Leipzig', city: 'Leipzig', semesterFee: 223 },
  { name: 'University of Mainz', city: 'Mainz', semesterFee: 359 },
  { name: 'Goethe University Frankfurt', city: 'Frankfurt', semesterFee: 360 },
  { name: 'Heinrich Heine University', city: 'Düsseldorf', semesterFee: 320 },
  { name: 'University of Marburg', city: 'Marburg', semesterFee: 339 },
  { name: 'University of Kiel', city: 'Kiel', semesterFee: 300 },
  { name: 'University of Regensburg', city: 'Regensburg', semesterFee: 165 },
];

const STUDY_DATA = {
  CITIES: UNIVERSITY_CITIES,
  ORIGIN_COUNTRIES: COUNTRIES,
  UNIVERSITIES: UNIVERSITIES,
  FIXED_COSTS: {
    blockedAccountMonthly: 992,
    blockedAccountYearly: 11904,
    healthInsurancePublic: 120,
    healthInsurancePrivate: 80,
    livingExpenses: 400,
  },
  BLOCKED_ACCOUNT_PROVIDERS: [
    { name: 'Fintiba', setupFee: 89, monthlyFee: 4.9 },
    { name: 'Expatrio', setupFee: 49, monthlyFee: 4.9 },
    { name: 'Coracle', setupFee: 99, monthlyFee: 5.0 },
  ],
} as const;

type City = keyof typeof STUDY_DATA.CITIES;
type OriginCountry = keyof typeof STUDY_DATA.ORIGIN_COUNTRIES;
type InsuranceType = 'public' | 'private';
type JobType = 'minijob' | 'working_student';

// Scenario interface for comparison mode
interface Scenario {
  originCountry: OriginCountry | '';
  targetCity: City | '';
  selectedUniversity: string;
  insuranceType: InsuranceType;
  jobType: JobType;
  hoursPerWeek: number;
  hourlyWage: number;
}

// Calculated values interface
interface CalculatedValues {
  visaFee: number;
  monthlyRent: number;
  monthlyInsurance: number;
  semesterFeeMonthly: number;
  nonEUTuitionFeeMonthly: number;
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

// Searchable Combobox Component
interface SearchableComboboxProps<T extends string> {
  options: T[];
  value: T | '';
  onChange: (value: T) => void;
  placeholder: string;
  icon: React.ReactNode;
  label: string;
  cardZIndex?: number;
}

function SearchableCombobox<T extends string>({
  options,
  value,
  onChange,
  placeholder,
  icon,
  label,
  cardZIndex = 10,
}: SearchableComboboxProps<T>) {
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
            <p className="text-white/60 text-sm">No results found</p>
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
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleDropdown();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1 hover:bg-white/10 rounded transition-colors"
              aria-label="Toggle dropdown"
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

// Official Resource Links
const OFFICIAL_LINKS = {
  applyUniversity: 'https://www.daad.de/en/',
  uniAssist: 'https://www.uni-assist.de/',
  visaAppointment: 'https://service2.diplo.de/rktermin/extern/choose_realmList.do?locationCode=indi&request_locale=en',
  accommodation: {
    studentenwerk: 'https://www.studierendenwerk.de/',
    wgGesucht: 'https://www.wg-gesucht.de/',
  },
} as const;

export default function StudyCostCalculator() {
  // Get current locale from pathname for locale-aware links
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] || 'en';
  
  // Comparison mode state
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  
  // Primary scenario state
  const [primaryScenario, setPrimaryScenario] = useState<Scenario>({
    originCountry: '',
    targetCity: '',
    selectedUniversity: '',
    insuranceType: 'public',
    jobType: 'minijob',
    hoursPerWeek: 0,
    hourlyWage: 12.41,
  });
  
  // Comparison scenario state
  const [comparisonScenario, setComparisonScenario] = useState<Scenario>({
    originCountry: '',
    targetCity: '',
    selectedUniversity: '',
    insuranceType: 'public',
    jobType: 'minijob',
    hoursPerWeek: 0,
    hourlyWage: 12.41,
  });
  
  // Currency from context (shared with Navbar)
  const { selectedCurrency, setSelectedCurrency } = useCurrency();
  
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
      '1. Create an account on DAAD or uni-assist',
      '2. Search for your desired course/program',
      '3. Upload certified copies of your transcripts and certificates',
      '4. Pay the application fee (if applicable)',
      '5. Submit before the deadline',
    ],
    'admission-letter': [
      'After receiving admission:',
      '1. Download the official admission letter (Zulassungsbescheid)',
      '2. Check that all details are correct (name, course, semester)',
      '3. You will need this for your visa application',
    ],
    'blocked-account': [
      'Choose your arrival month and deposit the required €11,904',
      'You will receive the Confirmation of Financial Resources (06 Confirmation) for your visa within 24 hours',
      'Keep your account details safe - you will need them to access funds in Germany',
    ],
    'health-insurance': [
      '1. Compare providers and choose a plan (Public or Private)',
      '2. Fill out the application form with your personal details',
      '3. Upload required documents (passport, admission letter)',
      '4. Receive your insurance certificate for visa application',
    ],
    'visa-appointment': [
      '1. Select your specific consulate/embassy location',
      '2. Choose "National Visa" category',
      '3. Look for "Long-term stay" or "Study" option',
      '4. Book the earliest available slot (appointments can fill up quickly!)',
    ],
    'accommodation': [
      'Studentenwerk: Apply early for student dormitories (cheapest option)',
      'WG-Gesucht: Browse shared apartments (WG). Start early - competition is high!',
      'Tip: Have all documents ready (income proof, references) to apply quickly',
    ],
  };

  // Checklist items for "Your Next Steps"
  const checklistItems = [
    { 
      id: 'apply-university', 
      label: 'Apply to University', 
      subtext: 'Deadline check',
      officialLink: OFFICIAL_LINKS.applyUniversity,
      officialLinkLabel: 'DAAD',
      guide: checklistItemGuides['apply-university'],
    },
    { 
      id: 'admission-letter', 
      label: 'Get Admission Letter',
      guide: checklistItemGuides['admission-letter'],
    },
    { 
      id: 'blocked-account', 
      label: 'Open Blocked Account',
      affiliateLink: AFFILIATE_LINKS.blockedAccount,
      affiliateLinkLabel: 'Recommended Provider',
      showIfNonEU: true,
      guide: checklistItemGuides['blocked-account'],
    },
    { 
      id: 'health-insurance', 
      label: 'Apply for Health Insurance',
      affiliateLink: AFFILIATE_LINKS.healthInsurance,
      affiliateLinkLabel: 'Get Insurance',
      guide: checklistItemGuides['health-insurance'],
    },
    { 
      id: 'visa-appointment', 
      label: 'Book Visa Appointment',
      officialLink: OFFICIAL_LINKS.visaAppointment,
      officialLinkLabel: 'Book Appointment',
      showIfNonEU: true,
      guide: checklistItemGuides['visa-appointment'],
    },
    { 
      id: 'accommodation', 
      label: 'Find Accommodation', 
      highlight: true, 
      highlightText: 'The hardest part!',
      officialLinks: [
        { url: OFFICIAL_LINKS.accommodation.studentenwerk, label: 'Studentenwerk' },
        { url: OFFICIAL_LINKS.accommodation.wgGesucht, label: 'WG-Gesucht' },
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
  
  // Use primary scenario for backwards compatibility (will refactor calculations next)
  const originCountry = primaryScenario.originCountry;
  const targetCity = primaryScenario.targetCity;
  const selectedUniversity = primaryScenario.selectedUniversity;
  const insuranceType = primaryScenario.insuranceType;
  const hoursPerWeek = primaryScenario.hoursPerWeek;
  const hourlyWage = primaryScenario.hourlyWage;

  // Calculate function - takes a scenario and returns calculated values
  const calculateScenario = useMemo(() => {
    return (scenario: Scenario): CalculatedValues => {
      const visaFee = scenario.originCountry ? STUDY_DATA.ORIGIN_COUNTRIES[scenario.originCountry] : 0;
      const monthlyRent = scenario.targetCity ? STUDY_DATA.CITIES[scenario.targetCity] : 0;
      const monthlyInsurance = scenario.insuranceType === 'public' 
        ? STUDY_DATA.FIXED_COSTS.healthInsurancePublic 
        : STUDY_DATA.FIXED_COSTS.healthInsurancePrivate;
      
      // Get university data
      const selectedUniversityData = scenario.selectedUniversity
        ? STUDY_DATA.UNIVERSITIES.find(u => u.name === scenario.selectedUniversity)
        : null;
      
      // Semester fee (monthly pro rata - divided by 6 months per semester)
      const semesterFeeMonthly = selectedUniversityData ? selectedUniversityData.semesterFee / 6 : 0;
      
      // Check if origin country is non-EU (visa fee > 0 means non-EU)
      const isNonEU = scenario.originCountry ? STUDY_DATA.ORIGIN_COUNTRIES[scenario.originCountry] > 0 : false;
      
      // Non-EU Tuition Fee (monthly pro rata - divided by 6 months per semester)
      const nonEUTuitionFeeMonthly = (isNonEU && selectedUniversityData?.nonEUTuitionFee) 
        ? selectedUniversityData.nonEUTuitionFee / 6 
        : 0;
      
      // Upfront costs (one-time)
      const blockedAccountTotal = STUDY_DATA.FIXED_COSTS.blockedAccountYearly;
      const upfrontTotal = visaFee + blockedAccountTotal;

      // Monthly costs
      const monthlyLivingExpenses = STUDY_DATA.FIXED_COSTS.livingExpenses;
      const monthlyTotal = monthlyRent + monthlyInsurance + monthlyLivingExpenses + semesterFeeMonthly + nonEUTuitionFeeMonthly;

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
        monthlyRent,
        monthlyInsurance,
        semesterFeeMonthly,
        nonEUTuitionFeeMonthly,
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
    if (primaryScenario.targetCity && primaryScenario.originCountry) {
      // Track calculation event with scenario details
      const calculationKey = `${primaryScenario.originCountry}-${primaryScenario.targetCity}-${primaryScenario.selectedUniversity || 'none'}`;
      const lastTracked = sessionStorage.getItem('lastCalculationTracked');
      
      // Only track if this is a new calculation (not already tracked)
      if (lastTracked !== calculationKey) {
        trackEvent('calculate', 'Calculator', calculationKey);
        sessionStorage.setItem('lastCalculationTracked', calculationKey);
      }
    }
  }, [primaryScenario.targetCity, primaryScenario.originCountry, primaryScenario.selectedUniversity]);

  // Filter universities based on selected city (primary)
  const availableUniversities = useMemo(() => {
    if (!primaryScenario.targetCity) return [];
    return STUDY_DATA.UNIVERSITIES
      .filter(u => u.city === primaryScenario.targetCity)
      .map(u => u.name);
  }, [primaryScenario.targetCity]);

  // Filter universities for comparison scenario
  const comparisonAvailableUniversities = useMemo(() => {
    if (!comparisonScenario.targetCity) return [];
    return STUDY_DATA.UNIVERSITIES
      .filter(u => u.city === comparisonScenario.targetCity)
      .map(u => u.name);
  }, [comparisonScenario.targetCity]);

  // Get selected university data (primary)
  const selectedUniversityData = useMemo(() => {
    if (!primaryScenario.selectedUniversity) return null;
    return STUDY_DATA.UNIVERSITIES.find(u => u.name === primaryScenario.selectedUniversity);
  }, [primaryScenario.selectedUniversity]);

  // Reset university when city changes (primary)
  useEffect(() => {
    if (primaryScenario.targetCity && primaryScenario.selectedUniversity) {
      const universityInCity = STUDY_DATA.UNIVERSITIES.find(
        u => u.name === primaryScenario.selectedUniversity && u.city === primaryScenario.targetCity
      );
      if (!universityInCity) {
        setPrimaryScenario(prev => ({ ...prev, selectedUniversity: '' }));
      }
    } else if (!primaryScenario.targetCity) {
      setPrimaryScenario(prev => ({ ...prev, selectedUniversity: '' }));
    }
  }, [primaryScenario.targetCity, primaryScenario.selectedUniversity]);

  // Reset university when city changes (comparison)
  useEffect(() => {
    if (comparisonScenario.targetCity && comparisonScenario.selectedUniversity) {
      const universityInCity = STUDY_DATA.UNIVERSITIES.find(
        u => u.name === comparisonScenario.selectedUniversity && u.city === comparisonScenario.targetCity
      );
      if (!universityInCity) {
        setComparisonScenario(prev => ({ ...prev, selectedUniversity: '' }));
      }
    } else if (!comparisonScenario.targetCity) {
      setComparisonScenario(prev => ({ ...prev, selectedUniversity: '' }));
    }
  }, [comparisonScenario.targetCity, comparisonScenario.selectedUniversity]);

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
    monthlyRent,
    monthlyInsurance,
    semesterFeeMonthly,
    nonEUTuitionFeeMonthly,
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

  // PDF Export Function
  const handleExportPDF = async () => {
    // Track PDF export event
    trackEvent('export_pdf', 'Calculator', isComparisonMode ? 'comparison_mode' : 'single_mode');
    
    // Determine which element to export based on mode
    const element = isComparisonMode 
      ? comparisonContainerRef.current 
      : resultCardRef.current;

    if (typeof window === 'undefined' || !element) {
      return;
    }

    setIsExportingPDF(true);

    try {
      // Dynamic imports for browser-only libraries
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      
      // Store original background
      const originalBg = element.style.backgroundColor;
      
      // Temporarily set white background for PDF export
      element.style.backgroundColor = '#ffffff';
      
      try {
        // Capture the element as canvas with white background for printer-friendly PDF
        const canvas = await html2canvas(element, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher quality for crisp text
          logging: false,
          useCORS: true,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight,
        });
        
        // Restore original background
        element.style.backgroundColor = originalBg;

        // Calculate dimensions
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Convert canvas to image
        const imgData = canvas.toDataURL('image/png');
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        
        // Generate filename
        const cityA = primaryScenario.targetCity || 'estimate';
        const cityB = comparisonScenario.targetCity || 'estimate';
        const fileName = isComparisonMode
          ? `MyStudyCosts_Comparison_${cityA}_vs_${cityB}_${new Date().toISOString().split('T')[0]}.pdf`
          : `MyStudyCosts_Breakdown_${cityA}_${new Date().toISOString().split('T')[0]}.pdf`;
        
        // Save PDF
        pdf.save(fileName);
      } catch (captureError) {
        // Restore background even if capture fails
        element.style.backgroundColor = originalBg;
        throw captureError;
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Show user-friendly error message
      alert('Failed to generate PDF. Please try again or check your browser settings.');
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
      {/* Data Transparency Section */}
      <div className="mb-6 backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">How we calculate</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Our data is sourced from official statistics (Statistisches Bundesamt), student unions (Studierendenwerke), 
                and live currency exchange rates from{' '}
                <a
                  href="https://www.frankfurter.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
                >
                  Frankfurter API
                  <ExternalLink className="w-3 h-3" />
                </a>
                . All costs are estimates based on average student expenses.
              </p>
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1.5 bg-blue-950/30 border border-blue-500/30 text-blue-300 text-xs font-medium rounded-full">
              Last Updated: December 2024
            </span>
          </div>
        </div>
      </div>

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
          <span>{isComparisonMode ? 'Exit Comparison' : 'Compare with another city'}</span>
        </button>
      </div>

      {/* Comparison Summary Card */}
      {isComparisonMode && primaryScenario.targetCity && comparisonScenario.targetCity && monthlyDifference !== null && (
        <div className="mb-6 backdrop-blur-sm bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-white/20 rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-2">Comparison Summary</h3>
              <p className="text-white/80 text-sm">
                <span className="font-semibold">{comparisonScenario.targetCity}</span> vs <span className="font-semibold">{primaryScenario.targetCity}</span>
              </p>
            </div>
            <div className={`text-right ${monthlyDifference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              <div className="text-2xl font-bold">
                {monthlyDifference >= 0 ? '+' : ''}{formatCurrency(Math.abs(monthlyDifference) * conversionRate, selectedCurrency)}
              </div>
              <div className="text-sm text-white/70">
                {monthlyDifference >= 0 ? 'more expensive' : 'less expensive'} per month
              </div>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={!primaryScenario.targetCity || !comparisonScenario.targetCity || isExportingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              aria-label="Export comparison as PDF"
              title="Export comparison as PDF"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export PDF</span>
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
            placeholder="Search for your country..."
            icon={<Plane className="w-4 h-4" />}
            label="Where are you coming from?"
            cardZIndex={100}
          />

          {/* Target City Combobox */}
          <SearchableCombobox
            options={CITY_OPTIONS}
            value={primaryScenario.targetCity}
            onChange={(value) => setPrimaryScenario(prev => ({ ...prev, targetCity: value }))}
            placeholder="Search for a German university city..."
            icon={<MapPin className="w-4 h-4" />}
            label="Where do you want to study?"
            cardZIndex={90}
          />

          {/* Accommodation Warning for High-Demand Cities */}
          {primaryScenario.targetCity && highDemandCities.includes(primaryScenario.targetCity) && (
            <div className="backdrop-blur-sm bg-yellow-950/30 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-yellow-200 mb-1">Housing Warning</h4>
                  <p className="text-xs text-yellow-200/90 leading-relaxed">
                    Note: Housing in {primaryScenario.targetCity} is extremely scarce. We recommend starting your search 4-6 months before arrival.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* University Combobox */}
          {primaryScenario.targetCity && (
            <SearchableCombobox<string>
              options={availableUniversities}
              value={primaryScenario.selectedUniversity}
              onChange={(value) => setPrimaryScenario(prev => ({ ...prev, selectedUniversity: value }))}
              placeholder="Search for a university..."
              icon={<GraduationCap className="w-4 h-4" />}
              label="Which university do you want to attend?"
              cardZIndex={80}
            />
          )}

          {/* Health Insurance Type Radio */}
          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
            <div className="flex items-start justify-between mb-3">
              <label className="block text-sm font-medium text-white/80 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Health Insurance Type
              </label>
              <button
                type="button"
                className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1 transition-colors"
                onClick={() => setShowInsuranceInfo(!showInsuranceInfo)}
              >
                <Info className="w-3 h-3" />
                Learn more
              </button>
            </div>
            
            {/* Info Block */}
            {showInsuranceInfo && (
              <div className="mb-3 p-3 bg-blue-950/30 border border-blue-500/20 rounded-lg">
              <p className="text-white/80 text-xs mb-2">
                <strong className="text-white">Public:</strong> Standard for students under 30, comprehensive coverage, fixed price (average monthly: {formatCurrency(STUDY_DATA.FIXED_COSTS.healthInsurancePublic)}).
              </p>
              <p className="text-white/80 text-xs">
                <strong className="text-white">Private:</strong> Depends on age/health, often required for students over 30 or language students (average monthly: {formatCurrency(STUDY_DATA.FIXED_COSTS.healthInsurancePrivate)}).
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
                <span className="text-white/80">Public</span>
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
                <span className="text-white/80">Private</span>
              </label>
            </div>
            <p className="text-white/50 text-xs mt-2">
              Average monthly price: {formatCurrency(primaryCalculated.monthlyInsurance)}
            </p>
          </div>
        </div>

        {/* Result Dashboard */}
        <div className="lg:col-span-1 relative z-[10] min-w-0">
          <div 
            ref={resultCardRef}
            className="backdrop-blur-sm bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/20 rounded-xl p-4 sm:p-6 sticky top-6 relative z-[10]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Cost Breakdown
              </h2>
              <button
                onClick={handleExportPDF}
                disabled={!primaryScenario.targetCity || isExportingPDF}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                aria-label="Export as PDF"
                title={primaryScenario.targetCity ? 'Export cost breakdown as PDF' : 'Please select a city to export'}
              >
                {isExportingPDF ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="hidden sm:inline">Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export PDF</span>
                  </>
                )}
              </button>
            </div>

            {/* Currency Selector */}
            <div className="mb-6">
              <label className="block text-xs text-white/60 mb-2">Display Currency</label>
              <CurrencySelector value={selectedCurrency} onChange={setSelectedCurrency} />
              {isLoadingRates && (
                <div className="mt-2 flex items-center gap-2 text-white/50 text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Loading exchange rates...</span>
                </div>
              )}
              {!isLoadingRates && !apiError && exchangeRates && (
                <p className="mt-2 text-white/40 text-xs">
                  Live rates provided by{' '}
                  <a
                    href="https://www.frankfurter.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
                  >
                    Frankfurter API
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              )}
              {apiError && (
                <p className="mt-2 text-yellow-400/70 text-xs">
                  Using default rates. API unavailable.
                </p>
              )}
            </div>

            {/* Upfront Costs Section */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide mb-3">
                Upfront Costs (One-Time)
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm flex items-center gap-1">
                    <Plane className="w-3 h-3" />
                    Visa Fee
                  </span>
                  <span className="text-white font-semibold">
                    {primaryScenario.originCountry ? formatCurrency(visaFee * conversionRate, selectedCurrency) : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    Blocked Account (1 year)
                  </span>
                  <span className="text-white font-semibold">
                    {formatCurrency(blockedAccountTotal * conversionRate, selectedCurrency)}
                  </span>
                </div>
                <div className="border-t border-white/20 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">Upfront Total</span>
                    <span className="text-white font-bold text-lg">
                      {primaryScenario.originCountry ? formatCurrency(convertedUpfrontTotal, selectedCurrency) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Blocked Account Info Section - Only show if Non-EU (requires visa) */}
            {primaryScenario.originCountry && visaFee > 0 && (
              <div className="mb-6 backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-bold text-white">Blocked Account (Sperrkonto)</h3>
                </div>
                
                <div className="mb-4 space-y-2">
                  <p className="text-white/80 text-sm">
                    As a non-EU student, you are required to open a Blocked Account (Sperrkonto) to prove you have sufficient funds for your studies in Germany.
                  </p>
                  <div className="bg-blue-950/30 border border-blue-500/20 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white/80 text-sm">Required Amount (per month)</span>
                      <span className="text-white font-bold">
                        {formatCurrency(STUDY_DATA.FIXED_COSTS.blockedAccountMonthly * conversionRate, selectedCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/80 text-sm">Required Amount (per year)</span>
                      <span className="text-white font-bold">
                        {formatCurrency(STUDY_DATA.FIXED_COSTS.blockedAccountYearly * conversionRate, selectedCurrency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Provider Comparison Table */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-white/90 mb-3">Compare Providers</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-2 px-3 text-white/70 font-medium">Provider</th>
                          <th className="text-right py-2 px-3 text-white/70 font-medium">Setup Fee</th>
                          <th className="text-right py-2 px-3 text-white/70 font-medium">Monthly Fee</th>
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
                  <span>Learn how to open a Blocked Account</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Monthly Costs Section */}
            <div className="border-t border-white/20 pt-6">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide mb-3">
                Monthly Costs
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    Average Rent
                  </span>
                  <span className="text-white font-semibold">
                    {targetCity ? formatCurrency(monthlyRent * conversionRate, selectedCurrency) : '—'}
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
                {selectedUniversityData && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/70 text-sm flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" />
                      Average Semester Fee (pro rata)
                    </span>
                    <span className="text-white font-semibold">
                      {formatCurrency(semesterFeeMonthly * conversionRate, selectedCurrency)}
                    </span>
                  </div>
                )}
                {nonEUTuitionFeeMonthly > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-white/70 text-sm flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        Non-EU Tuition Fee (pro rata)
                      </span>
                      <span className="text-white font-semibold">
                        {formatCurrency(nonEUTuitionFeeMonthly * conversionRate, selectedCurrency)}
                      </span>
                    </div>
                    <div className="mt-2 p-2 bg-yellow-950/30 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-200/90 text-xs flex items-start gap-2">
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong className="text-yellow-200">Note:</strong> Some German states (e.g., Baden-Württemberg) charge additional tuition fees of approximately {formatCurrency(selectedUniversityData?.nonEUTuitionFee || 1500)} per semester for non-EU students. This fee is in addition to the regular semester fee.
                        </span>
                      </p>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-400 text-xs flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>Estimated living expenses</span>
                  </span>
                  <span className="text-slate-400 text-xs font-medium">
                    {formatCurrency(monthlyLivingExpenses * conversionRate, selectedCurrency)}
                  </span>
                </div>
                <div className="border-t border-white/20 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-lg">Monthly Total</span>
                    <span className="text-white font-bold text-2xl">
                      {targetCity ? formatCurrency(convertedMonthlyTotal, selectedCurrency) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Annual Total */}
            {primaryScenario.targetCity && (
              <div className="border-t border-white/20 pt-6 mt-6">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="text-white/70 text-sm mb-2">Annual Cost (12 months)</div>
                  <div className="text-3xl font-bold text-white">
                    {formatCurrency(convertedAnnualTotal, selectedCurrency)}
                  </div>
                  <p className="text-white/60 text-xs mt-2">
                    Plus upfront costs: {formatCurrency(convertedUpfrontTotal, selectedCurrency)}
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <div className="text-white/70 text-xs mb-1">Total First Year</div>
                    <div className="text-xl font-bold text-white">
                      {formatCurrency(convertedFirstYearTotal, selectedCurrency)}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      ) : null}

      {/* Your Financial Balance Card - Separate card below */}
      {!isComparisonMode && primaryScenario.targetCity && (
        <div className="mt-6 backdrop-blur-sm bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Your Financial Balance
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/80 text-sm">Total Monthly Costs</span>
              <span className="text-white font-semibold text-lg">
                {formatCurrency(convertedMonthlyTotal, selectedCurrency)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/80 text-sm">Net Job Income</span>
              <span className="text-white font-semibold text-lg">
                {formatCurrency(convertedNetMonthlyIncome, selectedCurrency)}
              </span>
            </div>

            <div className="pt-4 border-t-2 border-white/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/90 text-base font-medium">Remaining Amount to Cover</span>
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
                  ? '✓ Your job income covers all monthly expenses!'
                  : convertedRemainingBudget <= 200
                  ? '⚠ Small gap - consider additional funding (parents, scholarships, blocked account)'
                  : '✗ Significant gap - you will need additional funding sources (parents, scholarships, blocked account) to cover monthly expenses'}
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
            Financial Planning
          </h2>

          {/* Job Type Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-3">Job Type</label>
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
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  primaryScenario.jobType === 'minijob'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                Minijob
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
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  primaryScenario.jobType === 'working_student'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                Working Student
              </button>
            </div>
          </div>

          {/* Job Rules Info Box */}
          <div className="mb-6 backdrop-blur-sm bg-blue-950/30 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-blue-200">Job Rules & Limits</h4>
                {primaryScenario.jobType === 'minijob' ? (
                  <ul className="text-xs text-blue-200/90 space-y-1 leading-relaxed">
                    <li>• <strong>Minijob:</strong> Up to €538/month (hard cap). Usually tax-free with no social security deductions.</li>
                    <li>• Perfect for students who want simple, tax-free income.</li>
                  </ul>
                ) : (
                  <ul className="text-xs text-blue-200/90 space-y-1 leading-relaxed">
                    <li>• <strong>Working Student:</strong> Up to 20 hours/week during semester. Default minimum wage: €12.41/hour.</li>
                    <li>• Approx. 10% deduction for pension insurance. Health insurance paid separately at student rate.</li>
                    <li>• May affect tax-free allowance (Grundfreibetrag).</li>
                  </ul>
                )}
                <p className="text-xs text-blue-200/80 pt-2 border-t border-blue-500/20">
                  <strong>Legal Limit for International Students:</strong> 140 full days or 280 half-days per year.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Hours per Week Input */}
            <div>
              <label className="block text-xs text-white/70 mb-2">
                Hours per week {primaryScenario.jobType === 'working_student' ? '(Max: 20 for students)' : '(Will be capped at €538/month)'}
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
                    <span>0h</span>
                    <span>20h</span>
                  </div>
                </>
              )}
              {primaryScenario.jobType === 'minijob' && (
                <p className="text-xs text-white/50 mt-1">
                  Minijob earnings are capped at €538/month regardless of hours worked.
                </p>
              )}
            </div>

            {/* Hourly Wage Input */}
            <div>
              <label className="block text-xs text-white/70 mb-2">
                Hourly Wage (€)
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
                Current German minimum wage: €12.41/hour (2024/25)
              </p>
            </div>

            {/* Income Breakdown */}
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">Gross Monthly Income</span>
                <span className="text-white font-semibold">
                  {formatCurrency(convertedGrossMonthlyIncome, selectedCurrency)}
                </span>
              </div>
              {primaryScenario.jobType === 'working_student' && primaryCalculated.grossMonthlyIncome > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50">
                    Less social security (10% pension insurance)
                  </span>
                  <span className="text-white/50">
                    -{formatCurrency((primaryCalculated.grossMonthlyIncome * 0.10) * conversionRate, selectedCurrency)}
                  </span>
                </div>
              )}
              {primaryScenario.jobType === 'minijob' && primaryCalculated.grossMonthlyIncome >= 538 && (
                <div className="flex justify-between items-center text-xs text-yellow-400/80">
                  <span>Capped at €538/month (Minijob limit)</span>
                  <span>—</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm font-medium">Net Monthly Income</span>
                  <span className="text-white font-bold">
                    {formatCurrency(convertedNetMonthlyIncome, selectedCurrency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Your Financial Balance Card - Separate card below */}
      {!isComparisonMode && primaryScenario.targetCity && (
        <div className="mt-6 backdrop-blur-sm bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Your Financial Balance
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/80 text-sm">Total Monthly Costs</span>
              <span className="text-white font-semibold text-lg">
                {formatCurrency(convertedMonthlyTotal, selectedCurrency)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/80 text-sm">Net Job Income</span>
              <span className="text-white font-semibold text-lg">
                {formatCurrency(convertedNetMonthlyIncome, selectedCurrency)}
              </span>
            </div>

            <div className="pt-4 border-t-2 border-white/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/90 text-base font-medium">Remaining Amount to Cover</span>
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
                  ? '✓ Your job income covers all monthly expenses!'
                  : convertedRemainingBudget <= 200
                  ? '⚠ Small gap - consider additional funding (parents, scholarships, blocked account)'
                  : '✗ Significant gap - you will need additional funding sources (parents, scholarships, blocked account) to cover monthly expenses'}
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
            Financial Planning
          </h2>

          {/* Job Type Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-3">Job Type</label>
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
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  primaryScenario.jobType === 'minijob'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                Minijob
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
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  primaryScenario.jobType === 'working_student'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                Working Student
              </button>
            </div>
          </div>

          {/* Job Rules Info Box */}
          <div className="mb-6 backdrop-blur-sm bg-blue-950/30 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-blue-200">Job Rules & Limits</h4>
                {primaryScenario.jobType === 'minijob' ? (
                  <ul className="text-xs text-blue-200/90 space-y-1 leading-relaxed">
                    <li>• <strong>Minijob:</strong> Up to €538/month (hard cap). Usually tax-free with no social security deductions.</li>
                    <li>• Perfect for students who want simple, tax-free income.</li>
                  </ul>
                ) : (
                  <ul className="text-xs text-blue-200/90 space-y-1 leading-relaxed">
                    <li>• <strong>Working Student:</strong> Up to 20 hours/week during semester. Default minimum wage: €12.41/hour.</li>
                    <li>• Approx. 10% deduction for pension insurance. Health insurance paid separately at student rate.</li>
                    <li>• May affect tax-free allowance (Grundfreibetrag).</li>
                  </ul>
                )}
                <p className="text-xs text-blue-200/80 pt-2 border-t border-blue-500/20">
                  <strong>Legal Limit for International Students:</strong> 140 full days or 280 half-days per year.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Hours per Week Input */}
            <div>
              <label className="block text-xs text-white/70 mb-2">
                Hours per week {primaryScenario.jobType === 'working_student' ? '(Max: 20 for students)' : '(Will be capped at €538/month)'}
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
                    <span>0h</span>
                    <span>20h</span>
                  </div>
                </>
              )}
              {primaryScenario.jobType === 'minijob' && (
                <p className="text-xs text-white/50 mt-1">
                  Minijob earnings are capped at €538/month regardless of hours worked.
                </p>
              )}
            </div>

            {/* Hourly Wage Input */}
            <div>
              <label className="block text-xs text-white/70 mb-2">
                Hourly Wage (€)
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
                Current German minimum wage: €12.41/hour (2024/25)
              </p>
            </div>

            {/* Income Breakdown */}
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">Gross Monthly Income</span>
                <span className="text-white font-semibold">
                  {formatCurrency(convertedGrossMonthlyIncome, selectedCurrency)}
                </span>
              </div>
              {primaryScenario.jobType === 'working_student' && primaryCalculated.grossMonthlyIncome > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50">
                    Less social security (10% pension insurance)
                  </span>
                  <span className="text-white/50">
                    -{formatCurrency((primaryCalculated.grossMonthlyIncome * 0.10) * conversionRate, selectedCurrency)}
                  </span>
                </div>
              )}
              {primaryScenario.jobType === 'minijob' && primaryCalculated.grossMonthlyIncome >= 538 && (
                <div className="flex justify-between items-center text-xs text-yellow-400/80">
                  <span>Capped at €538/month (Minijob limit)</span>
                  <span>—</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm font-medium">Net Monthly Income</span>
                  <span className="text-white font-bold">
                    {formatCurrency(convertedNetMonthlyIncome, selectedCurrency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Your Financial Balance Card - Separate card below */}
      {!isComparisonMode && primaryScenario.targetCity && (
        <div className="mt-6 backdrop-blur-sm bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Your Financial Balance
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/80 text-sm">Total Monthly Costs</span>
              <span className="text-white font-semibold text-lg">
                {formatCurrency(convertedMonthlyTotal, selectedCurrency)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/80 text-sm">Net Job Income</span>
              <span className="text-white font-semibold text-lg">
                {formatCurrency(convertedNetMonthlyIncome, selectedCurrency)}
              </span>
            </div>

            <div className="pt-4 border-t-2 border-white/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/90 text-base font-medium">Remaining Amount to Cover</span>
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
                  ? '✓ Your job income covers all monthly expenses!'
                  : convertedRemainingBudget <= 200
                  ? '⚠ Small gap - consider additional funding (parents, scholarships, blocked account)'
                  : '✗ Significant gap - you will need additional funding sources (parents, scholarships, blocked account) to cover monthly expenses'}
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
            Financial Planning
          </h2>

          {/* Job Type Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-3">Job Type</label>
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
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  primaryScenario.jobType === 'minijob'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                Minijob
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
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  primaryScenario.jobType === 'working_student'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                Working Student
              </button>
            </div>
          </div>

          {/* Job Rules Info Box */}
          <div className="mb-6 backdrop-blur-sm bg-blue-950/30 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-blue-200">Job Rules & Limits</h4>
                {primaryScenario.jobType === 'minijob' ? (
                  <ul className="text-xs text-blue-200/90 space-y-1 leading-relaxed">
                    <li>• <strong>Minijob:</strong> Up to €538/month (hard cap). Usually tax-free with no social security deductions.</li>
                    <li>• Perfect for students who want simple, tax-free income.</li>
                  </ul>
                ) : (
                  <ul className="text-xs text-blue-200/90 space-y-1 leading-relaxed">
                    <li>• <strong>Working Student:</strong> Up to 20 hours/week during semester. Default minimum wage: €12.41/hour.</li>
                    <li>• Approx. 10% deduction for pension insurance. Health insurance paid separately at student rate.</li>
                    <li>• May affect tax-free allowance (Grundfreibetrag).</li>
                  </ul>
                )}
                <p className="text-xs text-blue-200/80 pt-2 border-t border-blue-500/20">
                  <strong>Legal Limit for International Students:</strong> 140 full days or 280 half-days per year.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Hours per Week Input */}
            <div>
              <label className="block text-xs text-white/70 mb-2">
                Hours per week {primaryScenario.jobType === 'working_student' ? '(Max: 20 for students)' : '(Will be capped at €538/month)'}
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
                    <span>0h</span>
                    <span>20h</span>
                  </div>
                </>
              )}
              {primaryScenario.jobType === 'minijob' && (
                <p className="text-xs text-white/50 mt-1">
                  Minijob earnings are capped at €538/month regardless of hours worked.
                </p>
              )}
            </div>

            {/* Hourly Wage Input */}
            <div>
              <label className="block text-xs text-white/70 mb-2">
                Hourly Wage (€)
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
                Current German minimum wage: €12.41/hour (2024/25)
              </p>
            </div>

            {/* Income Breakdown */}
            <div className="bg-white/5 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white/70 text-sm">Gross Monthly Income</span>
                <span className="text-white font-semibold">
                  {formatCurrency(convertedGrossMonthlyIncome, selectedCurrency)}
                </span>
              </div>
              {primaryScenario.jobType === 'working_student' && primaryCalculated.grossMonthlyIncome > 0 && (
                <div className="flex justify-between items-center text-xs">
                  <span className="text-white/50">
                    Less social security (10% pension insurance)
                  </span>
                  <span className="text-white/50">
                    -{formatCurrency((primaryCalculated.grossMonthlyIncome * 0.10) * conversionRate, selectedCurrency)}
                  </span>
                </div>
              )}
              {primaryScenario.jobType === 'minijob' && primaryCalculated.grossMonthlyIncome >= 538 && (
                <div className="flex justify-between items-center text-xs text-yellow-400/80">
                  <span>Capped at €538/month (Minijob limit)</span>
                  <span>—</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm font-medium">Net Monthly Income</span>
                  <span className="text-white font-bold">
                    {formatCurrency(convertedNetMonthlyIncome, selectedCurrency)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Your Financial Balance Card - Separate card below */}
      {!isComparisonMode && primaryScenario.targetCity && (
        <div className="mt-6 backdrop-blur-sm bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/20 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Your Financial Balance
          </h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/80 text-sm">Total Monthly Costs</span>
              <span className="text-white font-semibold text-lg">
                {formatCurrency(convertedMonthlyTotal, selectedCurrency)}
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-white/10">
              <span className="text-white/80 text-sm">Net Job Income</span>
              <span className="text-white font-semibold text-lg">
                {formatCurrency(convertedNetMonthlyIncome, selectedCurrency)}
              </span>
            </div>

            <div className="pt-4 border-t-2 border-white/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/90 text-base font-medium">Remaining Amount to Cover</span>
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
                  ? '✓ Your job income covers all monthly expenses!'
                  : convertedRemainingBudget <= 200
                  ? '⚠ Small gap - consider additional funding (parents, scholarships, blocked account)'
                  : '✗ Significant gap - you will need additional funding sources (parents, scholarships, blocked account) to cover monthly expenses'}
              </p>
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
              Scenario A: {primaryScenario.targetCity || 'Select city'}
            </h3>
            <div className="space-y-4">
              <SearchableCombobox
                options={COUNTRY_OPTIONS}
                value={primaryScenario.originCountry}
                onChange={(value) => setPrimaryScenario(prev => ({ ...prev, originCountry: value }))}
                placeholder="Search for your country..."
                icon={<Plane className="w-4 h-4" />}
                label="Where are you coming from?"
                cardZIndex={150}
              />
              <SearchableCombobox
                options={CITY_OPTIONS}
                value={primaryScenario.targetCity}
                onChange={(value) => setPrimaryScenario(prev => ({ ...prev, targetCity: value }))}
                placeholder="Search for a German university city..."
                icon={<MapPin className="w-4 h-4" />}
                label="Where do you want to study?"
                cardZIndex={140}
              />
              {primaryScenario.targetCity && (
                <SearchableCombobox<string>
                  options={availableUniversities}
                  value={primaryScenario.selectedUniversity}
                  onChange={(value) => setPrimaryScenario(prev => ({ ...prev, selectedUniversity: value }))}
                  placeholder="Search for a university..."
                  icon={<GraduationCap className="w-4 h-4" />}
                  label="Which university do you want to attend?"
                  cardZIndex={130}
                />
              )}
            </div>
            <div className="backdrop-blur-sm bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/20 rounded-xl p-4 sm:p-6 relative">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Cost Breakdown
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
                  <div className="text-white/70 text-sm mb-2">Monthly Total</div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(primaryCalculated.monthlyTotal * conversionRate, selectedCurrency)}
                  </div>
                </div>
                <div>
                  <div className="text-white/70 text-sm mb-2">Annual Total</div>
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
              Scenario B: {comparisonScenario.targetCity || 'Select city'}
            </h3>
            <div className="space-y-4">
              <SearchableCombobox
                options={COUNTRY_OPTIONS}
                value={comparisonScenario.originCountry}
                onChange={(value) => setComparisonScenario(prev => ({ ...prev, originCountry: value }))}
                placeholder="Search for your country..."
                icon={<Plane className="w-4 h-4" />}
                label="Where are you coming from?"
                cardZIndex={100}
              />
              <SearchableCombobox
                options={CITY_OPTIONS}
                value={comparisonScenario.targetCity}
                onChange={(value) => setComparisonScenario(prev => ({ ...prev, targetCity: value }))}
                placeholder="Search for a German university city..."
                icon={<MapPin className="w-4 h-4" />}
                label="Where do you want to study?"
                cardZIndex={90}
              />
              {comparisonScenario.targetCity && (
                <SearchableCombobox<string>
                  options={comparisonAvailableUniversities}
                  value={comparisonScenario.selectedUniversity}
                  onChange={(value) => setComparisonScenario(prev => ({ ...prev, selectedUniversity: value }))}
                  placeholder="Search for a university..."
                  icon={<GraduationCap className="w-4 h-4" />}
                  label="Which university do you want to attend?"
                  cardZIndex={80}
                />
              )}

              {/* Accommodation Warning for Comparison City */}
              {comparisonScenario.targetCity && highDemandCities.includes(comparisonScenario.targetCity) && (
                <div className="backdrop-blur-sm bg-yellow-950/30 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-200 mb-1">Housing Warning</h4>
                      <p className="text-xs text-yellow-200/90 leading-relaxed">
                        Note: Housing in {comparisonScenario.targetCity} is extremely scarce. We recommend starting your search 4-6 months before arrival.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="backdrop-blur-sm bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-white/20 rounded-xl p-4 sm:p-6 relative">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Cost Breakdown
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
                  <div className="text-white/70 text-sm mb-2">Monthly Total</div>
                  <div className="text-2xl font-bold text-white">
                    {formatCurrency(comparisonCalculated.monthlyTotal * conversionRate, selectedCurrency)}
                  </div>
                </div>
                <div>
                  <div className="text-white/70 text-sm mb-2">Annual Total</div>
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
            <label className="block text-xs text-white/60 mb-2 text-center">Display Currency (Advanced)</label>
            <CurrencySelector value={selectedCurrency} onChange={setSelectedCurrency} />
          {isLoadingRates && (
            <div className="mt-2 flex items-center gap-2 text-white/50 text-xs justify-center">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading exchange rates...</span>
            </div>
          )}
          {!isLoadingRates && !apiError && exchangeRates && (
            <p className="mt-2 text-white/40 text-xs text-center">
              Live rates provided by{' '}
              <a
                href="https://www.frankfurter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-1"
              >
                Frankfurter API
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          )}
          {apiError && (
            <p className="mt-2 text-yellow-400/70 text-xs text-center">
              Using default rates. API unavailable.
            </p>
          )}
          </div>
        </div>
      )}

      {/* Your Next Steps Checklist */}
      <div className="mt-12 mb-6">
        <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Your Next Steps</h2>
            <p className="text-white/70 text-sm">
              Track your progress as you prepare to study in Germany
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white/80 text-sm font-medium">Progress</span>
              <span className="text-white/60 text-sm">
                {visibleChecklistItems.filter(item => checklistState[item.id]).length} / {visibleChecklistItems.length} completed
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
                      
                    {/* Affiliate Link (more prominent button style) */}
                    {item.affiliateLink && !item.affiliateLink.startsWith('YOUR_') && (
                      <a
                        href={item.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs font-medium rounded-lg transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Track affiliate link click
                          trackEvent('click_affiliate_link', 'Checklist', item.label || item.id);
                        }}
                      >
                        <span>{item.affiliateLinkLabel || 'Compare & Open'}</span>
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
                              <h4 className="text-sm font-semibold text-white mb-2">How to:</h4>
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
                Reset checklist
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}