'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { GraduationCap, Book, MapPin, ChevronDown, Check, Search, X, Euro, AlertCircle } from 'lucide-react';
import erasmusPartnersData from '@/data/erasmus-partners.json';
import universitiesData from '@/data/universities.json';
import universityProgramsData from '@/data/university_programs.json';

interface University {
  name: string;
  city: string;
  type: 'public' | 'private';
  semesterFee: number;
  avgRent: number;
}

interface PartnerUniversity {
  name: string;
  city: string;
  country: string;
  monthlyLivingCost: number;
  travelCost: number;
  insuranceCost: number;
}

interface ErasmusPartnerData {
  germanUniversity: string;
  courseOfStudy: string;
  partners: PartnerUniversity[] | 'no_partners_available';
}

interface ErasmusSelectorProps {
  onSelectionChange?: (selection: {
    university: string;
    program: string;
    partner: PartnerUniversity | null;
  }) => void;
}

export default function ErasmusSelector({ onSelectionChange }: ErasmusSelectorProps) {
  const t = useTranslations('ErasmusSelector');

  // State for selections
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerUniversity | null>(null);

  // State for dropdowns
  const [universityDropdownOpen, setUniversityDropdownOpen] = useState(false);
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);

  // State for search queries
  const [universitySearch, setUniversitySearch] = useState('');
  const [programSearch, setProgramSearch] = useState('');

  // Refs for dropdown containers (relative positioning containers)
  const universityContainerRef = useRef<HTMLDivElement>(null);
  const programContainerRef = useRef<HTMLDivElement>(null);

  // Get all German universities from the main dataset
  const allUniversities = useMemo(() => {
    return (universitiesData as University[]).map(u => ({
      name: u.name,
      city: u.city,
      type: (u.type || 'public') as 'public' | 'private',
      semesterFee: u.semesterFee || 0,
      avgRent: u.avgRent || 600,
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
    const programsFromDatabase = (universityProgramsData as Record<string, string[]>)[selectedUniversity];
    if (programsFromDatabase && programsFromDatabase.length > 0) {
      return programsFromDatabase.sort();
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

  // Get available partners for selected university + program
  // Returns null if explicitly marked as "no_partners_available", empty array if not found, or array of partners
  const partners = useMemo(() => {
    if (!selectedUniversity || !selectedProgram) return [];
    const match = (erasmusPartnersData as ErasmusPartnerData[]).find(
      (data) =>
        data.germanUniversity === selectedUniversity &&
        data.courseOfStudy === selectedProgram
    );
    if (!match) return [];
    if (match.partners === 'no_partners_available') return null; // Special marker for explicitly no partners
    return (match.partners as PartnerUniversity[]) || [];
  }, [selectedUniversity, selectedProgram]);

  // Check if program explicitly has no partners (vs. data missing)
  const hasNoPartnersAvailable = partners === null;

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

  // Format currency for display (simple Euro formatting)
  const formatCurrency = (amount: number): string => {
    const wholePart = Math.floor(amount);
    const centsPart = Math.round((amount - wholePart) * 100);
    const formattedWhole = wholePart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (centsPart === 0) {
      return `€ ${formattedWhole}`;
    }
    return `€ ${formattedWhole},${centsPart.toString().padStart(2, '0')}`;
  };

  // Handle university selection
  const handleUniversitySelect = (university: string | University) => {
    const universityName = typeof university === 'string' ? university : university.name;
    setSelectedUniversity(universityName);
    setSelectedProgram('');
    setSelectedPartner(null);
    setUniversityDropdownOpen(false);
    setUniversitySearch('');
    onSelectionChange?.({
      university: universityName,
      program: '',
      partner: null,
    });
  };

  // Handle program selection
  const handleProgramSelect = (program: string) => {
    setSelectedProgram(program);
    setSelectedPartner(null);
    setProgramDropdownOpen(false);
    setProgramSearch('');
    onSelectionChange?.({
      university: selectedUniversity,
      program,
      partner: null,
    });
  };

  // Handle partner selection
  const handlePartnerSelect = (partner: PartnerUniversity) => {
    setSelectedPartner(partner);
    onSelectionChange?.({
      university: selectedUniversity,
      program: selectedProgram,
      partner,
    });
  };

  // Clear selections
  const handleClearUniversity = () => {
    setSelectedUniversity('');
    setSelectedProgram('');
    setSelectedPartner(null);
    setUniversitySearch('');
    onSelectionChange?.({
      university: '',
      program: '',
      partner: null,
    });
  };

  const handleClearProgram = () => {
    setSelectedProgram('');
    setSelectedPartner(null);
    setProgramSearch('');
    onSelectionChange?.({
      university: selectedUniversity,
      program: '',
      partner: null,
    });
  };

  const handleClearPartner = () => {
    setSelectedPartner(null);
    onSelectionChange?.({
      university: selectedUniversity,
      program: selectedProgram,
      partner: null,
    });
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        universityContainerRef.current && 
        !universityContainerRef.current.contains(target)
      ) {
        setUniversityDropdownOpen(false);
      }
      if (
        programContainerRef.current && 
        !programContainerRef.current.contains(target)
      ) {
        setProgramDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, []);

  // Render dropdown component
  const renderDropdown = (
    isOpen: boolean,
    options: (string | University | PartnerUniversity)[],
    selectedValue: string | University | PartnerUniversity | null,
    onSelect: (value: any) => void,
    searchValue: string,
    onSearchChange: (value: string) => void,
    formatOption?: (option: any) => string
  ) => {
    if (!isOpen) return null;

    return (
      <div
        className="absolute top-full left-0 w-full mt-1 z-[100] bg-slate-900 backdrop-blur-sm border border-white/20 rounded-lg shadow-2xl max-h-60 overflow-hidden flex flex-col"
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
            />
          </div>
        </div>

        {/* Options list */}
        <div className="overflow-y-auto max-h-48">
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
                    ? `${option.name}-${option.city}`
                    : option.name;

                return (
                  <li
                    key={optionKey}
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
  };

  return (
    <div className="space-y-4">
      {/* University Dropdown */}
      <div ref={universityContainerRef} className="relative">
        <label className="block text-white/70 text-sm font-medium mb-2">
          {t('selectUniversity')}
        </label>
        <div
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
          (uni: University) => `${uni.name} (${uni.city})`
        )}
      </div>

      {/* Program Dropdown */}
      <div ref={programContainerRef} className="relative">
        <label className="block text-white/70 text-sm font-medium mb-2">
          {t('selectProgram')}
        </label>
        <div
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
            setProgramSearch
          )}
      </div>

      {/* Partner Tiles Grid */}
      {selectedProgram && (
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
          ) : Array.isArray(partners) && partners.length > 0 ? (
            // Partners Grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {partners.map((partner) => {
                const isSelected = selectedPartner?.name === partner.name && 
                                   selectedPartner?.city === partner.city &&
                                   selectedPartner?.country === partner.country;
                return (
                  <div
                    key={`${partner.name}-${partner.city}-${partner.country}`}
                    onClick={() => handlePartnerSelect(partner)}
                    className={`backdrop-blur-sm border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? 'bg-blue-950/30 border-blue-500/50 shadow-lg shadow-blue-500/20'
                        : 'bg-slate-950/80 border-white/10 hover:border-white/30 hover:bg-slate-950/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-sm truncate">
                            {partner.name}
                          </h4>
                          <p className="text-white/60 text-xs mt-0.5">
                            {partner.city}, {partner.country}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                      <Euro className="w-4 h-4 text-white/60" />
                      <div>
                        <p className="text-white/50 text-xs">{t('monthlyCost')}</p>
                        <p className="text-white font-medium text-sm">
                          {formatCurrency(partner.monthlyLivingCost)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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

