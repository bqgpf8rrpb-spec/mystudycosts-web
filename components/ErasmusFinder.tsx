'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import {
  GraduationCap,
  Book,
  MapPin,
  ChevronDown,
  Search,
  X,
  Euro,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Info,
} from 'lucide-react';
import erasmusPartnersData from '@/data/erasmus-partners.json';
import universitiesData from '@/data/universities.json';
import { calculateMonthlyCosts } from '@/lib/costs';
import { getErasmusGrant } from '@/lib/erasmus-grants';
import { BAFOEG_ERASMUS_ADDON } from '@/lib/bafoeg-logic';
import { formatCurrency as formatCurrencyUtil } from '@/lib/format';
import { useErasmusStore } from '@/lib/store/useErasmusStore';
import AffiliateLabel from '@/components/AffiliateLabel';

// Dynamically import the map component to avoid SSR issues
const ErasmusMap = dynamic(() => import('@/components/ErasmusMap'), {
  ssr: false,
  loading: () => (
    <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 text-center h-[500px] flex items-center justify-center">
      <div className="text-white/60 text-sm">Loading map...</div>
    </div>
  ),
});

import type { PartnerUniversity, ErasmusPartnerData } from '@/data/erasmus-types';
import type { University } from '@/types/university';

interface CostComparison {
  partner: PartnerUniversity;
  targetCityMonthlyCost: number;
  erasmusGrant: number;
  erasmusGrantGroup: 1 | 2 | 3;
  auslandsBafoeg: number;
  netTargetCityCost: number; // Target city cost - grants
  homeCityMonthlyCost: number; // German university city cost
  costDifference: number; // netTargetCityCost - homeCityMonthlyCost
  isCheaper: boolean;
}

