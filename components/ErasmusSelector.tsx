'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { GraduationCap, Book, MapPin, ChevronDown, Check, Search, X, Euro, AlertCircle, Radio, Plane, CheckCircle, Info, Sparkles } from 'lucide-react';
import AffiliateLabel from '@/components/AffiliateLabel';
import erasmusPartnersData from '@/data/erasmus-partners.json';
import universitiesData from '@/data/universities.json';
import universityProgramsData from '@/data/university_programs.json';
import { getProgramName, type StudyProgram } from '@/data/university-program-types';

// Dynamically import the map component to avoid SSR issues
const ErasmusMap = dynamic(() => import('@/components/ErasmusMap'), {
  ssr: false,
  loading: () => (
    <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 text-center h-[500px] flex items-center justify-center">
      <div className="text-white/60 text-sm">Loading map...</div>
    </div>
  ),
});

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
    hasBAfoeg: boolean;
  }) => void;
}

export default function ErasmusSelector({ onSelectionChange }: ErasmusSelectorProps) {
  const t = useTranslations('ErasmusSelector');
  const tBAfoeg = useTranslations('BAfoeg');

  // State for selections
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerUniversity | null>(null);
  const [hasBAfoeg, setHasBAfoeg] = useState<boolean>(false);

  // State for dropdowns
  const [universityDropdownOpen, setUniversityDropdownOpen] = useState(false);
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);

  // State for search queries
  const [universitySearch, setUniversitySearch] = useState('');
  const [programSearch, setProgramSearch] = useState('');

  // State for dropdown positions
  const [universityDropdownPosition, setUniversityDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [programDropdownPosition, setProgramDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Refs for dropdown containers and triggers
  const universityContainerRef = useRef<HTMLDivElement>(null);
  const programContainerRef = useRef<HTMLDivElement>(null);
  const universityTriggerRef = useRef<HTMLDivElement>(null);
  const programTriggerRef = useRef<HTMLDivElement>(null);

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
    const programsFromDatabase = (universityProgramsData as Record<string, string[] | StudyProgram[]>)[selectedUniversity];
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
      hasBAfoeg,
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
      hasBAfoeg,
    });
  };

  // Handle partner selection
  const handlePartnerSelect = (partner: PartnerUniversity) => {
    setSelectedPartner(partner);
    onSelectionChange?.({
      university: selectedUniversity,
      program: selectedProgram,
      partner,
      hasBAfoeg,
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
      hasBAfoeg: false,
    });
    setHasBAfoeg(false);
  };

  const handleClearProgram = () => {
    setSelectedProgram('');
    setSelectedPartner(null);
    setProgramSearch('');
    onSelectionChange?.({
      university: selectedUniversity,
      program: '',
      partner: null,
      hasBAfoeg,
    });
  };

  const handleClearPartner = () => {
    setSelectedPartner(null);
    onSelectionChange?.({
      university: selectedUniversity,
      program: selectedProgram,
      partner: null,
      hasBAfoeg,
    });
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    if (!universityDropdownOpen && !programDropdownOpen) return;

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
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [universityDropdownOpen, programDropdownOpen]);

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

      {/* BAföG Toggle - Show after program selection */}
      {selectedProgram && (
        <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4 hover:bg-slate-950/90 transition-all duration-200">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasBAfoeg}
              onChange={(e) => {
                const newValue = e.target.checked;
                setHasBAfoeg(newValue);
                onSelectionChange?.({
                  university: selectedUniversity,
                  program: selectedProgram,
                  partner: selectedPartner,
                  hasBAfoeg: newValue,
                });
              }}
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
          <div className="bg-green-950/30 border-2 border-green-500/40 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="bg-green-500/20 rounded-full p-2">
                  <Euro className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-bold text-green-300">{tBAfoeg('socialTopUp.title')}</h4>
                  <span className="text-lg font-bold text-green-400">{tBAfoeg('socialTopUp.monthlyAmount')}</span>
                </div>
                <p className="text-xs text-white/90 mb-1">{tBAfoeg('socialTopUp.description')}</p>
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
            <>
              {/* Interactive Map View */}
              <div className="mb-6">
                <label className="block text-white/70 text-sm font-medium mb-4">
                  Partner Locations Map
                </label>
                <ErasmusMap partners={partners} />
              </div>

              {/* Partners Grid */}
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

