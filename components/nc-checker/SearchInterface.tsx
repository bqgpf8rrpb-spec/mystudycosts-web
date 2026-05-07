'use client';
// DEPRECATED: Legacy NC search interface. Active NC checker flow uses components/NCCheckerContent.tsx.

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, MapPin, Check, TrendingDown, X, Loader2, Info } from 'lucide-react';
import ProgramCard, { type NCIndexEntry } from './ProgramCard';
import AffiliateResultCard from './AffiliateResultCard';
import { searchNCIndex, type FeaturedPartner } from '@/lib/api';
import { getCostTransparencyText } from '@/lib/costs';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { formatCurrency } from '@/lib/format';

// All German states (for filter options)
const GERMAN_STATES = [
  'Baden-Württemberg',
  'Bayern',
  'Berlin',
  'Brandenburg',
  'Bremen',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen',
  'NRW',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
] as const;

type UniversityType = 'Alle' | 'Uni' | 'FH' | 'Privat';

export default function SearchInterface() {
  // Filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<UniversityType>('Alle');
  const [englishOnly, setEnglishOnly] = useState<boolean>(false); // English-taught filter
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [filteredResults, setFilteredResults] = useState<NCIndexEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userGpa, setUserGpa] = useState<number | null>(null); // User GPA for admission chances
  const [featuredPartner, setFeaturedPartner] = useState<FeaturedPartner | null>(null);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search function
  const performSearch = useCallback(async () => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setIsLoading(true);

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Build query parameters
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.append('q', searchTerm.trim());
    }
    if (selectedType !== 'Alle') {
      params.append('type', selectedType);
    }
    selectedStates.forEach((state) => {
      params.append('state', state);
    });
    params.append('limit', '100'); // Get more results for filtering

    // Debounce before making the request
    const timer = setTimeout(async () => {
      try {
        // Use the type-safe API client function
        const data = await searchNCIndex(searchTerm.trim() || '', {
          type: selectedType !== 'Alle' ? selectedType : undefined,
          state: selectedStates.length > 0 ? selectedStates[0] : undefined, // API supports single state for now
          limit: 100,
          englishOnly: englishOnly,
          userGpa: userGpa !== null ? userGpa.toString() : undefined,
        });
        
        // Filter by multiple states on client side if needed
        let results = data.results || [];
        if (selectedStates.length > 0) {
          results = results.filter((entry) => 
            selectedStates.includes(entry.state || '')
          );
        }
        
        setFilteredResults(results as NCIndexEntry[]);
        
        // Set featured partner if available
        if (data.featuredPartner) {
          setFeaturedPartner(data.featuredPartner);
        } else {
          setFeaturedPartner(null);
        }
      } catch (error: any) {
        // Error handling is done in the API client
        console.error('Search error:', error);
        setFilteredResults([]);
        setFeaturedPartner(null);
      } finally {
        setIsLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    debounceTimerRef.current = timer;
  }, [searchTerm, selectedStates, selectedType, englishOnly, userGpa]);

  // Trigger search when filters change
  useEffect(() => {
    performSearch();
    
    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchTerm, selectedStates, selectedType, englishOnly, performSearch]);

  // Price Insights: Calculate top 5 cheapest cities based on filtered results
  const topCitiesByPrice = useMemo(() => {
    if (filteredResults.length === 0) {
      return [];
    }

    // Group by city and calculate average costs
    const cityCosts = new Map<string, { total: number; count: number }>();

    filteredResults.forEach((entry) => {
      const city = entry.city;
      const cost = entry.totalMonthlyCosts;

      if (cityCosts.has(city)) {
        const existing = cityCosts.get(city)!;
        existing.total += cost;
        existing.count += 1;
      } else {
        cityCosts.set(city, { total: cost, count: 1 });
      }
    });

    // Calculate averages and convert to array
    const cityAverages = Array.from(cityCosts.entries())
      .map(([city, data]) => ({
        city,
        averageCost: data.total / data.count,
        programCount: data.count,
      }))
      .filter((item) => item.averageCost > 0) // Only include cities with costs
      .sort((a, b) => a.averageCost - b.averageCost) // Sort by average cost (ascending)
      .slice(0, 5); // Take top 5

    return cityAverages;
  }, [filteredResults]);

  // Count unique cities in filtered results
  const uniqueCitiesCount = useMemo(() => {
    const cities = new Set(filteredResults.map((entry) => entry.city));
    return cities.size;
  }, [filteredResults]);

  // Toggle state selection
  const toggleState = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStates([]);
    setSelectedType('Alle');
    setEnglishOnly(false);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="flex">
        {/* Sidebar - Left, Sticky (Desktop only) */}
        <aside className="hidden md:block w-64 bg-slate-900 border-r border-slate-800 sticky top-0 h-screen overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Sidebar Header */}
            <div className="flex items-center gap-2 mb-6">
              <Filter className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-semibold text-lg">Filter</h2>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* English-taught Only Filter */}
            <div className="pt-2 border-t border-slate-700">
              <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-800/50 transition-colors touch-manipulation min-h-[44px]">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={englishOnly}
                    onChange={(e) => setEnglishOnly(e.target.checked)}
                    className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 appearance-none checked:bg-blue-600 checked:border-blue-600 transition-colors touch-manipulation"
                  />
                  {englishOnly && (
                    <svg
                      className="absolute left-0 top-0 w-5 h-5 text-white pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-slate-300 group-hover:text-white text-sm font-medium">
                    Show English-taught programs only
                  </span>
                  <span className="block text-xs text-slate-500 mt-0.5">
                    🇬🇧 Filter for programs taught in English
                  </span>
                </div>
              </label>
            </div>

            {/* Type Filter - Radio Buttons */}
            <div className="space-y-3">
              <h3 className="text-slate-300 font-medium text-sm flex items-center gap-2">
                <Filter className="w-4 h-4" />
                University Type
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-800/50 transition-colors touch-manipulation min-h-[44px]">
                  <input
                    type="radio"
                    name="type"
                    value="Alle"
                    checked={selectedType === 'Alle'}
                    onChange={() => setSelectedType('Alle')}
                    className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-2 touch-manipulation"
                  />
                  <span className="text-slate-300 group-hover:text-white text-sm">
                    All
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-800/50 transition-colors touch-manipulation min-h-[44px]">
                  <input
                    type="radio"
                    name="type"
                    value="Uni"
                    checked={selectedType === 'Uni'}
                    onChange={() => setSelectedType('Uni')}
                    className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-2 touch-manipulation"
                  />
                  <span className="text-slate-300 group-hover:text-white text-sm">
                    University
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-800/50 transition-colors touch-manipulation min-h-[44px]">
                  <input
                    type="radio"
                    name="type"
                    value="FH"
                    checked={selectedType === 'FH'}
                    onChange={() => setSelectedType('FH')}
                    className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-2 touch-manipulation"
                  />
                  <span className="text-slate-300 group-hover:text-white text-sm">
                    Applied Sciences
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-800/50 transition-colors touch-manipulation min-h-[44px]">
                  <input
                    type="radio"
                    name="type"
                    value="Privat"
                    checked={selectedType === 'Privat'}
                    onChange={() => setSelectedType('Privat')}
                    className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-2 touch-manipulation"
                  />
                  <span className="text-slate-300 group-hover:text-white text-sm">
                    Private
                  </span>
                </label>
              </div>
            </div>

            {/* State Filter - Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-300 font-medium text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  States
                </h3>
                {selectedStates.length > 0 && (
                  <button
                    onClick={() => setSelectedStates([])}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {GERMAN_STATES.map((state) => (
                  <label
                    key={state}
                    className="flex items-center gap-3 cursor-pointer group py-2 px-2 rounded-lg hover:bg-slate-800/50 transition-colors touch-manipulation min-h-[44px]"
                  >
                    <div className="relative flex items-center flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={selectedStates.includes(state)}
                        onChange={() => toggleState(state)}
                        className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 appearance-none checked:bg-blue-600 checked:border-blue-600 touch-manipulation"
                      />
                      {selectedStates.includes(state) && (
                        <Check className="absolute left-0 w-5 h-5 text-white pointer-events-none" />
                      )}
                    </div>
                    <span className="text-slate-300 group-hover:text-white text-sm">
                      {state}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear All Filters */}
            {(searchTerm || selectedStates.length > 0 || selectedType !== 'Alle') && (
              <button
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors text-sm"
              >
                <Filter className="w-4 h-4" />
                Reset All Filters
              </button>
            )}

            {/* Results Count */}
            <div className="pt-4 border-t border-slate-800">
              <div className="text-sm text-slate-400">
                <span className="font-semibold text-white">
                  {filteredResults.length}
                </span>{' '}
                {filteredResults.length === 1 ? 'result' : 'results'}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Search and Filter Bar - Fixed at Top */}
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-slate-900 border-b border-slate-800">
          {/* Search Bar - Top */}
          <div className="p-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-11 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
              />
            </div>
          </div>
          
          {/* Quick Filters Row - Compact, Scrollable */}
          <div className="px-4 pb-3 overflow-x-auto -mx-4">
            <div className="flex items-center gap-2 px-4 min-w-max">
              {/* English-only Toggle - Touch-Friendly */}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 touch-manipulation min-h-[44px] whitespace-nowrap">
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={englishOnly}
                    onChange={(e) => setEnglishOnly(e.target.checked)}
                    className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 appearance-none checked:bg-blue-600 checked:border-blue-600 transition-colors"
                  />
                  {englishOnly && (
                    <svg
                      className="absolute left-0 top-0 w-5 h-5 text-white pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-slate-300 text-sm font-medium">
                  🇬🇧 English
                </span>
              </label>

              {/* Type Filter Buttons - Compact */}
              <div className="flex items-center gap-1.5 bg-slate-800/60 border border-slate-700 rounded-lg p-1 touch-manipulation">
                {(['Alle', 'Uni', 'FH', 'Privat'] as UniversityType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-all min-h-[36px] touch-manipulation ${
                      selectedType === type
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    {type === 'Alle' ? 'All' : type === 'Uni' ? 'Uni' : type === 'FH' ? 'FH' : 'Privat'}
                  </button>
                ))}
              </div>

              {/* Filter Button - Opens Full Filter Panel */}
              <button
                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg transition-colors min-h-[44px] touch-manipulation whitespace-nowrap"
              >
                <Filter className="w-5 h-5 text-blue-400" />
                <span className="font-medium text-sm">Filters</span>
                {(selectedStates.length > 0 || selectedType !== 'Alle' || searchTerm || englishOnly) && (
                  <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
                    {[selectedStates.length, selectedType !== 'Alle' ? 1 : 0, searchTerm ? 1 : 0, englishOnly ? 1 : 0].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Filter Overlay */}
        {isMobileFilterOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm">
            <div className="h-full overflow-y-auto">
              <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
                <h2 className="text-white font-semibold text-lg">Filters</h2>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Mobile Search Input - Removed (now at top) */}

                {/* Mobile Type Filter */}
                <div className="space-y-3">
                  <h3 className="text-slate-300 font-medium text-sm flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    University Type
                  </h3>
                  <div className="space-y-2">
                    {(['Alle', 'Uni', 'FH', 'Privat'] as UniversityType[]).map((type) => (
                      <label key={type} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-slate-800/50 transition-colors touch-manipulation min-h-[44px]">
                        <div className="relative flex-shrink-0">
                          <input
                            type="radio"
                            name="type"
                            value={type}
                            checked={selectedType === type}
                            onChange={() => setSelectedType(type)}
                            className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-2 touch-manipulation"
                          />
                        </div>
                        <span className="text-slate-300 group-hover:text-white text-sm">
                          {type === 'Alle' ? 'All' : type === 'Uni' ? 'University' : type === 'FH' ? 'Applied Sciences' : 'Private'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Mobile State Filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-slate-300 font-medium text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      States
                    </h3>
                    {selectedStates.length > 0 && (
                      <button
                        onClick={() => setSelectedStates([])}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {GERMAN_STATES.map((state) => (
                      <label
                        key={state}
                        className="flex items-center gap-3 cursor-pointer group py-2 px-2 rounded-lg hover:bg-slate-800/50 transition-colors touch-manipulation min-h-[44px]"
                      >
                        <div className="relative flex items-center flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedStates.includes(state)}
                            onChange={() => toggleState(state)}
                            className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 appearance-none checked:bg-blue-600 checked:border-blue-600 touch-manipulation"
                          />
                          {selectedStates.includes(state) && (
                            <Check className="absolute left-0 w-5 h-5 text-white pointer-events-none" />
                          )}
                        </div>
                        <span className="text-slate-300 group-hover:text-white text-sm">
                          {state}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Mobile English-taught Only Filter */}
                <div className="pt-2 border-t border-slate-700">
                  <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-lg hover:bg-slate-800/50 transition-colors touch-manipulation min-h-[44px]">
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={englishOnly}
                        onChange={(e) => setEnglishOnly(e.target.checked)}
                        className="w-5 h-5 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 appearance-none checked:bg-blue-600 checked:border-blue-600 transition-colors touch-manipulation"
                      />
                      {englishOnly && (
                        <svg
                          className="absolute left-0 top-0 w-5 h-5 text-white pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="text-slate-300 group-hover:text-white text-sm font-medium">
                        Show English-taught programs only
                      </span>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        🇬🇧 Filter for programs taught in English
                      </span>
                    </div>
                  </label>
                </div>

                {/* Mobile Clear Filters */}
                {(searchTerm || selectedStates.length > 0 || selectedType !== 'Alle' || englishOnly) && (
                  <button
                    onClick={() => {
                      clearFilters();
                      setIsMobileFilterOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors text-sm"
                  >
                    <Filter className="w-4 h-4" />
                    Reset All Filters
                  </button>
                )}

                {/* Mobile Results Count */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="text-sm text-slate-400">
                    <span className="font-semibold text-white">
                      {filteredResults.length}
                    </span>{' '}
                    {filteredResults.length === 1 ? 'result' : 'results'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area - Card Grid */}
        <main className="flex-1 p-4 md:p-6 md:pt-6 pt-40">
          {/* Price Insights Section */}
          {uniqueCitiesCount > 3 && topCitiesByPrice.length > 0 && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-8">
              <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
                Most Affordable Locations for Your Search
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {topCitiesByPrice.map((cityData) => (
                  <div
                    key={cityData.city}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 flex items-center gap-3 flex-shrink-0"
                  >
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                    <div className="flex flex-col">
                      <span className="text-white text-sm font-medium">
                        {cityData.city}
                      </span>
                      <span className="text-emerald-400 font-bold text-sm">
                        Ø {formatCurrency(cityData.averageCost, 'EUR', 1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="w-12 h-12 text-blue-400 mb-4 animate-spin" />
              <p className="text-slate-400 text-lg mb-2">
                Searching...
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-12 h-12 text-slate-600 mb-4" />
              <p className="text-slate-400 text-lg mb-2">
                {englishOnly 
                  ? 'No English-taught programs found for this search'
                  : 'We couldn\'t find this specific program'}
              </p>
              {englishOnly ? (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg max-w-md">
                  <p className="text-slate-300 text-sm mb-3">
                    Would you like to see German programs with English support instead?
                  </p>
                  <button
                    onClick={() => setEnglishOnly(false)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Show All Programs
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-slate-500 text-sm mb-4 max-w-md">
                    Try different search terms or adjust the filters. You can also check high-admission alternatives in major cities like Berlin, Munich, or Hamburg.
                  </p>
                  {/* Alternative suggestions based on query */}
                  {searchTerm.trim() && (
                    <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg max-w-md">
                      <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                        Similar High-Admission Alternatives
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt'].map((city) => (
                          <button
                            key={city}
                            onClick={() => {
                              setSearchTerm('');
                              // TODO: Filter by city or show alternatives
                              console.log('Show alternatives in', city);
                            }}
                            className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-md text-blue-400 text-xs font-medium transition-colors"
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              {/* GPA Input for Admission Chances (only show if results exist) */}
              <div className="mb-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                <label className="block text-sm font-medium text-blue-400 mb-2">
                  Enter Your GPA for Admission Chances
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="4.0"
                    value={userGpa ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setUserGpa(value === '' ? null : parseFloat(value));
                    }}
                    placeholder="e.g., 2.5"
                    className="flex-1 px-4 py-3 sm:py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation"
                  />
                  <span className="text-xs text-slate-400 sm:whitespace-nowrap">
                    (German scale: 1.0 = best, 4.0 = pass)
                  </span>
                </div>
                {userGpa !== null && (
                  <p className="mt-2 text-xs text-slate-400">
                    Admission chances will be calculated for all programs based on your GPA.
                  </p>
                )}
              </div>

              {/* Featured Partner / Affiliate Card - Show at top if available */}
              {featuredPartner && (
                <AffiliateResultCard partner={featuredPartner} locale="en" />
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredResults.map((entry, index) => (
                  <ProgramCard
                    key={`${entry.university}-${entry.programName}-${index}`}
                    program={entry}
                    userGpa={userGpa ?? undefined}
                    onDetailsClick={() => {
                      // TODO: Implement details navigation
                      console.log('Details clicked for:', entry.programName);
                    }}
                    onConsultationClick={() => {
                      // TODO: Implement consultation booking
                      console.log('Consultation clicked for:', entry.programName);
                    }}
                  />
                ))}
              </div>

              {/* Legal Disclaimer & Cost Transparency - 2026 Legal Safety */}
              <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
                {/* Cost Transparency */}
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4 max-w-4xl mx-auto">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <strong className="text-slate-300 font-medium">Cost Transparency:</strong> {getCostTransparencyText('en')}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Legal Disclaimer */}
                <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-4 max-w-4xl mx-auto">
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-400 leading-relaxed">
                        <strong className="text-slate-300 font-medium">Legal Disclaimer:</strong> NC values are estimates for the 2026 intake based on historical data. 
                        No guarantee of admission. Semester fees and rent estimates are based on market data from January 2026. 
                        Always verify current requirements and costs directly with the university.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