export default function ErasmusFinder() {
  const t = useTranslations('Erasmus');
  const tBAfoeg = useTranslations('BAfoeg');
  const { selectedUniversity, selectedProgram, hasBAfoeg, setSelection, setHasBAfoeg, clearSelection } = useErasmusStore();
  const selectedSubject = selectedProgram; // Alias for this component's flow
  
  // State for autocomplete/dropdowns
  const [universitySearch, setUniversitySearch] = useState<string>('');
  const [universityDropdownOpen, setUniversityDropdownOpen] = useState(false);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  
  // Refs for dropdowns
  const universityContainerRef = useRef<HTMLDivElement>(null);
  const subjectContainerRef = useRef<HTMLDivElement>(null);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (universityContainerRef.current && !universityContainerRef.current.contains(event.target as Node)) {
        setUniversityDropdownOpen(false);
      }
      if (subjectContainerRef.current && !subjectContainerRef.current.contains(event.target as Node)) {
        setSubjectDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Get all unique German universities from erasmus data
  const allGermanUniversities = useMemo(() => {
    const unis = new Set<string>();
    (erasmusPartnersData as ErasmusPartnerData[]).forEach((entry) => {
      if (entry.germanUniversity) {
        unis.add(entry.germanUniversity);
      }
    });
    return Array.from(unis).sort();
  }, []);
  
  // Filter universities based on search
  const filteredUniversities = useMemo(() => {
    if (!universitySearch.trim()) {
      return allGermanUniversities.slice(0, 50); // Show first 50 by default
    }
    const searchLower = universitySearch.toLowerCase();
    return allGermanUniversities
      .filter((uni) => uni.toLowerCase().includes(searchLower))
      .slice(0, 50);
  }, [allGermanUniversities, universitySearch]);
  
  // Get available subjects for selected university
  const availableSubjects = useMemo(() => {
    if (!selectedUniversity) return [];
    
    const subjects = new Set<string>();
    (erasmusPartnersData as ErasmusPartnerData[]).forEach((entry) => {
      if (entry.germanUniversity === selectedUniversity && entry.courseOfStudy) {
        subjects.add(entry.courseOfStudy);
      }
    });
    return Array.from(subjects).sort();
  }, [selectedUniversity]);
  
  // Get filtered partners based on selection
  const filteredPartners = useMemo(() => {
    if (!selectedUniversity || !selectedSubject) return [];
    
    const entry = (erasmusPartnersData as ErasmusPartnerData[]).find(
      (e) => e.germanUniversity === selectedUniversity && e.courseOfStudy === selectedSubject
    );
    
    const partners = entry?.partners;
    return Array.isArray(partners) ? partners : [];
  }, [selectedUniversity, selectedSubject]);
  
  // Calculate cost comparisons
  const costComparisons = useMemo((): CostComparison[] => {
    if (!selectedUniversity || filteredPartners.length === 0) return [];
    
    // Get German university city for home cost calculation
    const germanUni = (universitiesData as University[]).find(
      (u) => u.name === selectedUniversity
    );
    const homeCity = germanUni?.city || 'Berlin'; // Default to Berlin if not found
    
    // Calculate home city monthly cost
    const homeCostData = calculateMonthlyCosts(homeCity, 20, true);
    const homeCityMonthlyCost = homeCostData.total;
    
    return filteredPartners.map((partner) => {
      const grantInfo = getErasmusGrant(partner.country);
      const auslandsBafoeg = hasBAfoeg ? BAFOEG_ERASMUS_ADDON : 0;
      const totalGrant = grantInfo.amount + auslandsBafoeg;
      
      const targetCityMonthlyCost = partner.monthlyLivingCost;
      const netTargetCityCost = Math.max(0, targetCityMonthlyCost - totalGrant);
      const costDifference = netTargetCityCost - homeCityMonthlyCost;
      
      return {
        partner,
        targetCityMonthlyCost,
        erasmusGrant: grantInfo.amount,
        erasmusGrantGroup: grantInfo.group,
        auslandsBafoeg,
        netTargetCityCost,
        homeCityMonthlyCost,
        costDifference,
        isCheaper: costDifference < 0,
      };
    });
  }, [filteredPartners, selectedUniversity, hasBAfoeg]);
  
  // Check if we have private partners (for affiliate label)
  // Private universities often have keywords like "private", "school", "college", "business", "applied sciences"
  // Also check if selected university is a private one
  const hasPrivatePartners = useMemo(() => {
    if (!selectedUniversity) return false;
    
    // Check if selected university is a private one
    const selectedUniData = (universitiesData as University[]).find(
      (u) => u.name === selectedUniversity
    );
    
    const isSelectedUniPrivate = selectedUniData?.type === 'private';
    
    // Check partner universities for private indicators
    const hasPrivatePartnerIndicators = filteredPartners.some((partner) => {
      const partnerNameLower = partner.name.toLowerCase();
      const privateKeywords = [
        'private',
        'school',
        'business school',
        'college',
        'applied sciences',
        'hochschule',
        'fachhochschule',
        'university of applied sciences',
      ];
      return privateKeywords.some((keyword) => partnerNameLower.includes(keyword));
    });
    
    return isSelectedUniPrivate || hasPrivatePartnerIndicators || costComparisons.length > 0;
  }, [costComparisons, selectedUniversity, filteredPartners]);
  
  const handleUniversitySelect = (uni: string) => {
    setSelection({ university: uni, program: '', partner: null, hasBAfoeg });
    setUniversitySearch(uni);
    setUniversityDropdownOpen(false);
  };
  
  const handleSubjectSelect = (subject: string) => {
    setSelection({ university: selectedUniversity, program: subject, partner: null, hasBAfoeg });
    setSubjectDropdownOpen(false);
  };
  
  const formatCurrency = (amount: number): string =>
    formatCurrencyUtil(amount, 'EUR');
  
  const hasResults = selectedUniversity && selectedSubject && filteredPartners.length > 0;
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-24">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Erasmus Partner Finder</h1>
        <p className="text-white/70 text-sm">
          Find Erasmus partner universities and compare costs for your semester abroad
        </p>
      </div>
      
      {/* Step-by-Step Form */}
      <div className="space-y-6 mb-8">
        {/* Step 1: University Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Where do you study?
          </label>
          <div ref={universityContainerRef} className="relative">
            <div
              onClick={() => setUniversityDropdownOpen(!universityDropdownOpen)}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg cursor-pointer hover:border-cyan-500/50 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1">
                <GraduationCap className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <input
                  type="text"
                  value={universitySearch}
                  onChange={(e) => {
                    setUniversitySearch(e.target.value);
                    setUniversityDropdownOpen(true);
                  }}
                  onFocus={() => setUniversityDropdownOpen(true)}
                  placeholder="Search for your university..."
                  className="bg-transparent border-none outline-none text-white placeholder-slate-500 w-full"
                />
              </div>
              {selectedUniversity && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelection();
                    setUniversitySearch('');
                  }}
                  className="ml-2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${universityDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
            
            {universityDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                {filteredUniversities.length > 0 ? (
                  filteredUniversities.map((uni) => (
                    <div
                      key={uni}
                      onClick={() => handleUniversitySelect(uni)}
                      className={`px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors ${
                        selectedUniversity === uni ? 'bg-slate-800 border-l-2 border-cyan-500' : ''
                      }`}
                    >
                      <div className="text-white text-sm">{uni}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-slate-400 text-sm">No universities found</div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Step 2: Subject Selection */}
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            What is your subject?
          </label>
          <div ref={subjectContainerRef} className="relative">
            <div
              onClick={() => {
                if (selectedUniversity && availableSubjects.length > 0) {
                  setSubjectDropdownOpen(!subjectDropdownOpen);
                }
              }}
              className={`w-full px-4 py-3 bg-slate-900/50 border rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                selectedUniversity && availableSubjects.length > 0
                  ? 'border-slate-700 hover:border-cyan-500/50'
                  : 'border-slate-700/50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <Book className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <span className={selectedSubject ? 'text-white' : 'text-slate-500'}>
                  {selectedSubject || 'Select a subject...'}
                </span>
              </div>
              {selectedSubject && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelection({ university: selectedUniversity, program: '', partner: null, hasBAfoeg });
                  }}
                  className="ml-2 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${subjectDropdownOpen ? 'rotate-180' : ''}`} />
            </div>
            
            {subjectDropdownOpen && selectedUniversity && availableSubjects.length > 0 && (
              <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                {availableSubjects.map((subject) => (
                  <div
                    key={subject}
                    onClick={() => handleSubjectSelect(subject)}
                    className={`px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors ${
                      selectedSubject === subject ? 'bg-slate-800 border-l-2 border-cyan-500' : ''
                    }`}
                  >
                    <div className="text-white text-sm">{subject}</div>
                  </div>
                ))}
              </div>
            )}
            
            {!selectedUniversity && (
              <p className="mt-2 text-xs text-slate-500">
                Please select a university first
              </p>
            )}
            {selectedUniversity && availableSubjects.length === 0 && (
              <p className="mt-2 text-xs text-slate-500">
                No subjects found for this university
              </p>
            )}
          </div>
        </div>
        
        {/* BAföG Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="bafoeg-toggle"
            checked={hasBAfoeg}
            onChange={(e) => setHasBAfoeg(e.target.checked)}
            className="w-4 h-4 text-cyan-600 bg-slate-900 border-slate-700 rounded focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
          />
          <label htmlFor="bafoeg-toggle" className="text-sm text-white cursor-pointer">
            {tBAfoeg('bafoegCheckboxWithAmount', { amount: BAFOEG_ERASMUS_ADDON })}
          </label>
        </div>
        
      </div>
      
      {/* Results Section */}
      {hasResults && (
        <div className="space-y-6">
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {filteredPartners.length} Partner Universities Found
            </h2>
          </div>
          
          {/* Map */}
          <div className="mb-8">
            <ErasmusMap partners={filteredPartners} />
          </div>
          
          {/* Partner List with Cost Comparison */}
          <div className="space-y-4">
            {costComparisons.map((comparison, index) => (
              <div
                key={`${comparison.partner.city}-${comparison.partner.country}-${index}`}
                className="p-6 bg-slate-900/50 border border-slate-700 rounded-xl hover:border-cyan-500/50 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Partner Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-xl font-bold text-white">{comparison.partner.name}</h3>
                    </div>
                    <p className="text-slate-400 text-sm mb-4">
                      {comparison.partner.city}, {comparison.partner.country}
                    </p>
                    
                    {/* Cost Breakdown */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Monthly Cost (Target City):</span>
                        <span className="text-white font-medium">{formatCurrency(comparison.targetCityMonthlyCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('erasmusGrantWithGroup', { group: t(`erasmusGrantGroup${comparison.erasmusGrantGroup}` as const) })}</span>
                        <span className="text-green-400 font-medium">-{formatCurrency(comparison.erasmusGrant)}</span>
                      </div>
                      {comparison.auslandsBafoeg > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Auslands-BAföG (Social Top-Up):</span>
                          <span className="text-green-400 font-medium">-{formatCurrency(comparison.auslandsBafoeg)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-slate-700">
                        <span className="text-slate-400">Net Cost (Target City):</span>
                        <span className="text-white font-bold">{formatCurrency(comparison.netTargetCityCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Monthly Cost (Home City):</span>
                        <span className="text-white font-medium">{formatCurrency(comparison.homeCityMonthlyCost)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Cost Difference */}
                  <div className={`md:w-48 md:text-right ${comparison.isCheaper ? 'text-green-400' : 'text-red-400'}`}>
                    <div className="flex items-center gap-2 md:justify-end mb-2">
                      {comparison.isCheaper ? (
                        <TrendingDown className="w-5 h-5" />
                      ) : (
                        <TrendingUp className="w-5 h-5" />
                      )}
                      <span className="text-sm font-medium">
                        {comparison.isCheaper ? 'Cheaper' : 'More Expensive'}
                      </span>
                    </div>
                    <div className={`text-2xl font-bold ${comparison.isCheaper ? 'text-green-400' : 'text-red-400'}`}>
                      {comparison.isCheaper ? '-' : '+'}{formatCurrency(Math.abs(comparison.costDifference))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">per month</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {selectedUniversity && selectedSubject && filteredPartners.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-white/70">
            No partner universities found for {selectedUniversity} - {selectedSubject}
          </p>
        </div>
      )}
      
      {/* Data Disclaimer - Erasmus & NC Values */}
      {(hasResults || (selectedUniversity && selectedSubject)) && (
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="backdrop-blur-sm bg-slate-950/50 border border-slate-800/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-slate-400/80 text-xs leading-relaxed">
                Wichtiger Hinweis: Die hier angezeigten Erasmus-Partnerschaften und NC-Werte basieren auf dem Datenstand von Januar 2026. Da sich Kooperationen zwischen Universitäten und Zulassungsbeschränkungen kurzfristig ändern können, sind alle Angaben ohne Gewähr. Für verbindliche Informationen konsultiere bitte das International Office deiner Hochschule oder die offizielle Website der Zieluniversität.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Affiliate Label - Ensure proper labeling for private universities/alternative paths */}
      {hasResults && hasPrivatePartners && (
        <div className="mt-6 flex items-center justify-center">
          <AffiliateLabel variant="subtle" />
        </div>
      )}
    </div>
  );
}

