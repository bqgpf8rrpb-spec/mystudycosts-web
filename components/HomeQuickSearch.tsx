'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, GraduationCap, ChevronDown, Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import universityProgramsData from '@/data/university_programs.json';
import { type StudyProgram, getProgramName } from '@/data/university-program-types';
import { getSearchTerms, matchesSearchTerms } from '@/lib/search-mapping';

interface HomeQuickSearchProps {
  locale: string;
}

export default function HomeQuickSearch({ locale }: HomeQuickSearchProps) {
  const router = useRouter();
  const t = useTranslations('Index');
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Get all unique program names
  const allPrograms = useRef<string[]>([]);
  
  useEffect(() => {
    const programSet = new Set<string>();
    const programsData = universityProgramsData as Record<string, (string | StudyProgram)[]>;
    
    Object.values(programsData).forEach((programs) => {
      programs.forEach((program) => {
        const programName = typeof program === 'string' ? program : program.name;
        programSet.add(programName);
      });
    });
    
    allPrograms.current = Array.from(programSet).sort();
  }, []);

  // Filter programs based on search
  const filteredPrograms = searchValue.trim()
    ? allPrograms.current.filter((program) => {
        const searchTerms = getSearchTerms(searchValue);
        return matchesSearchTerms(program, searchTerms);
      }).slice(0, 10) // Limit to 10 results for quick search
    : allPrograms.current.slice(0, 10);

  // Calculate dropdown position
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen, filteredPrograms.length]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(target instanceof Element && target.closest('[data-dropdown-portal]'))
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [isOpen]);

  const handleSelect = (program: string) => {
    router.push(`/${locale}/nc-checker?program=${encodeURIComponent(program)}`);
    setIsOpen(false);
    setSearchValue('');
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

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
        <div className="overflow-y-auto max-h-80">
          {filteredPrograms.length > 0 ? (
            <ul className="py-1">
              {filteredPrograms.map((program) => (
                <li
                  key={program}
                  onClick={() => handleSelect(program)}
                  className="px-4 py-3 cursor-pointer transition-colors duration-150 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="flex-1">{program}</span>
                  </div>
                </li>
              ))}
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

  return (
    <div ref={containerRef} className="relative">
      <div
        ref={triggerRef}
        className={`backdrop-blur-md bg-white/5 border rounded-xl transition-all cursor-pointer ${
          isOpen
            ? 'border-blue-400/50 shadow-lg shadow-blue-500/20'
            : 'border-white/10 hover:border-white/20'
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4 p-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Search className="w-6 h-6 text-blue-400 flex-shrink-0" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => {
                setSearchValue(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
              placeholder="Schnellsuche: Studiengang eingeben..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/40 text-lg"
            />
          </div>
          {searchValue && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSearchValue('');
              }}
              className="p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          )}
          <ChevronDown
            className={`w-5 h-5 text-white/40 transition-transform flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>
      {renderDropdown()}
    </div>
  );
}

