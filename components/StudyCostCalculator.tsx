'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Plane, Shield, Building, Euro, Info, Search, ChevronDown, Loader2, ExternalLink, GraduationCap } from 'lucide-react';

type CurrencyCode = 'EUR' | 'USD' | 'INR' | 'CNY' | 'GBP';

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
}

const UNIVERSITIES: University[] = [
  { name: 'TU Munich', city: 'Munich', semesterFee: 147 },
  { name: 'LMU Munich', city: 'Munich', semesterFee: 142 },
  { name: 'HU Berlin', city: 'Berlin', semesterFee: 315 },
  { name: 'FU Berlin', city: 'Berlin', semesterFee: 315 },
  { name: 'TU Berlin', city: 'Berlin', semesterFee: 314 },
  { name: 'Heidelberg University', city: 'Heidelberg', semesterFee: 185 },
  { name: 'University of Hamburg', city: 'Hamburg', semesterFee: 335 },
  { name: 'TU Darmstadt', city: 'Darmstadt', semesterFee: 285 },
  { name: 'University of Cologne', city: 'Cologne', semesterFee: 321 },
  { name: 'RWTH Aachen', city: 'Aachen', semesterFee: 304 },
  { name: 'University of Bonn', city: 'Bonn', semesterFee: 299 },
  { name: 'TU Dresden', city: 'Dresden', semesterFee: 275 },
  { name: 'University of Stuttgart', city: 'Stuttgart', semesterFee: 170 },
  { name: 'KIT Karlsruhe', city: 'Karlsruhe', semesterFee: 162 },
  { name: 'University of Tübingen', city: 'Tübingen', semesterFee: 176 },
  { name: 'University of Freiburg', city: 'Freiburg', semesterFee: 186 },
  { name: 'University of Münster', city: 'Münster', semesterFee: 311 },
  { name: 'FAU Erlangen-Nürnberg', city: 'Erlangen', semesterFee: 142 },
  { name: 'University of Göttingen', city: 'Göttingen', semesterFee: 377 },
  { name: 'TU Braunschweig', city: 'Braunschweig', semesterFee: 374 },
  { name: 'University of Mannheim', city: 'Mannheim', semesterFee: 187 },
  { name: 'University of Konstanz', city: 'Konstanz', semesterFee: 177 },
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
    blockedAccountMonthly: 934,
    blockedAccountYearly: 11208,
    healthInsurancePublic: 120,
    healthInsurancePrivate: 80,
    livingExpenses: 400,
  },
} as const;

type City = keyof typeof STUDY_DATA.CITIES;
type OriginCountry = keyof typeof STUDY_DATA.ORIGIN_COUNTRIES;
type InsuranceType = 'public' | 'private';

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
    console.log("Dropdown toggled. Current state:", !isOpen);
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
            className="bg-slate-900 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl max-h-60 overflow-y-auto z-[100] pointer-events-auto"
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
            className="bg-slate-900 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl p-4 z-[100] pointer-events-auto"
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
      <div className={`backdrop-blur-md bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative ${zIndexClass}`}>
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

// Currency Selector Component
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
        className="w-full backdrop-blur-md bg-slate-950/80 border border-white/20 rounded-lg px-3 py-2 text-white/90 text-sm font-medium hover:bg-slate-950/90 transition-all duration-200 flex items-center justify-between relative z-10"
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
          className="absolute top-full left-0 w-full mt-2 backdrop-blur-md bg-slate-950/95 border border-white/20 rounded-lg shadow-2xl overflow-hidden pointer-events-auto z-[9999]"
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

