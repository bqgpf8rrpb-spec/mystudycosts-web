'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { GraduationCap, Book, MapPin, ChevronDown, Check, Search, X, Euro, AlertCircle, Radio, Plane, CheckCircle, Info, Sparkles, Briefcase, Globe } from 'lucide-react';
import { getLocalizedCountryName, toCanonicalCountry, countryMatches } from '@/lib/country-i18n';
import AffiliateLabel from '@/components/AffiliateLabel';
import erasmusPartnersData from '@/data/erasmus-partners.json';
import universitiesData from '@/data/universities.json';
import universityProgramsData from '@/data/university_programs.json';
import { getProgramName, type StudyProgram } from '@/data/university-program-types';
import { getErasmusPartners } from '@/app/actions/getErasmusPartners';
import { getGermanUniversityId, getPartnersByGermanUniversity, getCityCostData } from '@/lib/erasmus-costs';
import { partnerMatchesProgram } from '@/lib/program-subject-mapping';
import type { ErasmusPartner } from '@/data/erasmus-partner-types';
import PartnerVerificationBadge, { getPartnerCardBorderClass } from '@/components/PartnerVerificationBadge';
import { BAFOEG_ERASMUS_ADDON } from '@/lib/bafoeg-logic';
import { DEFAULT_AVG_RENT_FALLBACK } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';

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
import { useErasmusStore } from '@/lib/store/useErasmusStore';

