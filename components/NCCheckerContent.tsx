'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { GraduationCap, CheckCircle2, AlertTriangle, Info, Award, Building2, Globe, Briefcase, BookOpen, ExternalLink, Search, ChevronDown, Check, X, MapPin, Map as MapIcon, List, Scale } from 'lucide-react';
import ncSearchIndex from '@/data/nc_search_index.json';
import GradeInput from '@/components/GradeInput';
import {
  getProgramMatchType,
  getMatchTypeStyles,
  getMatchTypeLabel,
  type ProgramMatchType,
} from '@/lib/nc-filter';
import { type StudyProgram, getProgramName } from '@/data/university-program-types';
import AffiliateLabel from '@/components/AffiliateLabel';
import { type NCIndexEntry } from '@/components/nc-checker/ProgramCard';
import { getSearchTerms } from '@/lib/search-mapping';
import dynamic from 'next/dynamic';
import MapSkeleton from '@/components/ui/MapSkeleton';
import ProgramCardSkeleton from '@/components/ui/ProgramCardSkeleton';
import NoResults from '@/components/nc-checker/NoResults';

// Dynamically import NCMap to avoid SSR issues
const NCMap = dynamic(() => import('@/components/NCMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

import type { University, UniversityWithMatch } from '@/types/university';
import { DEFAULT_SEMESTER_FEE_FALLBACK } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';
import { calculateMonthlyRent } from '@/lib/costs';
import { calculateAdmissionChance } from '@/lib/nc-utils';
import ProgramComparison, { type ProgramComparisonItem } from '@/components/nc-checker/ProgramComparison';
import { useUserStore } from '@/lib/store/useUserStore';

const ENABLE_AFFILIATES = false;

export default function NCCheckerContent() {
  const t = useTranslations('NCChecker');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const userGrade = useUserStore((state) => state.userGpa);
  const setUserGrade = useUserStore((state) => state.setUserGpa);
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
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [extraComparisonItems, setExtraComparisonItems] = useState<Record<string, ProgramComparisonItem>>({});
  const [hasInitializedCompareFromUrl, setHasInitializedCompareFromUrl] = useState(false);

  const programContainerRef = useRef<HTMLDivElement>(null);
  const programTriggerRef = useRef<HTMLDivElement>(null);
  const stateContainerRef = useRef<HTMLDivElement>(null);
  const stateTriggerRef = useRef<HTMLDivElement>(null);

  // API state for program results (from nc_search_index via API)
  const [ncApiResults, setNcApiResults] = useState<NCIndexEntry[]>([]);
  const [ncLoading, setNcLoading] = useState(false);
  const [ncError, setNcError] = useState<string | null>(null);

  // Get all unique program names from nc_search_index (393-university dataset)
  const allPrograms = useMemo(() => {
    if (!Array.isArray(ncSearchIndex)) return [];
    const programSet = new Set<string>();
    ncSearchIndex.forEach((entry: { programName?: string }) => {
      if (entry.programName) programSet.add(entry.programName);
    });
    return Array.from(programSet).sort();
  }, []);

  // Map frontend state filter (English) to nc_search_index state (German)
  const STATE_ENGLISH_TO_GERMAN: Record<string, string> = {
    'Baden-Württemberg': 'Baden-Württemberg',
    'Bavaria': 'Bayern',
    'Berlin': 'Berlin',
    'Brandenburg': 'Brandenburg',
    'Bremen': 'Bremen',
    'Hamburg': 'Hamburg',
    'Hesse': 'Hessen',
    'Lower Saxony': 'Niedersachsen',
    'Mecklenburg-Vorpommern': 'Mecklenburg-Vorpommern',
    'North Rhine-Westphalia': 'NRW',
    'Rhineland-Palatinate': 'Rheinland-Pfalz',
    'Saarland': 'Saarland',
    'Saxony': 'Sachsen',
    'Saxony-Anhalt': 'Sachsen-Anhalt',
    'Schleswig-Holstein': 'Schleswig-Holstein',
    'Thuringia': 'Thüringen',
  };

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

  // Fetch universities for selected program from NC API (nc_search_index - 393 unis)
  useEffect(() => {
    if (!selectedProgram) {
      setNcApiResults([]);
      return;
    }
    setNcApiResults([]); // Clear stale data immediately
    setNcLoading(true);
    setNcError(null);
    const controller = new AbortController();

    const loadNcResults = async () => {
      try {
        const query = new URLSearchParams({ q: selectedProgram, limit: '500' });
        if (userGrade != null) query.set('userGpa', String(userGrade));

        const response = await fetch(`/api/search/nc?${query.toString()}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(t('failedToLoad'));
        }

        const data = (await response.json()) as { results?: NCIndexEntry[] };
        setNcApiResults(data.results ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : t('failedToLoad');
        setNcError(message);
        setNcApiResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setNcLoading(false);
        }
      }
    };

    void loadNcResults();
    return () => controller.abort();
  }, [selectedProgram, userGrade, t]);

  // Map ncApiResults to UniversityWithMatch, apply filters
  const universitiesWithProgram = useMemo(() => {
    if (!selectedProgram || ncApiResults.length === 0) return [];
    const targetState = stateFilter !== 'all' ? STATE_ENGLISH_TO_GERMAN[stateFilter] : null;
    const targetType = institutionTypeFilter === 'all' ? null : institutionTypeFilter;
    const filtered = ncApiResults
      .filter((e) => {
        if (targetState && e.state !== targetState) return false;
        if (targetType) {
          const entryType = e.type === 'FH' ? 'FH' : 'University';
          if (entryType !== targetType) return false;
        }
        return true;
      })
      .map((e): UniversityWithMatch => {
        const ncThreshold = e.nc ?? 0;
        const isNCFree = e.nc == null || e.nc === 0;
        const matchType =
          userGrade != null ? getProgramMatchType(userGrade, ncThreshold, isNCFree) : 'available';
        return {
          university: {
            name: e.university,
            city: e.city,
            state: e.state,
            type: 'public',
            institutionType: e.type === 'FH' ? 'FH' : 'University',
            semesterFee: e.semester_fee ?? DEFAULT_SEMESTER_FEE_FALLBACK,
          },
          program: { name: e.programName, nc_threshold: ncThreshold, waiting_semesters: 0 },
          matchType,
          ncThreshold,
          waitingSemesters: 0,
          isNCFree,
        };
      });
    filtered.sort((a, b) => {
      if (a.isNCFree && !b.isNCFree) return -1;
      if (!a.isNCFree && b.isNCFree) return 1;
      if (a.ncThreshold !== b.ncThreshold) return a.ncThreshold - b.ncThreshold;
      return a.university.name.localeCompare(b.university.name);
    });
    return filtered;
  }, [ncApiResults, selectedProgram, userGrade, stateFilter, institutionTypeFilter]);

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
          const feeA = a.university.semesterFee || DEFAULT_SEMESTER_FEE_FALLBACK;
          const feeB = b.university.semesterFee || DEFAULT_SEMESTER_FEE_FALLBACK;
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

  const parseComparisonId = (
    id: string
  ): { programName: string; university: string; city: string } | null => {
    const parts = id.split('__');
    if (parts.length < 3) return null;
    const city = parts.pop() ?? '';
    const university = parts.pop() ?? '';
    const programName = parts.join('__');
    if (!programName || !university || !city) return null;
    return { programName, university, city };
  };

  // Handle program selection
  const handleProgramSelect = (program: string) => {
    setSelectedProgram(program);
    setProgramDropdownOpen(false);
    setProgramSearch('');
    setActiveCategory(null); // Reset category when program changes
    setSelectedForComparison([]);
    setIsComparisonOpen(false);
  };

  const getComparisonId = (item: UniversityWithMatch): string =>
    `${item.program.name}__${item.university.name}__${item.university.city}`;

  const comparisonCandidates = useMemo<ProgramComparisonItem[]>(() => {
    if (selectedForComparison.length === 0) return [];
    const byId = new Map<string, ProgramComparisonItem>();

    universitiesWithProgram.forEach((item) => {
      const id = getComparisonId(item);
      const estimatedRent = Math.round(calculateMonthlyRent(item.university.city || '', 20));
      const normalizedNc = item.isNCFree ? null : item.ncThreshold;
      byId.set(id, {
        id,
        university: item.university.name,
        city: item.university.city || t('notAvailable'),
        programName: item.program.name,
        nc: normalizedNc,
        admissionBucket: calculateAdmissionChance(userGrade, normalizedNc),
        totalMonthlyCosts: item.university.semesterFee
          ? estimatedRent + Math.round((item.university.semesterFee || 0) / 6) + 480
          : estimatedRent + 530,
        estimatedRent,
      });
    });

    Object.values(extraComparisonItems).forEach((item) => {
      byId.set(item.id, item);
    });

    return selectedForComparison
      .map((id) => byId.get(id))
      .filter((value): value is ProgramComparisonItem => Boolean(value));
  }, [selectedForComparison, universitiesWithProgram, userGrade, t, extraComparisonItems]);

  const toggleComparisonSelection = (item: UniversityWithMatch) => {
    const id = getComparisonId(item);
    setSelectedForComparison((prev) => {
      if (prev.includes(id)) {
        return prev.filter((entry) => entry !== id);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const isSelectedForComparisonItem = (item: UniversityWithMatch): boolean => {
    return selectedForComparison.includes(getComparisonId(item));
  };

  // Initialize comparison selection from deep-link: ?compare=id1,id2,id3
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const compareParam = params.get('compare');
    if (!compareParam) {
      setHasInitializedCompareFromUrl(true);
      return;
    }

    const ids = compareParam
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 3);

    if (ids.length === 0) {
      setHasInitializedCompareFromUrl(true);
      return;
    }

    setSelectedForComparison(ids);
    const firstParsed = parseComparisonId(ids[0]);
    if (firstParsed && !selectedProgram) {
      setSelectedProgram(firstParsed.programName);
    }
    setHasInitializedCompareFromUrl(true);
  }, []);

  // Keep URL query in sync with current comparison selection.
  useEffect(() => {
    if (typeof window === 'undefined' || !hasInitializedCompareFromUrl) return;
    const url = new URL(window.location.href);
    if (selectedForComparison.length > 0) {
      url.searchParams.set('compare', selectedForComparison.join(','));
    } else {
      url.searchParams.delete('compare');
    }
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [selectedForComparison, hasInitializedCompareFromUrl]);

  // Fetch missing comparison programs from API for deep-links not in current list view.
  useEffect(() => {
    if (selectedForComparison.length === 0) return;

    const listIds = new Set(universitiesWithProgram.map((item) => getComparisonId(item)));
    const cacheIds = new Set(Object.keys(extraComparisonItems));
    const missingIds = selectedForComparison.filter((id) => !listIds.has(id) && !cacheIds.has(id));
    if (missingIds.length === 0) return;

    const groupedByProgram = new Map<string, Set<string>>();
    missingIds.forEach((id) => {
      const parsed = parseComparisonId(id);
      if (!parsed) return;
      const setForProgram = groupedByProgram.get(parsed.programName) ?? new Set<string>();
      setForProgram.add(id);
      groupedByProgram.set(parsed.programName, setForProgram);
    });

    if (groupedByProgram.size === 0) return;

    let cancelled = false;
    const loadMissingComparisons = async () => {
      const next: Record<string, ProgramComparisonItem> = {};

      for (const [programName, targetIds] of groupedByProgram.entries()) {
        const params = new URLSearchParams({ q: programName, limit: '500' });
        if (userGrade != null) params.set('userGpa', String(userGrade));
        try {
          const res = await fetch(`/api/search/nc?${params.toString()}`);
          const data = await res.json();
          const results = (data.results || []) as NCIndexEntry[];

          results.forEach((entry) => {
            const itemId = `${entry.programName}__${entry.university}__${entry.city}`;
            if (!targetIds.has(itemId)) return;
            const normalizedNc = entry.nc == null || entry.nc === 0 ? null : entry.nc;
            const estimatedRent = Math.round(calculateMonthlyRent(entry.city || '', 20));
            next[itemId] = {
              id: itemId,
              university: entry.university,
              city: entry.city || t('notAvailable'),
              programName: entry.programName,
              nc: normalizedNc,
              admissionBucket: calculateAdmissionChance(userGrade, normalizedNc),
              totalMonthlyCosts: entry.semester_fee
                ? estimatedRent + Math.round((entry.semester_fee || 0) / 6) + 480
                : estimatedRent + 530,
              estimatedRent,
            };
          });
        } catch {
          // Ignore per-program fetch errors; unresolved IDs remain absent.
        }
      }

      if (!cancelled && Object.keys(next).length > 0) {
        setExtraComparisonItems((prev) => ({ ...prev, ...next }));
      }
    };

    void loadMissingComparisons();
    return () => {
      cancelled = true;
    };
  }, [selectedForComparison, universitiesWithProgram, extraComparisonItems, userGrade, t]);

  // Trim cached comparison entries to active selection set.
  useEffect(() => {
    if (selectedForComparison.length === 0) {
      if (Object.keys(extraComparisonItems).length > 0) {
        setExtraComparisonItems({});
      }
      return;
    }
    setExtraComparisonItems((prev) => {
      const allowed = new Set(selectedForComparison);
      const trimmed = Object.fromEntries(
        Object.entries(prev).filter(([id]) => allowed.has(id))
      );
      return Object.keys(trimmed).length === Object.keys(prev).length ? prev : trimmed;
    });
  }, [selectedForComparison, extraComparisonItems]);

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
              data-testid="nc-program-search"
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
                    data-testid="nc-program-option"
                    data-program={program}
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

  const renderCompareToggle = (item: UniversityWithMatch) => {
    const itemId = getComparisonId(item);
    const isSelected = selectedForComparison.includes(itemId);
    const selectionLimitReached = selectedForComparison.length >= 3 && !isSelected;

    return (
      <button
        type="button"
        onClick={() => toggleComparisonSelection(item)}
        disabled={selectionLimitReached}
        className={`mt-3 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          isSelected
            ? 'border-blue-400/70 bg-blue-500/20 text-blue-200'
            : 'border-white/20 bg-slate-800/50 text-slate-300 hover:border-blue-400/60 hover:text-white'
        } ${selectionLimitReached ? 'cursor-not-allowed opacity-40' : ''}`}
      >
        <Scale className="h-3.5 w-3.5" />
        {isSelected ? t('selected') : t('compare')}
      </button>
    );
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
            data-testid="nc-program-trigger"
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
        <NoResults
          onWidenSearch={() => {
            setStateFilter('all');
            setInstitutionTypeFilter('all');
          }}
          onSelectOtherState={() => setStateDropdownOpen(true)}
          onShowAllPrograms={() => {
            setSelectedProgram('');
            setActiveCategory(null);
            setSelectedForComparison([]);
          }}
        />
      )}

      {/* Loading state */}
      {selectedProgram && ncLoading && (
        <div className="space-y-4 transition-opacity duration-300">
          <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 text-center">
            <p className="text-white/70">{t('loadingUniversities')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProgramCardSkeleton />
            <ProgramCardSkeleton />
            <ProgramCardSkeleton />
          </div>
        </div>
      )}

      {/* Error state */}
      {selectedProgram && ncError && (
        <div className="backdrop-blur-sm bg-red-950/30 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-300">{ncError}</p>
        </div>
      )}

      {/* Results Summary - Interactive Cards */}
      {selectedProgram && !ncLoading && (
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
                  t('institutionsOfferProgramWithType', {
                    count: universitiesWithProgram.length,
                    type: institutionTypeFilter === 'FH' ? t('fh') : t('university')
                  })
                )}
              </p>
            ) : (
              <p className="text-white/80 text-lg">
                <span className="font-semibold text-white">{universitiesWithProgram.length}</span>{' '}
                {t('universitiesOfferProgram', { count: universitiesWithProgram.length })}
              </p>
            )}
          </div>

          {/* Category Cards - only when GPA is entered */}
          {userGrade !== null && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* High Chance Card */}
            <button
              data-testid="nc-category-safe"
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
              data-testid="nc-category-reach"
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
              data-testid="nc-category-available"
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
              data-testid="nc-category-unlikely"
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
          )}
        </div>
      )}

      {/* View Mode Toggle - show when we have results and (category selected OR no GPA) */}
      {selectedProgram && universitiesWithProgram.length > 0 && (activeCategory || userGrade === null) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-white/70 text-sm">{t('viewLabel')}</span>
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
                <span className="text-sm font-medium">{t('viewList')}</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                  viewMode === 'map'
                    ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                <MapIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{t('viewMap')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* University Results - show when (category selected OR no GPA = all universities) */}
      {selectedProgram && universitiesWithProgram.length > 0 && (activeCategory || userGrade === null) && (
        <div 
          id="university-results"
          ref={resultsSectionRef}
          className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Map View */}
          {viewMode === 'map' && (
            <div className="mb-6">
              <NCMap
                universities={userGrade === null ? universitiesWithProgram : groupedUniversities[activeCategory!]}
                onMarkerClick={(universityName) => {
                  // Scroll to the university in the list view
                  const element = document.getElementById(`university-${universityName.replace(/\s+/g, '-')}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Temporarily switch to list view to show the highlighted item
                    setTimeout(() => setViewMode('list'), 500);
                  }
                }}
                onToggleComparison={toggleComparisonSelection}
                isSelectedForComparison={isSelectedForComparisonItem}
              />
            </div>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <>
          {/* No GPA: show all universities in one neutral list */}
          {userGrade === null && universitiesWithProgram.length > 0 && (
            <div className="transition-all duration-300">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                {t('allAvailableUniversities')} ({universitiesWithProgram.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {universitiesWithProgram.map((item, idx) => (
                  <div
                    data-testid="nc-result-card"
                    id={`university-${item.university.name.replace(/\s+/g, '-')}`}
                    key={`${item.university.name}-${idx}`}
                    className="backdrop-blur-sm border border-white/20 rounded-xl p-4 transition-all duration-200 hover:scale-105 bg-slate-950/30"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-semibold text-white flex-1">{item.university.name}</div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border flex-shrink-0 ${
                        item.university.institutionType === 'FH'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}>
                        {item.university.institutionType === 'FH' ? 'FH' : t('uniShort')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{item.university.city || t('notAvailable')}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {!item.isNCFree && (
                        <span className="text-white/60 text-xs">NC: {item.ncThreshold.toFixed(1)}</span>
                      )}
                      {item.isNCFree && (
                        <span className="text-blue-400/80 text-xs">{t('available')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                      <span className="text-white/60 text-xs">{t('semesterFeeLabel')}</span>
                      <span className="text-white font-medium text-xs">
                        ~{formatCurrency(item.university.semesterFee || DEFAULT_SEMESTER_FEE_FALLBACK, 'EUR', 1)}
                      </span>
                    </div>
                    {renderCompareToggle(item)}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* With GPA: show categorized sections */}
          {userGrade !== null && activeCategory === 'safe' && groupedUniversities.safe.length > 0 && (
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
                      data-testid="nc-result-card"
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
                          {item.university.institutionType === 'FH' ? 'FH' : t('uniShort')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{item.university.city || t('notAvailable')}</span>
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
                          <span className="text-white/60 text-xs">{t('semesterFeeLabel')}</span>
                          <span className="text-white font-medium text-xs">
                            ~{formatCurrency(item.university.semesterFee || DEFAULT_SEMESTER_FEE_FALLBACK, 'EUR', 1)}
                          </span>
                          {/* Tooltip */}
                          <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-white/20 rounded-lg p-3 text-xs text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                            <p className="font-semibold text-white mb-1">{t('semesterFeeTooltipTitle')}</p>
                            <p>{t('semesterFeeTooltipBody')}</p>
                          </div>
                        </div>
                      </div>
                      {renderCompareToggle(item)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Potential Chance Universities */}
          {userGrade !== null && activeCategory === 'reach' && groupedUniversities.reach.length > 0 && (
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
                      data-testid="nc-result-card"
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
                          {item.university.institutionType === 'FH' ? 'FH' : t('uniShort')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{item.university.city || t('notAvailable')}</span>
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
                          <span className="text-white/60 text-xs">{t('semesterFeeLabel')}</span>
                          <span className="text-white font-medium text-xs">
                            ~{formatCurrency(item.university.semesterFee || DEFAULT_SEMESTER_FEE_FALLBACK, 'EUR', 1)}
                          </span>
                          {/* Tooltip */}
                          <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-white/20 rounded-lg p-3 text-xs text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                            <p className="font-semibold text-white mb-1">{t('semesterFeeTooltipTitle')}</p>
                            <p>{t('semesterFeeTooltipBody')}</p>
                          </div>
                        </div>
                      </div>
                      {renderCompareToggle(item)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available (NC-free) Universities */}
          {userGrade !== null && activeCategory === 'available' && groupedUniversities.available.length > 0 && (
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
                      data-testid="nc-result-card"
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
                          {item.university.institutionType === 'FH' ? 'FH' : t('uniShort')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{item.university.city || t('notAvailable')}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${styles.badge}`}>
                          {getMatchTypeLabel(item.matchType, t)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5 group relative">
                          <Info className="w-3.5 h-3.5 text-white/50 cursor-help" />
                          <span className="text-white/60 text-xs">{t('semesterFeeLabel')}</span>
                          <span className="text-white font-medium text-xs">
                            ~{formatCurrency(item.university.semesterFee || DEFAULT_SEMESTER_FEE_FALLBACK, 'EUR', 1)}
                          </span>
                          {/* Tooltip */}
                          <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-white/20 rounded-lg p-3 text-xs text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                            <p className="font-semibold text-white mb-1">{t('semesterFeeTooltipTitle')}</p>
                            <p>{t('semesterFeeTooltipBody')}</p>
                          </div>
                        </div>
                      </div>
                      {renderCompareToggle(item)}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unlikely Universities */}
          {userGrade !== null && activeCategory === 'unlikely' && groupedUniversities.unlikely.length > 0 && (
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
                      data-testid="nc-result-card"
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
                          {item.university.institutionType === 'FH' ? 'FH' : t('uniShort')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70 text-sm mb-2">
                        <MapPin className="w-4 h-4" />
                        <span>{item.university.city || t('notAvailable')}</span>
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
                          <span className="text-white/60 text-xs">{t('semesterFeeLabel')}</span>
                          <span className="text-white font-medium text-xs">
                            ~{formatCurrency(item.university.semesterFee || DEFAULT_SEMESTER_FEE_FALLBACK, 'EUR', 1)}
                          </span>
                          {/* Tooltip */}
                          <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-white/20 rounded-lg p-3 text-xs text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                            <p className="font-semibold text-white mb-1">{t('semesterFeeTooltipTitle')}</p>
                            <p>{t('semesterFeeTooltipBody')}</p>
                          </div>
                        </div>
                      </div>
                      {renderCompareToggle(item)}
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

      {selectedForComparison.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-[110] flex justify-center px-4">
          <div className="flex w-full max-w-3xl items-center justify-between gap-3 rounded-xl border border-blue-400/35 bg-slate-900/95 px-4 py-3 shadow-2xl shadow-blue-950/40 backdrop-blur-sm">
            <div className="text-sm text-white">
              <span className="font-semibold text-blue-200">{selectedForComparison.length}</span>{' '}
              {selectedForComparison.length === 1 ? t('programSelectedSingle') : t('programSelectedPlural')}
              <span className="ml-2 text-xs text-white/60">{t('maxSelectionHint')}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedForComparison([])}
                className="rounded-md border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
              >
                {t('resetSelection')}
              </button>
              <button
                type="button"
                onClick={() => setIsComparisonOpen(true)}
                className="rounded-md border border-blue-300/50 bg-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-100 transition-colors hover:bg-blue-500/30"
              >
                {t('compareNow')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ProgramComparison
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        programs={comparisonCandidates}
      />

      {/* No Results Message */}
      {selectedProgram && userGrade !== null && universitiesWithProgram.length === 0 && (
        <NoResults
          onWidenSearch={() => {
            setStateFilter('all');
            setInstitutionTypeFilter('all');
          }}
          onSelectOtherState={() => setStateDropdownOpen(true)}
          onShowAllPrograms={() => {
            setSelectedProgram('');
            setActiveCategory(null);
            setSelectedForComparison([]);
          }}
        />
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
              {ENABLE_AFFILIATES && (
                <div className="text-center mt-2">
                  <AffiliateLabel variant="subtle" />
                </div>
              )}
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
              {ENABLE_AFFILIATES && (
                <div className="text-center mt-2">
                  <AffiliateLabel variant="subtle" />
                </div>
              )}
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
              {ENABLE_AFFILIATES && (
                <div className="text-center mt-2">
                  <AffiliateLabel variant="subtle" />
                </div>
              )}
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
              {ENABLE_AFFILIATES && (
                <div className="text-center mt-2">
                  <AffiliateLabel variant="subtle" />
                </div>
              )}
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