export default function StudyCostCalculator() {
  const [originCountry, setOriginCountry] = useState<OriginCountry | ''>('');
  const [targetCity, setTargetCity] = useState<City | ''>('');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [insuranceType, setInsuranceType] = useState<InsuranceType>('public');
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('EUR');
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [showInsuranceInfo, setShowInsuranceInfo] = useState(false);

  // Filter universities based on selected city
  const availableUniversities = useMemo(() => {
    if (!targetCity) return [];
    return STUDY_DATA.UNIVERSITIES
      .filter(u => u.city === targetCity)
      .map(u => u.name);
  }, [targetCity]);

  // Get selected university data
  const selectedUniversityData = useMemo(() => {
    if (!selectedUniversity) return null;
    return STUDY_DATA.UNIVERSITIES.find(u => u.name === selectedUniversity);
  }, [selectedUniversity]);

  // Reset university when city changes
  useEffect(() => {
    if (targetCity && selectedUniversity) {
      const universityInCity = STUDY_DATA.UNIVERSITIES.find(
        u => u.name === selectedUniversity && u.city === targetCity
      );
      if (!universityInCity) {
        setSelectedUniversity('');
      }
    } else if (!targetCity) {
      setSelectedUniversity('');
    }
  }, [targetCity, selectedUniversity]);

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

  // Calculate costs based on selections
  const visaFee = originCountry ? STUDY_DATA.ORIGIN_COUNTRIES[originCountry] : 0;
  const monthlyRent = targetCity ? STUDY_DATA.CITIES[targetCity] : 0;
  const monthlyInsurance = insuranceType === 'public' 
    ? STUDY_DATA.FIXED_COSTS.healthInsurancePublic 
    : STUDY_DATA.FIXED_COSTS.healthInsurancePrivate;
  
  // Semester fee (monthly pro rata - divided by 6 months per semester)
  const semesterFeeMonthly = selectedUniversityData ? selectedUniversityData.semesterFee / 6 : 0;
  
  // Upfront costs (one-time)
  const blockedAccountTotal = STUDY_DATA.FIXED_COSTS.blockedAccountYearly;
  const upfrontTotal = visaFee + blockedAccountTotal;

  // Monthly costs
  const monthlyLivingExpenses = STUDY_DATA.FIXED_COSTS.livingExpenses;
  const monthlyTotal = monthlyRent + monthlyInsurance + monthlyLivingExpenses + semesterFeeMonthly;

  // Annual costs (12 months)
  const annualTotal = monthlyTotal * 12;

  // Convert to selected currency
  const convertedMonthlyTotal = monthlyTotal * conversionRate;
  const convertedAnnualTotal = annualTotal * conversionRate;
  const convertedUpfrontTotal = upfrontTotal * conversionRate;
  const convertedFirstYearTotal = (annualTotal + upfrontTotal) * conversionRate;

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4 relative">
          {/* Origin Country Combobox */}
          <SearchableCombobox
            options={COUNTRY_OPTIONS}
            value={originCountry}
            onChange={(value) => setOriginCountry(value)}
            placeholder="Search for your country..."
            icon={<Plane className="w-4 h-4" />}
            label="Where are you coming from?"
            cardZIndex={100}
          />

          {/* Target City Combobox */}
          <SearchableCombobox
            options={CITY_OPTIONS}
            value={targetCity}
            onChange={(value) => setTargetCity(value)}
            placeholder="Search for a German university city..."
            icon={<MapPin className="w-4 h-4" />}
            label="Where do you want to study?"
            cardZIndex={90}
          />

          {/* University Combobox */}
          {targetCity && (
            <SearchableCombobox<string>
              options={availableUniversities}
              value={selectedUniversity}
              onChange={(value) => setSelectedUniversity(value)}
              placeholder="Search for a university..."
              icon={<GraduationCap className="w-4 h-4" />}
              label="Which university do you want to attend?"
              cardZIndex={80}
            />
          )}

          {/* Health Insurance Type Radio */}
          <div className="backdrop-blur-md bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200 relative z-[10]">
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
                  checked={insuranceType === 'public'}
                  onChange={(e) => setInsuranceType(e.target.value as InsuranceType)}
                  className="w-4 h-4 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-white/80">Public</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="insurance"
                  value="private"
                  checked={insuranceType === 'private'}
                  onChange={(e) => setInsuranceType(e.target.value as InsuranceType)}
                  className="w-4 h-4 text-blue-600 bg-black/40 border-white/20 focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-white/80">Private</span>
              </label>
            </div>
            <p className="text-white/50 text-xs mt-2">
              Average monthly price: {formatCurrency(monthlyInsurance)}
            </p>
          </div>
        </div>

        {/* Result Dashboard */}
        <div className="lg:col-span-1 relative z-[10]">
          <div className="backdrop-blur-md bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/20 rounded-xl p-6 sticky top-6 relative z-[10]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Cost Breakdown
              </h2>
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
                    {originCountry ? formatCurrency(visaFee * conversionRate, selectedCurrency) : '—'}
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
                      {originCountry ? formatCurrency(convertedUpfrontTotal, selectedCurrency) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

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
            {targetCity && (
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
    </div>
  );
}