export default function ErasmusSelector() {
  const t = useTranslations('ErasmusSelector');
  const tBAfoeg = useTranslations('BAfoeg');
  const pathname = usePathname();
  const locale = (pathname?.split('/')[1] || 'de') as 'de' | 'en';

  const { selectedUniversity, selectedProgram, selectedPartner, hasBAfoeg, setSelection, setHasBAfoeg, clearSelection } = useErasmusStore();

  const [activityFilter, setActivityFilter] = useState<'study' | 'traineeship'>('study');
  const [countryFilterMode, setCountryFilterMode] = useState<'all' | 'specific'>('all');
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());

  // State for dropdowns
  const [universityDropdownOpen, setUniversityDropdownOpen] = useState(false);
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);

  // State for search queries
  const [universitySearch, setUniversitySearch] = useState('');
  const [programSearch, setProgramSearch] = useState('');

  // State for dropdown positions
  const [universityDropdownPosition, setUniversityDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [programDropdownPosition, setProgramDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [countryDropdownPosition, setCountryDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // State for country dropdown
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Supabase partners (fetched on mount, fallback to local JSON on error)
  const [supabasePartners, setSupabasePartners] = useState<Awaited<ReturnType<typeof getErasmusPartners>> | null>(null);
  const [supabaseFetched, setSupabaseFetched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getErasmusPartners()
      .then((data) => {
        if (!cancelled) {
          setSupabasePartners(data);
        }
      })
      .catch((err) => {
        console.warn('Supabase fetch failed, using local JSON fallback:', err);
        if (!cancelled) setSupabasePartners([]);
      })
      .finally(() => {
        if (!cancelled) setSupabaseFetched(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Refs for dropdown containers and triggers
  const universityContainerRef = useRef<HTMLDivElement>(null);
  const programContainerRef = useRef<HTMLDivElement>(null);
  const countryContainerRef = useRef<HTMLDivElement>(null);
  const universityTriggerRef = useRef<HTMLDivElement>(null);
  const programTriggerRef = useRef<HTMLDivElement>(null);
  const countryTriggerRef = useRef<HTMLDivElement>(null);

  // Get all German universities from the main dataset
  const allUniversities = useMemo(() => {
    return (universitiesData as University[]).map(u => ({
      name: u.name,
      city: u.city,
      type: (u.type || 'public') as 'public' | 'private',
      semesterFee: u.semesterFee || 0,
      avgRent: u.avgRent || DEFAULT_AVG_RENT_FALLBACK,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Get universities that have Erasmus partner data (for validation)
  const universitiesWithErasmusData = useMemo(() => {
    const unique = new Set<string>();
    (erasmusPartnersData as ErasmusPartnerData[]).forEach((data) => {
      unique.add(data.germanUniversity);
    });
    return unique;
  }, []);

  // Get available programs for selected university
  // First try to get from comprehensive university_programs.json, then fallback to erasmus-partners.json
  const programs = useMemo(() => {
    if (!selectedUniversity) return [];
    
    // Try to get programs from the comprehensive university_programs.json file
    const programsFromDatabase = (universityProgramsData as unknown as Record<string, string[] | StudyProgram[]>)[selectedUniversity];
    if (programsFromDatabase && programsFromDatabase.length > 0) {
      // Handle both old format (string[]) and new format (StudyProgram[])
      const programNames = programsFromDatabase.map(prog => 
        typeof prog === 'string' ? prog : prog.name
      );
      return programNames.sort();
    }
    
    // Fallback: Extract programs from erasmus-partners.json for universities not yet in the database
    const unique = new Set<string>();
    (erasmusPartnersData as ErasmusPartnerData[]).forEach((data) => {
      if (data.germanUniversity === selectedUniversity) {
        unique.add(data.courseOfStudy);
      }
    });
    return Array.from(unique).sort();
  }, [selectedUniversity]);

  // Get available partners for selected university (filtered by activity type)
  // Returns empty array if not found, or array of partners
  const partners = useMemo(() => {
    if (!selectedUniversity || !selectedProgram) return [];
    
    // Try Supabase first (primary data source)
    if (supabasePartners && supabasePartners.length > 0) {
      const uniId = getGermanUniversityId(selectedUniversity);
      const filtered = supabasePartners.filter((p) => {
        const matchesUni =
          p.home_university === uniId || p.home_university === selectedUniversity;
        return matchesUni && partnerMatchesProgram(p.subject_area, selectedProgram);
      });
      if (filtered.length > 0) {
        return filtered.map((p) => {
          const canonicalCountry = toCanonicalCountry(p.partner_country);
          const costData = getCityCostData(p.partner_city, canonicalCountry);
          const lat = p.latitude != null && p.longitude != null ? p.latitude : undefined;
          const lng = p.latitude != null && p.longitude != null ? p.longitude : undefined;
          return {
            name: p.partner_university_name,
            city: p.partner_city,
            country: p.partner_country,
            monthlyLivingCost: costData.monthlyLivingCost,
            travelCost: costData.travelCost,
            insuranceCost: costData.insuranceCost,
            id: p.id,
            subject_area: p.subject_area,
            activity_type: 'study' as const,
            lat,
            lng,
          } as PartnerUniversity;
        });
      }
    }

    // Fallback: local erasmus_partners.json (new structure)
    try {
      const uniId = getGermanUniversityId(selectedUniversity);
      if (uniId) {
        const newPartners = getPartnersByGermanUniversity(uniId, undefined, activityFilter);
        if (newPartners && newPartners.length > 0) {
          // Convert new structure to old structure format for compatibility
          return newPartners.map((partner: ErasmusPartner) => {
            const costData = getCityCostData(
              partner.partner_city,
              partner.partner_country,
              partner.cost_index
            );
            const at = partner.activity_type ?? (partner.confidence === 'traineeship' ? 'traineeship' : 'study');
            return {
              name: partner.partner_uni_name,
              city: partner.partner_city,
              country: partner.partner_country,
              monthlyLivingCost: costData.monthlyLivingCost,
              travelCost: costData.travelCost,
              insuranceCost: costData.insuranceCost,
              id: partner.id,
              subject_area: partner.subject_area,
              erasmus_code: partner.erasmus_code,
              cost_index: partner.cost_index,
              confidence: partner.confidence,
              lastVerified: partner.last_verified,
              activity_type: at,
              spotsPerYear: partner.spots_per_year,
              spotsPerSemester: partner.spots_per_semester ?? (partner.spots_per_year != null ? Math.floor(partner.spots_per_year / 2) : undefined),
              lat: partner.lat,
              lng: partner.lng,
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
    if (!match) return [];
    if (match.partners === 'no_partners_available') return null; // Special marker for explicitly no partners
    // Old structure has no activity_type; treat all as study
    return ((match.partners as PartnerUniversity[]) || []).map((p) => ({
      ...p,
      activity_type: 'study' as const,
    }));
  }, [selectedUniversity, selectedProgram, activityFilter]);

  // Check if explicitly no partners available (only in old structure)
  const hasNoPartnersAvailable = partners === null;
  
  // Filter partners by subject area matching the selected program
  const filteredPartners = useMemo(() => {
    if (!selectedProgram || !partners || partners === null || !Array.isArray(partners)) {
      return partners;
    }
    // Filter to partners whose subject_area matches the selected program
    return partners.filter((p) => {
      const ext = p as PartnerUniversity;
      const sa = ext.subject_area;
      return partnerMatchesProgram(sa, selectedProgram);
    });
  }, [partners, selectedProgram]);

  // Available countries from filtered partners (canonical keys, deduped)
  const availableCountries = useMemo(() => {
    if (!filteredPartners || !Array.isArray(filteredPartners)) return [];
    const canonical = new Set<string>();
    for (const p of filteredPartners) {
      const c = p.country?.trim();
      if (c) canonical.add(toCanonicalCountry(c));
    }
    return [...canonical].sort((a, b) =>
      getLocalizedCountryName(a, locale).localeCompare(getLocalizedCountryName(b, locale))
    );
  }, [filteredPartners, locale]);

  // Partners for display (filtered by country selection, but never empty solely wegen fehlender Länder-Auswahl)
  const partnersForDisplay = useMemo(() => {
    if (!filteredPartners || !Array.isArray(filteredPartners)) return [];
    if (countryFilterMode === 'all') return filteredPartners;
    // Im Modus „Nur bestimmte Länder“ ohne ausgewählte Länder weiterhin alle Partner zeigen,
    // damit Karte und Liste nicht verschwinden, bis der Nutzer ein Land ausgewählt hat.
    if (selectedCountries.size === 0) return filteredPartners;
    return filteredPartners.filter((p) =>
      [...selectedCountries].some((sel) => countryMatches(p.country, sel))
    );
  }, [filteredPartners, countryFilterMode, selectedCountries]);

  // Partners grouped by country (canonical key for grouping), sorted verified first, then by city/name
  const partnersByCountry = useMemo(() => {
    const grouped: Record<string, PartnerUniversity[]> = {};
    for (const p of partnersForDisplay) {
      const ext = p as PartnerUniversity;
      const country = toCanonicalCountry(p.country || 'Other');
      if (!grouped[country]) grouped[country] = [];
      grouped[country].push(ext);
    }
    for (const country of Object.keys(grouped)) {
      grouped[country].sort((a, b) => {
        const aVerified = a.confidence === 'verified_active' || a.confidence === 'moveon_only';
        const bVerified = b.confidence === 'verified_active' || b.confidence === 'moveon_only';
        if (aVerified !== bVerified) return aVerified ? -1 : 1;
        const cityCompare = (a.city || '').localeCompare(b.city || '');
        return cityCompare !== 0 ? cityCompare : (a.name || '').localeCompare(b.name || '');
      });
    }
    return grouped;
  }, [partnersForDisplay]);

  const sortedCountryKeys = useMemo(
    () => Object.keys(partnersByCountry).sort((a, b) => a.localeCompare(b)),
    [partnersByCountry]
  );

  // Filter countries for dropdown search (search by localized name)
  const filteredCountries = useMemo(() => {
    const query = countrySearch.toLowerCase().trim();
    if (!query) return availableCountries;
    return availableCountries.filter(
      (c) => getLocalizedCountryName(c, locale).toLowerCase().includes(query)
    );
  }, [availableCountries, countrySearch, locale]);

  const hasValidCountryFilter =
    countryFilterMode === 'all' || (countryFilterMode === 'specific' && selectedCountries.size > 0);

  // Filter universities based on search (search by name and city)
  const filteredUniversities = useMemo(() => {
    const query = universitySearch.toLowerCase().trim();
    if (!query) return allUniversities;
    return allUniversities.filter((uni) =>
      uni.name.toLowerCase().includes(query) ||
      uni.city.toLowerCase().includes(query)
    );
  }, [allUniversities, universitySearch]);

  // Get the selected university object for display
  const selectedUniversityObj = useMemo(() => {
    if (!selectedUniversity) return null;
    return allUniversities.find(u => u.name === selectedUniversity) || null;
  }, [selectedUniversity, allUniversities]);

  // Filter programs based on search
  const filteredPrograms = useMemo(() => {
    const query = programSearch.toLowerCase().trim();
    if (!query) return programs;
    return programs.filter((prog) =>
      prog.toLowerCase().includes(query)
    );
  }, [programs, programSearch]);

  // Handle university selection
  const handleUniversitySelect = (university: string | University) => {
    const universityName = typeof university === 'string' ? university : university.name;
    setSelection({ university: universityName, program: '', partner: null, hasBAfoeg });
    setUniversityDropdownOpen(false);
    setUniversitySearch('');
  };

  // Handle program selection
  const handleProgramSelect = (program: string) => {
    setSelection({ university: selectedUniversity, program, partner: null, hasBAfoeg });
    setProgramDropdownOpen(false);
    setProgramSearch('');
  };

  // Handle partner selection
  const handlePartnerSelect = (partner: PartnerUniversity) => {
    setSelection({ university: selectedUniversity, program: selectedProgram, partner, hasBAfoeg });
  };

  // Clear selections
  const handleClearUniversity = () => {
    clearSelection();
    setUniversitySearch('');
  };

  const handleClearProgram = () => {
    setSelection({ university: selectedUniversity, program: '', partner: null, hasBAfoeg });
    setProgramSearch('');
  };

  const handleClearPartner = () => {
    setSelection({ university: selectedUniversity, program: selectedProgram, partner: null, hasBAfoeg });
  };

  // Calculate dropdown positions when opening
  useEffect(() => {
    if (universityDropdownOpen && universityTriggerRef.current) {
      const updatePosition = () => {
        if (universityTriggerRef.current) {
          const rect = universityTriggerRef.current.getBoundingClientRect();
          setUniversityDropdownPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          });
        }
      };
      
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [universityDropdownOpen]);

  useEffect(() => {
    if (programDropdownOpen && programTriggerRef.current) {
      const updatePosition = () => {
        if (programTriggerRef.current) {
          const rect = programTriggerRef.current.getBoundingClientRect();
          setProgramDropdownPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          });
        }
      };
      
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [programDropdownOpen]);

  useEffect(() => {
    if (countryDropdownOpen && countryTriggerRef.current) {
      const updatePosition = () => {
        if (countryTriggerRef.current) {
          const rect = countryTriggerRef.current.getBoundingClientRect();
          setCountryDropdownPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          });
        }
      };
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [countryDropdownOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!universityDropdownOpen && !programDropdownOpen && !countryDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isPortalElement = target instanceof Element && target.closest('[data-dropdown-portal]');

      if (universityDropdownOpen) {
        if (
          universityTriggerRef.current &&
          !universityTriggerRef.current.contains(target) &&
          !isPortalElement
        ) {
          setUniversityDropdownOpen(false);
        }
      }

      if (programDropdownOpen) {
        if (
          programTriggerRef.current &&
          !programTriggerRef.current.contains(target) &&
          !isPortalElement
        ) {
          setProgramDropdownOpen(false);
        }
      }

      if (countryDropdownOpen) {
        if (
          countryTriggerRef.current &&
          !countryTriggerRef.current.contains(target) &&
          !isPortalElement
        ) {
          setCountryDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [universityDropdownOpen, programDropdownOpen, countryDropdownOpen]);

  // Render dropdown component via Portal
  const renderDropdown = (
    isOpen: boolean,
    options: (string | University | PartnerUniversity)[],
    selectedValue: string | University | PartnerUniversity | null,
    onSelect: (value: any) => void,
    searchValue: string,
    onSearchChange: (value: string) => void,
    position: { top: number; left: number; width: number },
    formatOption?: (option: any) => string
  ) => {
    if (!isOpen) return null;

    const dropdownContent = (
      <div
        data-dropdown-portal
        className="bg-slate-900 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl max-h-96 overflow-hidden flex flex-col"
        style={{
          position: 'fixed',
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: `${position.width}px`,
          zIndex: 9999,
        }}
      >
        {/* Search input */}
        <div className="p-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-8 pr-2 py-2 bg-slate-800/50 border border-white/10 rounded text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500/50"
              autoFocus
            />
          </div>
        </div>

        {/* Options list */}
        <div className="overflow-y-auto max-h-80">
          {options.length > 0 ? (
            <ul className="py-1">
              {options.map((option, index) => {
                let isSelected = false;
                if (typeof option === 'string') {
                  isSelected = option === selectedValue;
                } else if ('name' in option && 'city' in option && 'country' in option) {
                  // PartnerUniversity
                  isSelected = selectedPartner?.name === option.name && selectedPartner?.city === option.city;
                } else if ('name' in option && 'city' in option) {
                  // University
                  isSelected = selectedUniversity === option.name;
                }
                
                const displayValue = formatOption 
                  ? formatOption(option) 
                  : typeof option === 'string' 
                    ? option 
                    : 'name' in option && 'city' in option && 'country' in option
                      ? `${option.name}, ${option.city}` // PartnerUniversity
                      : `${option.name} (${option.city})`; // University

                const optionKey = typeof option === 'string' 
                  ? option 
                  : 'name' in option && 'city' in option && 'country' in option
                    ? ('id' in option && option.id)
                      ? String(option.id)
                      : `${option.name}-${option.city}-${option.country}-${index}`
                    : option.name;

                const isUniversity = typeof option !== 'string' && 'name' in option && 'city' in option && !('country' in option);
                const isProgram = typeof option === 'string';
                return (
                  <li
                    key={optionKey}
                    data-testid={isUniversity ? 'erasmus-university-option' : isProgram ? 'erasmus-program-option' : undefined}
                    {...(isUniversity && { 'data-university': (option as University).name })}
                    {...(isProgram && { 'data-program': option })}
                    onClick={() => onSelect(option)}
                    className={`px-4 py-2 cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? 'bg-blue-600/30 text-white'
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex-1">{displayValue}</span>
                      {isSelected && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-white/40 text-sm">
              {t('noResults')}
            </div>
          )}
        </div>
      </div>
    );

    return typeof document !== 'undefined' ? createPortal(dropdownContent, document.body) : null;
  };

  return (
    <div className="space-y-4">
      {/* University Dropdown */}
      <div ref={universityContainerRef} className="relative">
        <label className="block text-white/70 text-sm font-medium mb-2">
          {t('selectUniversity')}
        </label>
        <div
          ref={universityTriggerRef}
          data-testid="erasmus-university-trigger"
          className={`backdrop-blur-sm bg-slate-950/80 border rounded-lg cursor-pointer transition-all ${
            universityDropdownOpen
              ? 'border-blue-400/50'
              : 'border-white/10 hover:border-white/20'
          }`}
          onClick={() => {
            if (!universityDropdownOpen) {
              setUniversityDropdownOpen(true);
              setProgramDropdownOpen(false);
            }
          }}
        >
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <GraduationCap className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className={`flex-1 ${selectedUniversity ? 'text-white' : 'text-white/40'}`}>
                {selectedUniversityObj 
                  ? `${selectedUniversityObj.name} (${selectedUniversityObj.city})`
                  : selectedUniversity || t('universityPlaceholder')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedUniversity && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearUniversity();
                  }}
                  className="text-white/40 hover:text-white/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <ChevronDown
                className={`w-4 h-4 text-white/40 transition-transform ${
                  universityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
        </div>
        {renderDropdown(
          universityDropdownOpen,
          filteredUniversities,
          selectedUniversity,
          handleUniversitySelect,
          universitySearch,
          setUniversitySearch,
          universityDropdownPosition,
          (uni: University) => `${uni.name} (${uni.city})`
        )}
      </div>

      {/* Program Dropdown */}
      <div ref={programContainerRef} className="relative">
        <label className="block text-white/70 text-sm font-medium mb-2">
          {t('selectProgram')}
        </label>
        <div
          ref={programTriggerRef}
          data-testid="erasmus-program-trigger"
          className={`backdrop-blur-sm bg-slate-950/80 border rounded-lg transition-all ${
            !selectedUniversity
              ? 'border-white/5 cursor-not-allowed opacity-50'
              : programDropdownOpen
              ? 'border-blue-400/50 cursor-pointer'
              : 'border-white/10 hover:border-white/20 cursor-pointer'
          }`}
          onClick={() => {
            if (selectedUniversity && !programDropdownOpen) {
              setProgramDropdownOpen(true);
            }
          }}
        >
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Book className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className={`flex-1 ${selectedProgram ? 'text-white' : 'text-white/40'}`}>
                {!selectedUniversity 
                  ? t('programDisabled')
                  : selectedProgram || (programs.length === 0 ? t('noProgramsFound') : t('programPlaceholder'))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selectedProgram && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearProgram();
                  }}
                  className="text-white/40 hover:text-white/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <ChevronDown
                className={`w-4 h-4 text-white/40 transition-transform ${
                  programDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
        </div>
        {selectedUniversity &&
          renderDropdown(
            programDropdownOpen,
            filteredPrograms,
            selectedProgram,
            handleProgramSelect,
            programSearch,
            setProgramSearch,
            programDropdownPosition
          )}
      </div>

      {/* Activity Filter - Study vs Traineeship - Show after program selection */}
      {selectedProgram && (
        <div className="space-y-2">
          <label className="block text-white/70 text-sm font-medium">
            {t('activityFilterLabel')}
          </label>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setActivityFilter('study')}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                activityFilter === 'study'
                  ? 'bg-blue-950/50 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-950/80 border-white/10 text-white/60 hover:border-white/20 hover:text-white/80'
              }`}
            >
              <GraduationCap className="w-5 h-5 flex-shrink-0" />
              {t('activityStudy')}
            </button>
            <button
              type="button"
              onClick={() => setActivityFilter('traineeship')}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                activityFilter === 'traineeship'
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-950/80 border-white/10 text-white/60 hover:border-white/20 hover:text-white/80'
              }`}
            >
              <Briefcase className="w-5 h-5 flex-shrink-0" />
              {t('activityTraineeship')}
            </button>
          </div>
        </div>
      )}

      {/* Country Filter - All vs Specific - Show when partners available */}
      {selectedProgram && Array.isArray(filteredPartners) && filteredPartners.length > 0 && availableCountries.length > 0 && (
        <div className="space-y-2">
          <label className="block text-white/70 text-sm font-medium">
            {t('countryFilterLabel')}
          </label>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setCountryFilterMode('all');
                setSelectedCountries(new Set());
              }}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                countryFilterMode === 'all'
                  ? 'bg-blue-950/50 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-950/80 border-white/10 text-white/60 hover:border-white/20 hover:text-white/80'
              }`}
            >
              <Globe className="w-5 h-5 flex-shrink-0" />
              {t('countryFilterAll')}
            </button>
            <button
              type="button"
              onClick={() => {
                setCountryFilterMode('specific');
                setSelectedCountries(new Set());
              }}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all duration-200 ${
                countryFilterMode === 'specific'
                  ? 'bg-blue-950/50 border-blue-500/50 text-blue-300 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-950/80 border-white/10 text-white/60 hover:border-white/20 hover:text-white/80'
              }`}
            >
              <MapPin className="w-5 h-5 flex-shrink-0" />
              {t('countryFilterSpecific')}
            </button>
          </div>
          {countryFilterMode === 'specific' && (
            <div ref={countryContainerRef} className="relative mt-3">
              <label className="block text-white/70 text-xs font-medium mb-2">
                {t('countrySelectPlaceholder')}
              </label>
              <div
                ref={countryTriggerRef}
                className={`backdrop-blur-sm bg-slate-950/80 border rounded-lg cursor-pointer transition-all ${
                  countryDropdownOpen
                    ? 'border-blue-400/50'
                    : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => {
                  setCountryDropdownOpen(true);
                  setUniversityDropdownOpen(false);
                  setProgramDropdownOpen(false);
                }}
              >
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className={`flex-1 text-left ${selectedCountries.size > 0 ? 'text-white' : 'text-white/40'}`}>
                      {selectedCountries.size === 0
                        ? t('countrySelectPlaceholder')
                        : selectedCountries.size <= 3
                        ? [...selectedCountries]
                            .sort((a, b) => getLocalizedCountryName(a, locale).localeCompare(getLocalizedCountryName(b, locale)))
                            .map((c) => getLocalizedCountryName(c, locale))
                            .join(', ')
                        : t('countriesSelectedCount', { count: selectedCountries.size })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCountries.size > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCountries(new Set());
                        }}
                        className="text-white/40 hover:text-white/60 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-white/40 transition-transform ${
                        countryDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>
              {countryDropdownOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                  <div
                    data-dropdown-portal
                    className="bg-slate-900 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl max-h-96 overflow-hidden flex flex-col"
                    style={{
                      position: 'fixed',
                      top: `${countryDropdownPosition.top}px`,
                      left: `${countryDropdownPosition.left}px`,
                      width: `${countryDropdownPosition.width}px`,
                      zIndex: 9999,
                    }}
                  >
                    <div className="p-2 border-b border-white/10">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                          type="text"
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          placeholder={t('searchPlaceholder')}
                          className="w-full pl-8 pr-2 py-2 bg-slate-800/50 border border-white/10 rounded text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500/50"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-80">
                      {filteredCountries.length > 0 ? (
                        <ul className="py-1">
                          {filteredCountries.map((country) => {
                            const isSelected = selectedCountries.has(country);
                            const displayName = getLocalizedCountryName(country, locale);
                            return (
                              <li
                                key={country}
                                onClick={() => {
                                  setSelectedCountries((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(country)) next.delete(country);
                                    else next.add(country);
                                    return next;
                                  });
                                }}
                                className={`px-4 py-2 cursor-pointer transition-colors duration-150 ${
                                  isSelected
                                    ? 'bg-blue-600/30 text-white'
                                    : 'text-white/80 hover:bg-white/10'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="flex-1">{displayName}</span>
                                  {isSelected && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="px-4 py-8 text-center text-white/40 text-sm">
                          {t('noResults')}
                        </div>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              {selectedCountries.size === 0 && (
                <p className="text-amber-400/90 text-xs mt-2">{t('countrySelectHint')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* BAföG Toggle - Show after program selection */}
      {selectedProgram && (
        <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              data-testid="erasmus-bafoeg-toggle"
              checked={hasBAfoeg}
              onChange={(e) => setHasBAfoeg(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-black/40 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-white/80 text-sm flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              {tBAfoeg('label')}
            </span>
          </label>
        </div>
      )}

      {/* BAföG Benefits Display - Show when BAföG is active and program is selected */}
      {selectedProgram && hasBAfoeg && (
        <div className="backdrop-blur-sm bg-gradient-to-br from-blue-950/40 to-slate-950/80 border border-blue-500/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">{tBAfoeg('title')}</h3>
          </div>
          <p className="text-sm text-white/80 mb-4">{tBAfoeg('subtitle')}</p>
          
          {/* Social Top-Up - Highlighted */}
          <div data-testid="erasmus-social-topup" className="bg-green-950/30 border-2 border-green-500/40 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="bg-green-500/20 rounded-full p-2">
                  <Euro className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-bold text-green-300">{tBAfoeg('socialTopUp.title')}</h4>
                  <span className="text-lg font-bold text-green-400">{tBAfoeg('socialTopUp.monthlyAmount', { amount: BAFOEG_ERASMUS_ADDON })}</span>
                </div>
                <p className="text-xs text-white/90 mb-1">{tBAfoeg('socialTopUp.description', { amount: BAFOEG_ERASMUS_ADDON })}</p>
                <p className="text-xs text-green-300/80 italic">{tBAfoeg('socialTopUp.highlight')}</p>
              </div>
            </div>
          </div>

          {/* Auslands-BAföG - Important Funding Source */}
          <div className="bg-blue-950/30 border border-blue-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <GraduationCap className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">{tBAfoeg('auslandsBAfoeg.title')}</h4>
                <p className="text-xs text-white/80 mb-2">{tBAfoeg('auslandsBAfoeg.description')}</p>
                <p className="text-xs text-blue-300/90 font-medium">{tBAfoeg('auslandsBAfoeg.benefits')}</p>
              </div>
            </div>
          </div>
          
          {/* Additional Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* GEZ / Broadcasting Fee */}
            <div className="flex items-start gap-2 p-3 bg-slate-900/50 rounded-lg border border-white/5">
              <Radio className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-white mb-1">{tBAfoeg('benefits.gez.title')}</h4>
                <p className="text-xs text-white/70">{tBAfoeg('benefits.gez.description')}</p>
              </div>
            </div>

            {/* Travel Allowance */}
            <div className="flex items-start gap-2 p-3 bg-slate-900/50 rounded-lg border border-white/5">
              <Plane className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-white mb-1">{tBAfoeg('benefits.travelAllowance.title')}</h4>
                <p className="text-xs text-white/70">{tBAfoeg('benefits.travelAllowance.description')}</p>
              </div>
            </div>

            {/* Tuition Fee Coverage */}
            <div className="flex items-start gap-2 p-3 bg-slate-900/50 rounded-lg border border-white/5">
              <Euro className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-white mb-1">{tBAfoeg('benefits.tuitionFees.title')}</h4>
                <p className="text-xs text-white/70">{tBAfoeg('benefits.tuitionFees.description')}</p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/60 flex items-start gap-2">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {tBAfoeg('disclaimer')}
            </p>
          </div>
        </div>
      )}

      {/* Partner Tiles Grid - Show when university, program und passende Partner vorhanden sind */}
      {selectedUniversity && selectedProgram && activityFilter && Array.isArray(partnersForDisplay) && partnersForDisplay.length > 0 && (
        <div>
          <label className="block text-white/70 text-sm font-medium mb-4">
            {t('selectPartner')}
          </label>
          
          {hasNoPartnersAvailable ? (
            // No Partners Available Info Tile
            <div className="backdrop-blur-sm bg-orange-950/20 border border-orange-500/30 rounded-lg p-6">
              <div className="flex items-center gap-3 text-orange-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{t('noPartnersAvailable')}</span>
              </div>
            </div>
          ) : Array.isArray(partnersForDisplay) && partnersForDisplay.length > 0 ? (
            <>
              {/* Interactive Map View - Shown whenever partners are available (all or filtered by country) */}
              {partnersForDisplay.length > 0 && (
                <div className="mb-6">
                  <label className="block text-white/70 text-sm font-medium mb-4">
                    Partner Locations Map
                  </label>
                  <ErasmusMap partners={partnersForDisplay} />
                </div>
              )}

              {/* Partners by Country - Accordion */}
              <div className="space-y-2">
                {sortedCountryKeys.map((country) => {
                  const countryPartners = partnersByCountry[country];
                  const count = countryPartners.length;
                  const isExpanded = expandedCountries.has(country);
                  const toggleExpand = () => {
                    setExpandedCountries((prev) => {
                      if (prev.has(country)) return new Set();
                      return new Set([country]);
                    });
                  };
                  return (
                    <div
                      key={country}
                      className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-lg overflow-hidden"
                    >
                      <button
                        type="button"
                        data-testid="erasmus-country-toggle"
                        data-country={country}
                        onClick={toggleExpand}
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="font-medium text-white">{getLocalizedCountryName(country, locale)}</span>
                          <span className="text-white/60 text-sm">
                            ({t('countryPartnerCount', { count })})
                          </span>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isExpanded && (
                        <div className="border-t border-white/10 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {countryPartners.map((partner, index) => {
                              const partnerExt = partner as PartnerUniversity;
                              const uniqueKey = partnerExt.id ?? `${partner.name}-${partner.city}-${partner.country}-${index}`;
                              const isSelected = selectedPartner?.name === partner.name && 
                                selectedPartner?.city === partner.city &&
                                selectedPartner?.country === partner.country;
                              return (
                                <div
                                  key={uniqueKey}
                                  data-testid="erasmus-partner-tile"
                                  data-partner-name={partner.name}
                                  onClick={() => handlePartnerSelect(partner)}
                                  className={`backdrop-blur-sm border rounded-lg p-4 cursor-pointer transition-all duration-200 ${getPartnerCardBorderClass((partner as PartnerUniversity).confidence, isSelected)} ${
                                    partnerExt.activity_type === 'traineeship'
                                      ? isSelected
                                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-500/20'
                                        : 'bg-slate-950/80 border-emerald-500/30 hover:border-emerald-500/50 hover:bg-slate-950/90'
                                      : isSelected
                                        ? 'bg-blue-950/30 border-blue-500/50 shadow-lg shadow-blue-500/20'
                                        : 'bg-slate-950/80 border-white/10 hover:border-white/30 hover:bg-slate-950/90'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      {partnerExt.activity_type === 'traineeship' ? (
                                        <Briefcase className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                      ) : (
                                        <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <h4 className="text-white font-semibold text-sm truncate">
                                            {partner.name}
                                          </h4>
                                          {partnerExt.activity_type === 'traineeship' && (
                                            <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-xs font-medium rounded-full border border-emerald-500/50">
                                              {t('traineeshipBadge')}
                                            </span>
                                          )}
                                          <PartnerVerificationBadge confidence={(partner as PartnerUniversity).confidence} />
                                        </div>
                                        <p className="text-white/60 text-xs mt-0.5">
                                          {partner.city}, {getLocalizedCountryName(partner.country, locale)}
                                        </p>
                                        {(partner as PartnerUniversity).subject_area && (
                                          <p className="text-white/40 text-xs mt-1">
                                            {(partner as PartnerUniversity).subject_area}
                                          </p>
                                        )}
                                        {((partner as PartnerUniversity).spotsPerSemester ?? (partner as PartnerUniversity).spotsPerYear) != null && (
                                          <p className="text-white/40 text-xs mt-1">
                                            {(partner as PartnerUniversity).spotsPerSemester != null
                                              ? t('spotsPerSemester', { count: (partner as PartnerUniversity).spotsPerSemester })
                                              : t('spotsPerYear', { count: (partner as PartnerUniversity).spotsPerYear })}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    {isSelected && (
                                      <Check className="w-5 h-5 text-blue-400 flex-shrink-0" />
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                                    <Euro className="w-4 h-4 text-white/60" />
                                    <div className="flex-1">
                                      <p className="text-white/50 text-xs">{t('monthlyCost')}</p>
                                      <p className="text-white font-medium text-sm">
                                        {formatCurrency(partner.monthlyLivingCost)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="pt-2 mt-2 border-t border-white/5">
                                    <AffiliateLabel variant="subtle" className="text-center" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            // No Partners Found (empty state)
            <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-lg p-6">
              <div className="flex items-center gap-3 text-white/60">
                <MapPin className="w-5 h-5 text-white/40 flex-shrink-0" />
                <span className="text-sm">{t('noPartnersFound')}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

