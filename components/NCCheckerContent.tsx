'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { GraduationCap, CheckCircle2, AlertTriangle, Info, Award, Building2, Globe, Briefcase, BookOpen, ExternalLink, Search, ChevronDown, Check, X, MapPin, Map, List } from 'lucide-react';
import universityProgramsData from '@/data/university_programs.json';
import universitiesData from '@/data/universities.json';
import GradeInput from '@/components/GradeInput';
import {
  getProgramMatchType,
  getMatchTypeStyles,
  getMatchTypeLabel,
  type ProgramMatchType,
} from '@/lib/nc-filter';
import { type StudyProgram, getProgramName } from '@/data/university-program-types';
import AffiliateLabel from '@/components/AffiliateLabel';
import { getSearchTerms, matchesSearchTerms } from '@/lib/search-mapping';
import dynamic from 'next/dynamic';

// Dynamically import NCMap to avoid SSR issues
const NCMap = dynamic(() => import('@/components/NCMap'), {
  ssr: false,
  loading: () => (
    <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 text-center">
      <p className="text-white/60 text-sm">Loading map...</p>
    </div>
  ),
});

interface University {
  name: string;
  city: string;
  type: 'public' | 'private';
  institutionType?: 'University' | 'FH';
  state?: string;
  semesterFee?: number;
  avgRent?: number;
}

interface UniversityWithMatch {
  university: University;
  program: StudyProgram;
  matchType: ProgramMatchType;
  ncThreshold: number;
  waitingSemesters: number;
  isNCFree: boolean;
}

