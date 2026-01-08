'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, MapPin, Check, TrendingDown } from 'lucide-react';
import ncSearchIndex from '@/data/nc_search_index.json';
import ProgramCard, { type NCIndexEntry } from './ProgramCard';

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

  // Filtered and sorted results using useMemo
  const filteredResults = useMemo(() => {
    // Cast the imported data to the correct type
    const entries = ncSearchIndex as NCIndexEntry[];

    let filtered = entries.filter((entry) => {
      // Filter by search term (program name or city) - case-insensitive
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          entry.programName.toLowerCase().includes(searchLower) ||
          entry.city.toLowerCase().includes(searchLower) ||
          entry.university.toLowerCase().includes(searchLower);

        if (!matchesSearch) {
          return false;
        }
      }

      // Filter by state (if states are selected)
      if (selectedStates.length > 0) {
        if (!selectedStates.includes(entry.state)) {
          return false;
        }
      }

      // Filter by type
      if (selectedType !== 'Alle') {
        // Map German type names to data types
        const typeMap: Record<UniversityType, string> = {
          Alle: '',
          Uni: 'Uni',
          FH: 'FH',
          Privat: 'Privat',
        };

        if (entry.type !== typeMap[selectedType]) {
          return false;
        }
      }

      return true;
    });

    // Sort by totalMonthlyCosts (ascending - cheapest first)
    filtered.sort((a, b) => {
      return a.totalMonthlyCosts - b.totalMonthlyCosts;
    });

    return filtered;
  }, [searchTerm, selectedStates, selectedType]);

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
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="flex">
        {/* Sidebar - Left, Sticky */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 sticky top-0 h-screen overflow-y-auto">
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

            {/* Type Filter - Radio Buttons */}
            <div className="space-y-3">
              <h3 className="text-slate-300 font-medium text-sm flex items-center gap-2">
                <Filter className="w-4 h-4" />
                University Type
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="type"
                    value="Alle"
                    checked={selectedType === 'Alle'}
                    onChange={() => setSelectedType('Alle')}
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-slate-300 group-hover:text-white text-sm">
                    All
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="type"
                    value="Uni"
                    checked={selectedType === 'Uni'}
                    onChange={() => setSelectedType('Uni')}
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-slate-300 group-hover:text-white text-sm">
                    University
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="type"
                    value="FH"
                    checked={selectedType === 'FH'}
                    onChange={() => setSelectedType('FH')}
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-slate-300 group-hover:text-white text-sm">
                    Applied Sciences
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="type"
                    value="Privat"
                    checked={selectedType === 'Privat'}
                    onChange={() => setSelectedType('Privat')}
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-2"
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
                    className="flex items-center gap-2 cursor-pointer group py-1"
                  >
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedStates.includes(state)}
                        onChange={() => toggleState(state)}
                        className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded focus:ring-blue-500 focus:ring-2 appearance-none checked:bg-blue-600 checked:border-blue-600"
                      />
                      {selectedStates.includes(state) && (
                        <Check className="absolute left-0 w-4 h-4 text-white pointer-events-none" />
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

        {/* Main Content Area - Card Grid */}
        <main className="flex-1 p-6">
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
                        Ø {cityData.averageCost.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-12 h-12 text-slate-600 mb-4" />
              <p className="text-slate-400 text-lg mb-2">
                No results found
              </p>
              <p className="text-slate-500 text-sm">
                Try different search terms or adjust the filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResults.map((entry, index) => (
                <ProgramCard
                  key={`${entry.university}-${entry.programName}-${index}`}
                  program={entry}
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
          )}
        </main>
      </div>
    </div>
  );
}

