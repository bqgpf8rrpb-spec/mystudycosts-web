'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, X, Check, MapPin, GraduationCap } from 'lucide-react';
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

export default function ProgramSearch() {
  // State management
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<'Uni' | 'FH' | 'All'>('All');

  // Filtered and sorted results using useMemo
  const filteredResults = useMemo(() => {
    // Cast the imported data to the correct type
    const entries = ncSearchIndex as NCIndexEntry[];
    
    let filtered = entries.filter((entry) => {
      // Filter by search term (case-insensitive)
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
          entry.programName.toLowerCase().includes(searchLower) ||
          entry.university.toLowerCase().includes(searchLower) ||
          entry.city.toLowerCase().includes(searchLower);
        
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
      if (selectedType !== 'All') {
        if (entry.type !== selectedType) {
          return false;
        }
      }

      return true;
    });

    // Sort by totalMonthlyCosts (ascending)
    filtered.sort((a, b) => {
      return a.totalMonthlyCosts - b.totalMonthlyCosts;
    });

    return filtered;
  }, [searchTerm, selectedStates, selectedType]);

  // Toggle state selection
  const toggleState = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state)
        ? prev.filter((s) => s !== state)
        : [...prev, state]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStates([]);
    setSelectedType('All');
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
                placeholder="Suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter - Radio Buttons */}
            <div className="space-y-3">
              <h3 className="text-slate-300 font-medium text-sm flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Universitätstyp
              </h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="type"
                    value="All"
                    checked={selectedType === 'All'}
                    onChange={() => setSelectedType('All')}
                    className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 focus:ring-blue-500 focus:ring-2"
                  />
                  <span className="text-slate-300 group-hover:text-white text-sm">Alle</span>
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
                  <span className="text-slate-300 group-hover:text-white text-sm">Uni</span>
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
                  <span className="text-slate-300 group-hover:text-white text-sm">FH</span>
                </label>
              </div>
            </div>

            {/* State Filter - Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-300 font-medium text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Bundesländer
                </h3>
                {selectedStates.length > 0 && (
                  <button
                    onClick={() => setSelectedStates([])}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Zurücksetzen
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
            {(searchTerm || selectedStates.length > 0 || selectedType !== 'All') && (
              <button
                onClick={clearFilters}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Alle Filter zurücksetzen
              </button>
            )}

            {/* Results Count */}
            <div className="pt-4 border-t border-slate-800">
              <div className="text-sm text-slate-400">
                <span className="font-semibold text-white">{filteredResults.length}</span>{' '}
                {filteredResults.length === 1 ? 'Ergebnis' : 'Ergebnisse'}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          {/* Results Grid */}
          {filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="w-12 h-12 text-slate-600 mb-4" />
              <p className="text-slate-400 text-lg mb-2">Keine Ergebnisse gefunden</p>
              <p className="text-slate-500 text-sm">
                Versuche andere Suchbegriffe oder passe die Filter an.
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