export default function NCCheckerContent() {
  const t = useTranslations('NCChecker');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [userGrade, setUserGrade] = useState<number | null>(null);
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);
  const [programSearch, setProgramSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<'safe' | 'reach' | 'available' | 'unlikely' | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [sortBy, setSortBy] = useState<'nc' | 'name' | 'semesterFee'>('nc');
  const [institutionTypeFilter, setInstitutionTypeFilter] = useState<'all' | 'University' | 'FH'>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [stateDropdownOpen, setStateDropdownOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [stateDropdownPosition, setStateDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  const programContainerRef = useRef<HTMLDivElement>(null);
  const programTriggerRef = useRef<HTMLDivElement>(null);
  const stateContainerRef = useRef<HTMLDivElement>(null);
  const stateTriggerRef = useRef<HTMLDivElement>(null);

  // Get all unique program names from all universities
  const allPrograms = useMemo(() => {
    const programSet = new Set<string>();
    const programsData = universityProgramsData as Record<string, (string | StudyProgram)[]>;
    
    Object.values(programsData).forEach((programs) => {
      programs.forEach((program) => {
        const programName = typeof program === 'string' ? program : program.name;
        programSet.add(programName);
      });
    });
    
    return Array.from(programSet).sort();
  }, []);

  // German states list (English names for internal use)
  const germanStates: string[] = [
    'Baden-Württemberg',
    'Bavaria',
    'Berlin',
    'Brandenburg',
    'Bremen',
    'Hamburg',
    'Hesse',
    'Lower Saxony',
    'Mecklenburg-Vorpommern',
    'North Rhine-Westphalia',
    'Rhineland-Palatinate',
    'Saarland',
    'Saxony',
    'Saxony-Anhalt',
    'Schleswig-Holstein',
    'Thuringia',
  ];

  // Helper function to sanitize state name to translation key
  const getStateTranslationKey = (state: string): string => {
    return state
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/\s+/g, '-')
      .replace(/thuringia/g, 'thueringen') // Special case: Thuringia -> Thüringen -> thueringen
      .replace(/bavaria/g, 'bayern') // Special case: Bavaria -> Bayern -> bayern
      .replace(/baden-württemberg/g, 'baden-wuerttemberg'); // Special case: Baden-Württemberg -> baden-wuerttemberg
  };

  // Filter programs based on search using getSearchTerms for synonym matching
  // Strict Search: Only show programs where at least one search term appears in the program name
  // Enhanced exclusion logic to prevent false positives
  const filteredPrograms = useMemo(() => {
    if (!programSearch.trim()) return allPrograms;
    
    // Get expanded search terms including synonyms
    const searchTerms = getSearchTerms(programSearch);
    const searchInput = programSearch.toLowerCase().trim();
    
    // Determine if this is a business-related search
    const isBusinessSearch = ['bwl', 'betriebswirtschaft', 'business', 'wirtschaft', 'management', 'vwl', 'volkswirtschaft'].some(
      term => searchInput.includes(term)
    );
    
    // Strict filter: program must contain at least one of the search terms
    // Enhanced exclusion logic to prevent false positives
    const filtered = allPrograms.filter(program => {
      const programName = program.toLowerCase();
      
      // 1. STRICT SEARCH: Check if any search term appears in the program name
      const matchesSearch = searchTerms.some(term => programName.includes(term));
      
      if (!matchesSearch) return false;
      
      // 2. EXCLUSION LOGIC: Filter out unrelated results for business searches
      if (isBusinessSearch) {
        // Exclude music conservatories (unless explicitly music management)
        const isMusicConservatory = (programName.includes('musik') || programName.includes('music')) && 
          (programName.includes('hochschule') || programName.includes('konservatorium') || programName.includes('conservatory'));
        const isMusicManagement = programName.includes('musikmanagement') || 
          programName.includes('music management') ||
          programName.includes('musikwirtschaft') ||
          programName.includes('music business');
        
        if (isMusicConservatory && !isMusicManagement) {
          return false;
        }
        
        // Exclude pure music/arts programs that might match "management" in a different context
        const isPureArtsProgram = (programName.includes('musik') || programName.includes('kunst') || programName.includes('art')) &&
          !programName.includes('management') &&
          !programName.includes('wirtschaft') &&
          !programName.includes('business') &&
          !programName.includes('betriebswirtschaft');
        
        if (isPureArtsProgram) {
          return false;
        }
        
        // Exclude programs that only match generic terms like "management" in non-business contexts
        // e.g., "Event Management" in a music context should be excluded for BWL search
        const isGenericManagementInArts = programName.includes('management') &&
          (programName.includes('musik') || programName.includes('kunst') || programName.includes('theater') || programName.includes('dance')) &&
          !programName.includes('business') &&
          !programName.includes('wirtschaft') &&
          !programName.includes('betriebswirtschaft');
        
        if (isGenericManagementInArts) {
          return false;
        }
      }
      
      // 3. ADDITIONAL EXCLUSIONS: Prevent other false positives
      // Exclude programs that match only very generic terms without business context
      if (isBusinessSearch && searchTerms.length > 0) {
        // If search is very specific (like "BWL"), require stronger match
        const isSpecificBusinessSearch = ['bwl', 'betriebswirtschaft', 'vwl', 'volkswirtschaft'].some(
          term => searchInput.includes(term)
        );
        
        if (isSpecificBusinessSearch) {
          // For specific business searches, exclude programs that only match generic terms
          const onlyMatchesGenericTerms = searchTerms.every(term => 
            ['management', 'wirtschaft', 'business'].includes(term) &&
            !programName.includes('betriebswirtschaft') &&
            !programName.includes('business administration') &&
            !programName.includes('bwl') &&
            !programName.includes('vwl')
          );
          
          if (onlyMatchesGenericTerms) {
            return false;
          }
        }
      }
      
      return true;
    });
    
    return filtered;
  }, [allPrograms, programSearch]);

  // Filter states based on search query
  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) {
      return germanStates;
    }
    
    const searchLower = stateSearch.toLowerCase();
    return germanStates.filter((state: string) => {
      const stateLower = state.toLowerCase();
      // Match by English name
      if (stateLower.includes(searchLower)) return true;
      // Try to match by translation key
      const stateKey = stateLower.replace(/\s+/g, '');
      try {
        const translated = t(stateKey as any);
        if (translated && typeof translated === 'string' && translated.toLowerCase().includes(searchLower)) return true;
      } catch {
        // Translation key doesn't exist, ignore
      }
      return false;
    });
  }, [germanStates, stateSearch, t]);

  // Get all institutions (Universities and FHs) that offer the selected program
  // Comprehensive inclusion: iterate through ALL keys in university_programs.json
  // Only include institutions where the program name matches EXACTLY
  const universitiesWithProgram = useMemo(() => {
    if (!selectedProgram) return [];
    
    const programsData = universityProgramsData as Record<string, (string | StudyProgram)[]>;
    const universities = universitiesData as University[];
    
    // Create a map for quick lookup of university data
    const universityMap: Record<string, University> = {};
    universities.forEach(uni => {
      universityMap[uni.name] = uni;
    });
    
    // Collect ALL institutions that offer the selected program (exact match)
    const allInstitutionMatches: Array<{ university: University; program: StudyProgram }> = [];
    
    // Iterate through ALL keys in university_programs.json (400+ entries)
    Object.entries(programsData).forEach(([institutionName, programs]) => {
      // Find exact program match
      const program = programs.find((p) => {
        const pName = typeof p === 'string' ? p : p.name;
        // EXACT match required - no partial matching
        return pName === selectedProgram;
      });
      
      // Only proceed if this institution offers the selected program
      if (program) {
        // Get university data from map, or create fallback if not found
        let uni = universityMap[institutionName];
        
        if (!uni) {
          // Fallback: Create university object for institutions not in universities.json
          // Try to infer institution type from name (comprehensive FH detection)
          // IMPORTANT: Check FH patterns FIRST before checking for "university"
          const nameLower = institutionName.toLowerCase();
          
          // FH indicators (check these first)
          const hasFHIndicator = nameLower.includes('fachhochschule') ||
                                 nameLower.includes('university of applied sciences') ||
                                 nameLower.includes('applied sciences') ||
                                 nameLower.includes('htw') ||
                                 nameLower.includes('haw') ||
                                 nameLower.includes('hochschule für technik') ||
                                 nameLower.includes('hochschule für wirtschaft') ||
                                 nameLower.includes('hochschule für angewandte') ||
                                 nameLower.includes('hochschule für') ||
                                 nameLower.includes('fh ') ||
                                 nameLower.includes(' fh') ||
                                 nameLower.match(/\bhtw\b/) ||
                                 nameLower.match(/\bhaw\b/);
          
          // Check if it's a Hochschule (but not a Universität/University)
          const isHochschule = nameLower.includes('hochschule') && 
                               !nameLower.includes('universität') && 
                               !nameLower.includes('university');
          
          // If it has "University of Applied Sciences" or similar, it's definitely an FH
          const isAppliedSciences = nameLower.includes('university of applied sciences') ||
                                    (nameLower.includes('applied sciences') && nameLower.includes('university'));
          
          const isFH = hasFHIndicator || isHochschule || isAppliedSciences;
          
          uni = {
            name: institutionName,
            city: '', // Will be empty if not in universities.json
            type: 'public',
            institutionType: isFH ? 'FH' : 'University',
          };
        }
        
        // Convert program to StudyProgram format
        const programObj: StudyProgram = typeof program === 'string' 
          ? { name: program, nc_threshold: 0.0, waiting_semesters: 0 }
          : program;
        
        allInstitutionMatches.push({
          university: uni,
          program: programObj,
        });
      }
    });
    
    // Apply combined filters (AND condition): State + Institution Type
    const filtered = allInstitutionMatches.filter((item) => {
      // 1. State Filter (if not 'all')
      if (stateFilter !== 'all') {
        const itemState = item.university.state || '';
        if (itemState !== stateFilter) {
          return false;
        }
      }
      
      // 2. Institution Type Filter (if not 'all')
      if (institutionTypeFilter !== 'all') {
        const itemType = item.university.institutionType || 'University';
        if (itemType !== institutionTypeFilter) {
          return false;
        }
      }
      
      // Only return if all filters pass (AND logic)
      return true;
    });
    
    // Transform to UniversityWithMatch format and calculate match types
    const results: UniversityWithMatch[] = filtered.map((item) => {
      const ncThreshold = item.program.nc_threshold;
      const waitingSemesters = item.program.waiting_semesters;
      const isNCFree = ncThreshold === 0.0;
      
      const matchType = userGrade !== null 
        ? getProgramMatchType(userGrade, ncThreshold, isNCFree)
        : 'available';
      
      return {
        university: item.university,
        program: item.program,
        matchType,
        ncThreshold,
        waitingSemesters,
        isNCFree,
      };
    });
    
    // Sort by NC threshold (ascending - best grades first) BEFORE grouping
    // NC-free programs (0.0) will be sorted first within their category
    results.sort((a, b) => {
      // NC-free programs first
      if (a.isNCFree && !b.isNCFree) return -1;
      if (!a.isNCFree && b.isNCFree) return 1;
      // Then by NC threshold (lower is better)
      if (a.ncThreshold !== b.ncThreshold) {
        return a.ncThreshold - b.ncThreshold;
      }
      // If same NC, sort by institution name
      return a.university.name.localeCompare(b.university.name);
    });
    
    return results;
  }, [selectedProgram, userGrade, institutionTypeFilter, stateFilter]);

  // Group universities by match type
  // Note: universitiesWithProgram is already sorted by NC threshold (ascending)
  const groupedUniversities = useMemo(() => {
    const groups: Record<string, UniversityWithMatch[]> = {
      safe: [],
      reach: [],
      available: [],
      unlikely: [],
    };

    // Group by match type (results are already sorted by NC)
    universitiesWithProgram.forEach((item) => {
      groups[item.matchType].push(item);
    });

    // Apply additional sorting within each group based on selected sort option
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        if (sortBy === 'semesterFee') {
          // Sort by semester fee (lowest first)
          const feeA = a.university.semesterFee || 300;
          const feeB = b.university.semesterFee || 300;
          if (feeA !== feeB) {
            return feeA - feeB;
          }
          // If same fee, maintain NC order (already sorted)
          return 0;
        } else if (sortBy === 'name') {
          // Sort by university name
          return a.university.name.localeCompare(b.university.name);
        } else {
          // Default: Maintain NC order (already sorted by NC threshold)
          // Just ensure consistent ordering for same NC values
          if (a.ncThreshold !== b.ncThreshold) {
            return a.ncThreshold - b.ncThreshold;
          }
          return a.university.name.localeCompare(b.university.name);
        }
      });
    });

    return groups;
  }, [universitiesWithProgram, sortBy]);

  // Count universities by type
  const counts = useMemo(() => {
    return {
      safe: groupedUniversities.safe.length,
      reach: groupedUniversities.reach.length,
      available: groupedUniversities.available.length,
      unlikely: groupedUniversities.unlikely.length,
    };
  }, [groupedUniversities]);

  // Determine if alternatives should be shown
  const showAlternatives = userGrade !== null && selectedProgram && (counts.reach > 0 || counts.unlikely > 0 || counts.safe > 0);

  // Ref for results section (for scrolling)
  const resultsSectionRef = useRef<HTMLDivElement>(null);

  // Handle category selection
  const handleCategoryClick = (category: 'safe' | 'reach' | 'available' | 'unlikely') => {
    // Toggle if already active, otherwise set as active
    if (activeCategory === category) {
      setActiveCategory(null);
    } else {
      setActiveCategory(category);
      // Scroll to results section on mobile
      setTimeout(() => {
        if (resultsSectionRef.current) {
          resultsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  // Handle program selection
  const handleProgramSelect = (program: string) => {
    setSelectedProgram(program);
    setProgramDropdownOpen(false);
    setProgramSearch('');
    setActiveCategory(null); // Reset category when program changes
  };

  // Calculate dropdown position when opening
  useEffect(() => {
    if (programDropdownOpen && programTriggerRef.current) {
      const updatePosition = () => {
        if (programTriggerRef.current) {
          const rect = programTriggerRef.current.getBoundingClientRect();
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
  }, [programDropdownOpen, filteredPrograms.length]);

  // Calculate state dropdown position
  useEffect(() => {
    if (stateDropdownOpen && stateTriggerRef.current) {
      const updatePosition = () => {
        if (stateTriggerRef.current) {
          const rect = stateTriggerRef.current.getBoundingClientRect();
          setStateDropdownPosition({
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
  }, [stateDropdownOpen]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!programDropdownOpen && !stateDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (programDropdownOpen) {
        if (
          programTriggerRef.current &&
          !programTriggerRef.current.contains(target) &&
          !(target instanceof Element && target.closest('[data-dropdown-portal]'))
        ) {
          setProgramDropdownOpen(false);
        }
      }
      
      if (stateDropdownOpen) {
        if (
          stateTriggerRef.current &&
          !stateTriggerRef.current.contains(target) &&
          !(target instanceof Element && target.closest('[data-dropdown-portal]'))
        ) {
          setStateDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [programDropdownOpen, stateDropdownOpen]);

  // Handle state selection
  const handleStateSelect = (state: string) => {
    setStateFilter(state);
    setStateDropdownOpen(false);
    setStateSearch('');
  };

  // Render searchable dropdown via Portal
  const renderProgramDropdown = () => {
    if (!programDropdownOpen) return null;

    const dropdownContent = (
      <div
        data-dropdown-portal
        className="bg-slate-900 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl max-h-96 overflow-hidden flex flex-col"
        style={{
          position: 'fixed',
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          zIndex: 9999,
        }}
      >
        {/* Search input */}
        <div className="p-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={programSearch}
              onChange={(e) => setProgramSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-8 pr-2 py-2 bg-slate-800/50 border border-white/10 rounded text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500/50"
              autoFocus
            />
          </div>
        </div>

        {/* Options list */}
        <div className="overflow-y-auto max-h-80">
          {filteredPrograms.length > 0 ? (
            <ul className="py-1">
              {filteredPrograms.map((program) => {
                const isSelected = program === selectedProgram;
                return (
                  <li
                    key={program}
                    onClick={() => handleProgramSelect(program)}
                    className={`px-4 py-2 cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? 'bg-blue-600/30 text-white'
                        : 'text-white/80 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex-1">{program}</span>
                      {isSelected && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-white/60 text-sm">
              {t('noResults')}
            </div>
          )}
        </div>
      </div>
    );

    return typeof document !== 'undefined' ? createPortal(dropdownContent, document.body) : null;
  };

  // Render state dropdown via Portal
  const renderStateDropdown = () => {
    if (!stateDropdownOpen) return null;

    const dropdownContent = (
      <div
        data-dropdown-portal
        className="bg-slate-900 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl max-h-96 overflow-hidden flex flex-col"
        style={{
          position: 'fixed',
          top: `${stateDropdownPosition.top}px`,
          left: `${stateDropdownPosition.left}px`,
          width: `${stateDropdownPosition.width}px`,
          zIndex: 9999,
        }}
      >
        {/* Search input */}
        <div className="p-2 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={stateSearch}
              onChange={(e) => setStateSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-8 pr-2 py-2 bg-slate-800/50 border border-white/10 rounded text-white placeholder-white/40 text-sm focus:outline-none focus:border-blue-500/50"
              autoFocus
            />
          </div>
        </div>

        {/* Options list */}
        <div className="overflow-y-auto max-h-80">
          <ul className="py-1">
            <li
              onClick={() => handleStateSelect('all')}
              className={`px-4 py-2 cursor-pointer transition-colors duration-150 ${
                stateFilter === 'all'
                  ? 'bg-blue-600/30 text-white'
                  : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex-1">{t('allStates')}</span>
                {stateFilter === 'all' && <Check className="w-4 h-4 text-white flex-shrink-0" />}
              </div>
            </li>
            {filteredStates.map((state: string) => {
              const isSelected = state === stateFilter;
              const stateKey = getStateTranslationKey(state);
              return (
                <li
                  key={state}
                  onClick={() => handleStateSelect(state)}
                  className={`px-4 py-2 cursor-pointer transition-colors duration-150 ${
                    isSelected
                      ? 'bg-blue-600/30 text-white'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex-1">{t(stateKey as any) || state}</span>
                    {isSelected && <Check className="w-4 h-4 text-white flex-shrink-0" />}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );

    return typeof document !== 'undefined' ? createPortal(dropdownContent, document.body) : null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
          <GraduationCap className="w-10 h-10 text-blue-400" />
          {t('title')}
        </h1>
        <p className="text-white/70 text-lg max-w-2xl mx-auto">
          {t('subtitle')}
        </p>
      </div>

      {/* Program Selection - Searchable Dropdown */}
      <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6">
        <label className="block mb-3 text-sm font-medium text-white/80 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          {t('selectProgram')}
        </label>
        <div ref={programContainerRef} className="relative">
          <div
            ref={programTriggerRef}
            className={`backdrop-blur-sm bg-black/40 border rounded-lg transition-all cursor-pointer ${
              programDropdownOpen
                ? 'border-blue-400/50'
                : 'border-white/10 hover:border-white/20'
            }`}
            onClick={() => setProgramDropdownOpen(!programDropdownOpen)}
          >
            <div className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GraduationCap className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span className={`flex-1 ${selectedProgram ? 'text-white' : 'text-white/40'}`}>
                  {selectedProgram || t('programPlaceholder')}
                </span>
              </div>
              {selectedProgram && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedProgram('');
                    setProgramSearch('');
                  }}
                  className="p-1 rounded hover:bg-white/10 transition-colors mr-2"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              )}
              <ChevronDown
                className={`w-4 h-4 text-white/40 transition-transform flex-shrink-0 ${
                  programDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
          {renderProgramDropdown()}
        </div>
      </div>

      {/* Grade Input */}
      <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-6">
        <GradeInput 
          value={userGrade} 
          onChange={setUserGrade}
          showSlider={true}
        />
      </div>

      {/* Combined Filters: State + Institution Type */}
      {selectedProgram && (
        <div className="mb-6 space-y-4">
          {/* State Filter - Custom Searchable Dropdown */}
          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4">
            <label className="block text-white/70 text-sm font-medium mb-3">
              {t('stateFilter')}
            </label>
            <div ref={stateContainerRef} className="relative">
              <div
                ref={stateTriggerRef}
                className={`backdrop-blur-sm bg-black/40 border rounded-lg transition-all cursor-pointer ${
                  stateDropdownOpen
                    ? 'border-blue-400/50'
                    : 'border-white/10 hover:border-white/20'
                }`}
                onClick={() => {
                  setStateDropdownOpen(!stateDropdownOpen);
                  if (!stateDropdownOpen) {
                    setStateSearch('');
                  }
                }}
              >
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <span className={`flex-1 ${stateFilter !== 'all' ? 'text-white' : 'text-white/40'}`}>
                      {stateFilter === 'all' 
                        ? t('allStates')
                        : t(getStateTranslationKey(stateFilter) as any) || stateFilter
                      }
                    </span>
                  </div>
                  {stateFilter !== 'all' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStateFilter('all');
                        setStateSearch('');
                      }}
                      className="p-1 rounded hover:bg-white/10 transition-colors mr-2"
                    >
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-white/40 transition-transform flex-shrink-0 ${
                      stateDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>
              {renderStateDropdown()}
            </div>
          </div>

          {/* Institution Type Filter */}
          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4">
            <label className="block text-white/70 text-sm font-medium mb-3">
              {t('institutionType')}
            </label>
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setInstitutionTypeFilter('all')}
                className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                  institutionTypeFilter === 'all'
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                {t('all')}
              </button>
              <button
                onClick={() => setInstitutionTypeFilter('University')}
                className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                  institutionTypeFilter === 'University'
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                {t('university')}
              </button>
              <button
                onClick={() => setInstitutionTypeFilter('FH')}
                className={`px-4 py-2 rounded-md transition-all duration-200 text-sm font-medium ${
                  institutionTypeFilter === 'FH'
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                {t('fh')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State for Combined Filters */}
      {selectedProgram && (stateFilter !== 'all' || institutionTypeFilter !== 'all') && universitiesWithProgram.length === 0 && (
        <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 text-center">
          <Info className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/70 text-lg mb-2">
            {t('noResultsWithFilters')}
          </p>
          <p className="text-white/50 text-sm mb-4">
            {t('tryWideningSearch')}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            {stateFilter !== 'all' && (
              <button
                onClick={() => setStateFilter('all')}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {t('allStates')}
              </button>
            )}
            {institutionTypeFilter !== 'all' && (
              <button
                onClick={() => setInstitutionTypeFilter('all')}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {t('all')} {t('institutionType')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results Summary - Interactive Cards */}
      {selectedProgram && (
        <div className="space-y-4">
          {/* Dynamic Count Message with Filters */}
          <div className="text-center backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4">
            {stateFilter !== 'all' || institutionTypeFilter !== 'all' ? (
              <p className="text-white/80 text-lg">
                <span className="font-semibold text-white">{universitiesWithProgram.length}</span>{' '}
                {institutionTypeFilter !== 'all' && stateFilter !== 'all' ? (
                  t('institutionsInStateWithType', {
                    count: universitiesWithProgram.length,
                    type: institutionTypeFilter === 'FH' ? t('fh') : t('university'),
                    state: stateFilter
                  })
                ) : stateFilter !== 'all' ? (
                  t('institutionsInState', {
                    count: universitiesWithProgram.length,
                    state: stateFilter
                  })
                ) : (
                  `${universitiesWithProgram.length} ${institutionTypeFilter === 'FH' ? t('fh') : t('university')} ${universitiesWithProgram.length === 1 ? 'offers' : 'offer'} this program`
                )}
              </p>
            ) : (
              <p className="text-white/80 text-lg">
                <span className="font-semibold text-white">{universitiesWithProgram.length}</span>{' '}
                {t('universitiesOfferProgram', { count: universitiesWithProgram.length })}
              </p>
            )}
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* High Chance Card */}
            <button
              onClick={() => counts.safe > 0 && handleCategoryClick('safe')}
              disabled={counts.safe === 0}
              className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 ${
                activeCategory === 'safe'
                  ? 'bg-green-950/50 border-green-500/80 shadow-lg shadow-green-500/20 scale-105'
                  : 'bg-green-950/30 border-green-500/40 hover:border-green-500/60 hover:bg-green-950/40'
              } ${counts.safe === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-green-400 text-2xl font-bold">{counts.safe}</div>
              <div className="text-white/70 text-sm">{t('highChance')}</div>
            </button>

            {/* Potential Chance Card */}
            <button
              onClick={() => counts.reach > 0 && handleCategoryClick('reach')}
              disabled={counts.reach === 0}
              className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 ${
                activeCategory === 'reach'
                  ? 'bg-yellow-950/50 border-yellow-500/80 shadow-lg shadow-yellow-500/20 scale-105'
                  : 'bg-yellow-950/30 border-yellow-500/40 hover:border-yellow-500/60 hover:bg-yellow-950/40'
              } ${counts.reach === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-yellow-400 text-2xl font-bold">{counts.reach}</div>
              <div className="text-white/70 text-sm">{t('potentialChance')}</div>
            </button>

            {/* Available Card */}
            <button
              onClick={() => counts.available > 0 && handleCategoryClick('available')}
              disabled={counts.available === 0}
              className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 ${
                activeCategory === 'available'
                  ? 'bg-blue-950/50 border-blue-500/80 shadow-lg shadow-blue-500/20 scale-105'
                  : 'bg-blue-950/30 border-blue-500/40 hover:border-blue-500/60 hover:bg-blue-950/40'
              } ${counts.available === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-blue-400 text-2xl font-bold">{counts.available}</div>
              <div className="text-white/70 text-sm">{t('available')}</div>
            </button>

            {/* Unlikely Card */}
            <button
              onClick={() => counts.unlikely > 0 && handleCategoryClick('unlikely')}
              disabled={counts.unlikely === 0}
              className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 ${
                activeCategory === 'unlikely'
                  ? 'bg-red-950/50 border-red-500/80 shadow-lg shadow-red-500/20 scale-105'
                  : 'bg-red-950/30 border-red-500/40 hover:border-red-500/60 hover:bg-red-950/40'
              } ${counts.unlikely === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-red-400 text-2xl font-bold">{counts.unlikely}</div>
              <div className="text-white/70 text-sm">{t('unlikely')}</div>
            </button>
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      {selectedProgram && universitiesWithProgram.length > 0 && activeCategory && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-sm">View:</span>
            <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="text-sm font-medium">List</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  viewMode === 'map'
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <Map className="w-4 h-4" />
                <span className="text-sm font-medium">Map</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* University Results - Conditionally Rendered */}
      {selectedProgram && universitiesWithProgram.length > 0 && activeCategory && (
        <div 
          id="university-results"
          ref={resultsSectionRef}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Map View */}
          {viewMode === 'map' && (
            <div className="mb-6">
              <NCMap
                universities={groupedUniversities[activeCategory]}
                onMarkerClick={(universityName) => {
                  // Scroll to the university in the list view
                  const element = document.getElementById(`university-${universityName.replace(/\s+/g, '-')}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Temporarily switch to list view to show the highlighted item
                    setTimeout(() => setViewMode('list'), 500);
                  }
                }}
              />
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <>
          {/* High Chance Universities */}
          {activeCategory === 'safe' && groupedUniversities.safe.length > 0 && (
            <div className="transition-all duration-300">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                {t('highChance')} ({groupedUniversities.safe.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedUniversities.safe.map((item, idx) => {
                  const styles = getMatchTypeStyles(item.matchType);
                  return (
                    <div
                      id={`university-${item.university.name.replace(/\s+/g, '-')}`}
                      key={`${item.university.name}-${idx}`}
                      className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 hover:scale-105 ${styles.container}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-semibold text-white flex-1">{item.university.name}</div>
                        {/* Institution Type Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${
                          item.university.institutionType === 'FH'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}>
                          {item.university.institutionType === 'FH' ? 'FH' : 'Uni'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{item.university.city || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${styles.badge}`}>
                          {getMatchTypeLabel(item.matchType, t)}
                        </span>
                        {!item.isNCFree && (
                          <span className="text-white/60 text-xs">NC: {item.ncThreshold.toFixed(1)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5 group relative">
                          <Info className="w-3.5 h-3.5 text-white/50 cursor-help" />
                          <span className="text-white/60 text-xs">Semestergebühren:</span>
                          <span className="text-white font-medium text-xs">
                            ~{item.university.semesterFee || 300}€
                          </span>
                          {/* Tooltip */}
                          <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-white/20 rounded-lg p-3 text-xs text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                            <p className="font-semibold text-white mb-1">Semestergebühren</p>
                            <p>Enthält in der Regel das Semesterticket (öffentlicher Nahverkehr) und Verwaltungsgebühren.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Potential Chance Universities */}
          {activeCategory === 'reach' && groupedUniversities.reach.length > 0 && (
            <div className="transition-all duration-300">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                {t('potentialChance')} ({groupedUniversities.reach.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedUniversities.reach.map((item, idx) => {
                  const styles = getMatchTypeStyles(item.matchType);
                  return (
                    <div
                      id={`university-${item.university.name.replace(/\s+/g, '-')}`}
                      key={`${item.university.name}-${idx}`}
                      className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 hover:scale-105 ${styles.container}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-semibold text-white flex-1">{item.university.name}</div>
                        {/* Institution Type Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${
                          item.university.institutionType === 'FH'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}>
                          {item.university.institutionType === 'FH' ? 'FH' : 'Uni'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{item.university.city || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${styles.badge}`}>
                          {getMatchTypeLabel(item.matchType, t)}
                        </span>
                        {!item.isNCFree && (
                          <span className="text-white/60 text-xs">NC: {item.ncThreshold.toFixed(1)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5 group relative">
                          <Info className="w-3.5 h-3.5 text-white/50 cursor-help" />
                          <span className="text-white/60 text-xs">Semestergebühren:</span>
                          <span className="text-white font-medium text-xs">
                            ~{item.university.semesterFee || 300}€
                          </span>
                          {/* Tooltip */}
                          <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-white/20 rounded-lg p-3 text-xs text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                            <p className="font-semibold text-white mb-1">Semestergebühren</p>
                            <p>Enthält in der Regel das Semesterticket (öffentlicher Nahverkehr) und Verwaltungsgebühren.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available (NC-free) Universities */}
          {activeCategory === 'available' && groupedUniversities.available.length > 0 && (
            <div className="transition-all duration-300">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                {t('available')} ({groupedUniversities.available.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedUniversities.available.map((item, idx) => {
                  const styles = getMatchTypeStyles(item.matchType);
                  return (
                    <div
                      id={`university-${item.university.name.replace(/\s+/g, '-')}`}
                      key={`${item.university.name}-${idx}`}
                      className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 hover:scale-105 ${styles.container}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-semibold text-white flex-1">{item.university.name}</div>
                        {/* Institution Type Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${
                          item.university.institutionType === 'FH'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}>
                          {item.university.institutionType === 'FH' ? 'FH' : 'Uni'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{item.university.city || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${styles.badge}`}>
                          {getMatchTypeLabel(item.matchType, t)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5 group relative">
                          <Info className="w-3.5 h-3.5 text-white/50 cursor-help" />
                          <span className="text-white/60 text-xs">Semestergebühren:</span>
                          <span className="text-white font-medium text-xs">
                            ~{item.university.semesterFee || 300}€
                          </span>
                          {/* Tooltip */}
                          <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-white/20 rounded-lg p-3 text-xs text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                            <p className="font-semibold text-white mb-1">Semestergebühren</p>
                            <p>Enthält in der Regel das Semesterticket (öffentlicher Nahverkehr) und Verwaltungsgebühren.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unlikely Universities */}
          {activeCategory === 'unlikely' && groupedUniversities.unlikely.length > 0 && (
            <div className="transition-all duration-300">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                {t('unlikely')} ({groupedUniversities.unlikely.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedUniversities.unlikely.map((item, idx) => {
                  const styles = getMatchTypeStyles(item.matchType);
                  return (
                    <div
                      id={`university-${item.university.name.replace(/\s+/g, '-')}`}
                      key={`${item.university.name}-${idx}`}
                      className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-200 hover:scale-105 ${styles.container}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-semibold text-white flex-1">{item.university.name}</div>
                        {/* Institution Type Badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${
                          item.university.institutionType === 'FH'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}>
                          {item.university.institutionType === 'FH' ? 'FH' : 'Uni'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{item.university.city || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${styles.badge}`}>
                          {getMatchTypeLabel(item.matchType, t)}
                        </span>
                        {!item.isNCFree && (
                          <span className="text-white/60 text-xs">NC: {item.ncThreshold.toFixed(1)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5 group relative">
                          <Info className="w-3.5 h-3.5 text-white/50 cursor-help" />
                          <span className="text-white/60 text-xs">Semestergebühren:</span>
                          <span className="text-white font-medium text-xs">
                            ~{item.university.semesterFee || 300}€
                          </span>
                          {/* Tooltip */}
                          <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-white/20 rounded-lg p-3 text-xs text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                            <p className="font-semibold text-white mb-1">Semestergebühren</p>
                            <p>Enthält in der Regel das Semesterticket (öffentlicher Nahverkehr) und Verwaltungsgebühren.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* No Results Message */}
      {selectedProgram && userGrade !== null && universitiesWithProgram.length === 0 && (
        <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 text-center">
          <Info className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-white/70">{t('noUniversitiesFound')}</p>
        </div>
      )}

      {/* Alternative Paths */}
      {showAlternatives && (
        <div className="mt-12">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{t('alternativesTitle')}</h2>
            <p className="text-white/70">{t('alternativesSubtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Private Universities */}
            <div className="backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-blue-500/50 transition-all">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Building2 className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{t('alternativePrivate')}</h4>
                  <p className="text-xs text-white/70">{t('alternativePrivateDesc')}</p>
                </div>
              </div>
              <a
                href="#"
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {t('viewPrograms')}
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className="text-center mt-2">
                <AffiliateLabel variant="subtle" />
              </div>
            </div>

            {/* Study Abroad */}
            <div className="backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-blue-500/50 transition-all">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{t('alternativeStudyAbroad')}</h4>
                  <p className="text-xs text-white/70">{t('alternativeStudyAbroadDesc')}</p>
                </div>
              </div>
              <a
                href="#"
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {t('viewPrograms')}
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className="text-center mt-2">
                <AffiliateLabel variant="subtle" />
              </div>
            </div>

            {/* Dual Studies */}
            <div className="backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-blue-500/50 transition-all">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Briefcase className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{t('alternativeDualStudies')}</h4>
                  <p className="text-xs text-white/70">{t('alternativeDualStudiesDesc')}</p>
                </div>
              </div>
              <a
                href="#"
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {t('viewPrograms')}
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className="text-center mt-2">
                <AffiliateLabel variant="subtle" />
              </div>
            </div>

            {/* Prep Courses */}
            <div className="backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:border-blue-500/50 transition-all">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{t('alternativePrepCourses')}</h4>
                  <p className="text-xs text-white/70">{t('alternativePrepCoursesDesc')}</p>
                </div>
              </div>
              <a
                href="#"
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {t('viewPrograms')}
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className="text-center mt-2">
                <AffiliateLabel variant="subtle" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NC Disclaimer */}
      {userGrade !== null && selectedProgram && (
        <div className="backdrop-blur-sm bg-blue-950/30 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-white/80">
              <p className="mb-2 font-medium">{t('disclaimerTitle')}</p>
              <p className="text-xs text-white/70">{t('disclaimerText')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
