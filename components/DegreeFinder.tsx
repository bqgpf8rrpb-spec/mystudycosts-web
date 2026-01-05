'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { GraduationCap, CheckCircle2, AlertTriangle, Info, Award, X, ArrowUpDown, ArrowUp, ArrowDown, Building2, Globe, Briefcase, BookOpen, Sparkles, ExternalLink, Heart, Bookmark } from 'lucide-react';
import universityProgramsData from '@/data/university_programs.json';
import universitiesData from '@/data/universities.json';
import GradeInput from '@/components/GradeInput';
import {
  filterProgramsByNC,
  getProgramDisplayName,
  getMatchTypeStyles,
  getMatchTypeLabel,
  sortByBestMatch,
  type ProgramWithMatch,
} from '@/lib/nc-filter';
import { type StudyProgram } from '@/data/university-program-types';
import { useWatchlist } from '@/hooks/useWatchlist';
import WatchlistDrawer from '@/components/WatchlistDrawer';
import AffiliateLabel from '@/components/AffiliateLabel';

interface University {
  name: string;
  city: string;
  type: 'public' | 'private';
}

interface DegreeFinderProps {
  className?: string;
}

type SortMode = 'bestMatch' | 'name' | 'nc';

export default function DegreeFinder({ className = '' }: DegreeFinderProps) {
  const t = useTranslations('DegreeFinder');
  const [selectedUniversity, setSelectedUniversity] = useState<string>('');
  const [userGrade, setUserGrade] = useState<number | null>(null);
  const [showUnlikely, setShowUnlikely] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<SortMode>('bestMatch');
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [showWatchlist, setShowWatchlist] = useState<boolean>(false);
  const watchlist = useWatchlist();

  // Show toast notification
  const showToastNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  // Get all universities
  const allUniversities = useMemo(() => {
    return (universitiesData as University[]).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Get programs for selected university
  const programs = useMemo(() => {
    if (!selectedUniversity) return [];
    
    const programsFromDatabase = (universityProgramsData as Record<string, string[] | StudyProgram[]>)[selectedUniversity];
    if (!programsFromDatabase || programsFromDatabase.length === 0) return [];
    
    // Return programs as-is (can be string[] or StudyProgram[])
    return programsFromDatabase;
  }, [selectedUniversity]);

  // Filter programs by NC
  const filteredPrograms = useMemo(() => {
    const filtered = filterProgramsByNC(programs, userGrade);
    
    // Filter out "unlikely" programs unless explicitly shown
    if (!showUnlikely) {
      return filtered.filter(p => p.matchType !== 'unlikely');
    }
    
    return filtered;
  }, [programs, userGrade, showUnlikely]);

  // Sort programs based on selected sort mode
  const sortedPrograms = useMemo(() => {
    if (sortMode === 'bestMatch') {
      return sortByBestMatch(filteredPrograms, userGrade);
    } else if (sortMode === 'name') {
      return [...filteredPrograms].sort((a, b) => 
        getProgramDisplayName(a.program).localeCompare(getProgramDisplayName(b.program))
      );
    } else if (sortMode === 'nc') {
      return [...filteredPrograms].sort((a, b) => {
        // NC-free programs first, then by NC value
        if (a.isNCFree && !b.isNCFree) return -1;
        if (!a.isNCFree && b.isNCFree) return 1;
        return a.ncThreshold - b.ncThreshold;
      });
    }
    return filteredPrograms;
  }, [filteredPrograms, sortMode, userGrade]);

  // Group programs by match type (after sorting)
  const groupedPrograms = useMemo(() => {
    const groups: Record<string, ProgramWithMatch[]> = {
      safe: [],
      reach: [],
      available: [],
      unlikely: [],
    };

    sortedPrograms.forEach(program => {
      groups[program.matchType].push(program);
    });

    return groups;
  }, [sortedPrograms]);

  // Determine if alternatives section should be shown
  const shouldShowAlternatives = useMemo(() => {
    if (!userGrade || !selectedUniversity) return false;
    // Show if there are "reach" or "unlikely" programs, or always show as "Explore More"
    return groupedPrograms.reach.length > 0 || groupedPrograms.unlikely.length > 0 || groupedPrograms.safe.length > 0;
  }, [userGrade, selectedUniversity, groupedPrograms]);

  // Determine most relevant alternative (based on selected program or general recommendation)
  const getMostRelevantAlternative = useMemo((): 'prepCourses' | 'dualStudies' | 'privateUniversities' | 'studyAbroad' => {
    // If user has many "unlikely" matches, recommend private universities or prep courses
    if (groupedPrograms.unlikely.length > groupedPrograms.safe.length) {
      return 'prepCourses'; // Most relevant when struggling with NC
    }
    // If user has "reach" matches, recommend dual studies or study abroad
    if (groupedPrograms.reach.length > 0) {
      return 'dualStudies';
    }
    // Default: private universities as a safe alternative
    return 'privateUniversities';
  }, [groupedPrograms]);

  // Get selected university object
  const selectedUniversityObj = useMemo(() => {
    if (!selectedUniversity) return null;
    return allUniversities.find(u => u.name === selectedUniversity) || null;
  }, [selectedUniversity, allUniversities]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg backdrop-blur-sm border ${
          showToast.type === 'success' 
            ? 'bg-green-950/90 border-green-500/50 text-green-300'
            : 'bg-blue-950/90 border-blue-500/50 text-blue-300'
        } transition-all duration-300`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">{showToast.message}</span>
          </div>
        </div>
      )}

      {/* Watchlist FAB */}
      {watchlist.count > 0 && (
        <button
          onClick={() => setShowWatchlist(true)}
          className="fixed bottom-6 right-6 z-40 p-4 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg shadow-blue-500/30 text-white transition-all duration-200 flex items-center gap-2 group"
        >
          <Bookmark className="w-5 h-5" />
          <span className="hidden md:inline text-sm font-medium">{t('myWatchlist')}</span>
          {watchlist.count > 0 && (
            <span className="px-2 py-0.5 bg-white/20 text-white text-xs font-bold rounded-full">
              {watchlist.count}
            </span>
          )}
        </button>
      )}

      {/* Watchlist Drawer */}
      <WatchlistDrawer isOpen={showWatchlist} onClose={() => setShowWatchlist(false)} />

      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">{t('title')}</h2>
        <p className="text-white/70">{t('subtitle')}</p>
      </div>

      {/* Grade Input */}
      <GradeInput 
        value={userGrade} 
        onChange={setUserGrade}
        showSlider={true}
      />

      {/* University Selection */}
      <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4">
        <label className="block mb-3 text-sm font-medium text-white/80 flex items-center gap-2">
          <GraduationCap className="w-4 h-4" />
          {t('selectUniversity')}
        </label>
        <select
          value={selectedUniversity}
          onChange={(e) => setSelectedUniversity(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        >
          <option value="">{t('chooseUniversity')}</option>
          {allUniversities.map((uni) => (
            <option key={uni.name} value={uni.name}>
              {uni.name} {uni.city && `(${uni.city})`}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      {selectedUniversity && (
        <div className="space-y-6">
          {/* University Info */}
          {selectedUniversityObj && (
            <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedUniversityObj.name}</h3>
                  <p className="text-sm text-white/60">{selectedUniversityObj.city}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedUniversity('');
                    setUserGrade(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>
          )}

          {/* Sorting Controls */}
          {filteredPrograms.length > 0 && (
            <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between gap-4">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  {t('sortBy')}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortMode('bestMatch')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      sortMode === 'bestMatch'
                        ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                        : 'bg-black/40 text-white/70 border border-white/10 hover:bg-white/5'
                    }`}
                  >
                    {t('sortBestMatch')}
                  </button>
                  <button
                    onClick={() => setSortMode('name')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      sortMode === 'name'
                        ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                        : 'bg-black/40 text-white/70 border border-white/10 hover:bg-white/5'
                    }`}
                  >
                    {t('sortName')}
                  </button>
                  <button
                    onClick={() => setSortMode('nc')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      sortMode === 'nc'
                        ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                        : 'bg-black/40 text-white/70 border border-white/10 hover:bg-white/5'
                    }`}
                  >
                    {t('sortNC')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Program Count Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {groupedPrograms.safe.length > 0 && (
              <div className="backdrop-blur-sm bg-green-950/30 border-2 border-green-500/50 rounded-lg p-3 text-center shadow-lg shadow-green-500/10">
                <div className="text-2xl font-bold text-green-300">{groupedPrograms.safe.length}</div>
                <div className="text-xs text-green-200/90 font-medium">{t('highChance')}</div>
              </div>
            )}
            {groupedPrograms.reach.length > 0 && (
              <div className="backdrop-blur-sm bg-yellow-950/30 border-2 border-yellow-500/50 rounded-lg p-3 text-center shadow-lg shadow-yellow-500/10">
                <div className="text-2xl font-bold text-yellow-300">{groupedPrograms.reach.length}</div>
                <div className="text-xs text-yellow-200/90 font-medium">{t('potentialChance')}</div>
              </div>
            )}
            {groupedPrograms.available.length > 0 && (
              <div className="backdrop-blur-sm bg-blue-950/30 border-2 border-blue-500/50 rounded-lg p-3 text-center shadow-lg shadow-blue-500/10">
                <div className="text-2xl font-bold text-blue-300">{groupedPrograms.available.length}</div>
                <div className="text-xs text-blue-200/90 font-medium">{t('available')}</div>
              </div>
            )}
            {groupedPrograms.unlikely.length > 0 && (
              <div className="backdrop-blur-sm bg-red-950/30 border-2 border-red-500/50 rounded-lg p-3 text-center shadow-lg shadow-red-500/10">
                <div className="text-2xl font-bold text-red-300">{groupedPrograms.unlikely.length}</div>
                <div className="text-xs text-red-200/90 font-medium">{t('unlikely')}</div>
              </div>
            )}
          </div>

          {/* Show Unlikely Toggle */}
          {groupedPrograms.unlikely.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showUnlikely"
                checked={showUnlikely}
                onChange={(e) => setShowUnlikely(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/40 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="showUnlikely" className="text-sm text-white/70 cursor-pointer">
                {t('showUnlikely', { count: groupedPrograms.unlikely.length })}
              </label>
            </div>
          )}

          {/* Programs List */}
          <div className="space-y-4">
            {/* Safe Match Programs */}
            {groupedPrograms.safe.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  {t('safeMatch')} ({groupedPrograms.safe.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupedPrograms.safe.map((item, index) => {
                    const styles = getMatchTypeStyles(item.matchType);
                    const programName = getProgramDisplayName(item.program);
                    return (
                      <div
                        key={index}
                        className={`backdrop-blur-sm border rounded-lg p-4 ${styles.container} relative group`}
                      >
                        <button
                          onClick={() => {
                            const wasAdded = watchlist.toggleItem({
                              university: selectedUniversity,
                              programName,
                              ncThreshold: item.ncThreshold,
                              waitingSemesters: item.waitingSemesters,
                              isNCFree: item.isNCFree,
                              matchType: item.matchType,
                              type: 'program',
                            });
                            showToastNotification(
                              wasAdded ? t('savedToWatchlist') : t('removedFromWatchlist'),
                              'success'
                            );
                          }}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
                          title={watchlist.isSaved(`${selectedUniversity}_${programName}`) ? t('removeFromWatchlist') : t('addToWatchlist')}
                        >
                          {watchlist.isSaved(`${selectedUniversity}_${programName}`) ? (
                            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                          ) : (
                            <Heart className="w-4 h-4 text-white/60" />
                          )}
                        </button>
                        <div className="flex items-start justify-between gap-2 pr-8">
                          <div className="flex-1">
                            <div className="font-medium text-white mb-1">{programName}</div>
                            {!item.isNCFree && (
                              <div className="text-xs text-white/60">
                                NC: {item.ncThreshold.toFixed(1)}
                                {item.waitingSemesters > 0 && ` • ${item.waitingSemesters} Wartesemester`}
                              </div>
                            )}
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${styles.badge} whitespace-nowrap`}>
                            {styles.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reach/Possible Programs */}
            {groupedPrograms.reach.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  {t('reachMatch')} ({groupedPrograms.reach.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupedPrograms.reach.map((item, index) => {
                    const styles = getMatchTypeStyles(item.matchType);
                    const programName = getProgramDisplayName(item.program);
                    return (
                      <div
                        key={index}
                        className={`backdrop-blur-sm border rounded-lg p-4 ${styles.container} relative group`}
                      >
                        <button
                          onClick={() => {
                            const wasAdded = watchlist.toggleItem({
                              university: selectedUniversity,
                              programName,
                              ncThreshold: item.ncThreshold,
                              waitingSemesters: item.waitingSemesters,
                              isNCFree: item.isNCFree,
                              matchType: item.matchType,
                              type: 'program',
                            });
                            showToastNotification(
                              wasAdded ? t('savedToWatchlist') : t('removedFromWatchlist'),
                              'success'
                            );
                          }}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
                          title={watchlist.isSaved(`${selectedUniversity}_${programName}`) ? t('removeFromWatchlist') : t('addToWatchlist')}
                        >
                          {watchlist.isSaved(`${selectedUniversity}_${programName}`) ? (
                            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                          ) : (
                            <Heart className="w-4 h-4 text-white/60" />
                          )}
                        </button>
                        <div className="flex items-start justify-between gap-2 pr-8">
                          <div className="flex-1">
                            <div className="font-medium text-white mb-1">{programName}</div>
                            <div className="text-xs text-white/60">
                              NC: {item.ncThreshold.toFixed(1)}
                              {item.waitingSemesters > 0 && ` • ${item.waitingSemesters} Wartesemester`}
                            </div>
                            <div className="text-xs text-yellow-300/80 mt-1">
                              {t('reachNote')}
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${styles.badge} whitespace-nowrap`}>
                            {styles.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available (NC-free) Programs */}
            {groupedPrograms.available.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-400" />
                  {t('available')} ({groupedPrograms.available.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupedPrograms.available.map((item, index) => {
                    const styles = getMatchTypeStyles(item.matchType);
                    const programName = getProgramDisplayName(item.program);
                    return (
                      <div
                        key={index}
                        className={`backdrop-blur-sm border rounded-lg p-4 ${styles.container} relative group`}
                      >
                        <button
                          onClick={() => {
                            const wasAdded = watchlist.toggleItem({
                              university: selectedUniversity,
                              programName,
                              ncThreshold: item.ncThreshold,
                              waitingSemesters: item.waitingSemesters,
                              isNCFree: item.isNCFree,
                              matchType: item.matchType,
                              type: 'program',
                            });
                            showToastNotification(
                              wasAdded ? t('savedToWatchlist') : t('removedFromWatchlist'),
                              'success'
                            );
                          }}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
                          title={watchlist.isSaved(`${selectedUniversity}_${programName}`) ? t('removeFromWatchlist') : t('addToWatchlist')}
                        >
                          {watchlist.isSaved(`${selectedUniversity}_${programName}`) ? (
                            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                          ) : (
                            <Heart className="w-4 h-4 text-white/60" />
                          )}
                        </button>
                        <div className="flex items-start justify-between gap-2 pr-8">
                          <div className="flex-1">
                            <div className="font-medium text-white mb-1">{programName}</div>
                            <div className="text-xs text-blue-300/80">
                              {t('ncFree')}
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${styles.badge} whitespace-nowrap`}>
                            {styles.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Unlikely Programs (if shown) */}
            {showUnlikely && groupedPrograms.unlikely.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <X className="w-5 h-5 text-red-400" />
                  {t('unlikely')} ({groupedPrograms.unlikely.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {groupedPrograms.unlikely.map((item, index) => {
                    const styles = getMatchTypeStyles(item.matchType);
                    const programName = getProgramDisplayName(item.program);
                    return (
                      <div
                        key={index}
                        className={`backdrop-blur-sm border rounded-lg p-4 ${styles.container} relative group`}
                      >
                        <button
                          onClick={() => {
                            const wasAdded = watchlist.toggleItem({
                              university: selectedUniversity,
                              programName,
                              ncThreshold: item.ncThreshold,
                              waitingSemesters: item.waitingSemesters,
                              isNCFree: item.isNCFree,
                              matchType: item.matchType,
                              type: 'program',
                            });
                            showToastNotification(
                              wasAdded ? t('savedToWatchlist') : t('removedFromWatchlist'),
                              'success'
                            );
                          }}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
                          title={watchlist.isSaved(`${selectedUniversity}_${programName}`) ? t('removeFromWatchlist') : t('addToWatchlist')}
                        >
                          {watchlist.isSaved(`${selectedUniversity}_${programName}`) ? (
                            <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                          ) : (
                            <Heart className="w-4 h-4 text-white/60" />
                          )}
                        </button>
                        <div className="flex items-start justify-between gap-2 pr-8">
                          <div className="flex-1">
                            <div className="font-medium text-white mb-1">{programName}</div>
                            <div className="text-xs text-white/60">
                              NC: {item.ncThreshold.toFixed(1)}
                            </div>
                            <div className="text-xs text-red-300/80 mt-1">
                              {t('unlikelyNote')}
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${styles.badge} whitespace-nowrap`}>
                            {styles.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredPrograms.length === 0 && (
              <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 text-center">
                <Award className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/70">{t('noPrograms')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommended Alternatives Section */}
      {shouldShowAlternatives && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-400" />
              {t('alternativesTitle')}
            </h3>
            <p className="text-white/70 text-sm">{t('alternativesSubtitle')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Private Universities Card */}
            <div className={`backdrop-blur-sm border rounded-xl p-5 relative ${
              getMostRelevantAlternative === 'privateUniversities'
                ? 'border-blue-500/50 bg-blue-950/30 shadow-lg shadow-blue-500/10'
                : 'border-white/10 bg-slate-950/80'
            }`}>
              {getMostRelevantAlternative === 'privateUniversities' && (
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-blue-500/30 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/50">
                    {t('recommended')}
                  </span>
                </div>
              )}
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

            {/* Study Abroad Card */}
            <div className={`backdrop-blur-sm border rounded-xl p-5 relative group ${
              getMostRelevantAlternative === 'studyAbroad'
                ? 'border-blue-500/50 bg-blue-950/30 shadow-lg shadow-blue-500/10'
                : 'border-white/10 bg-slate-950/80'
            }`}>
              {getMostRelevantAlternative === 'studyAbroad' && (
                <div className="absolute top-3 right-12 z-10">
                  <span className="px-2 py-1 bg-blue-500/30 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/50">
                    {t('recommended')}
                  </span>
                </div>
              )}
              <button
                onClick={() => {
                  const wasAdded = watchlist.toggleItem({
                    university: selectedUniversity || t('general'),
                    programName: t('alternativeStudyAbroad'),
                    ncThreshold: 0,
                    waitingSemesters: 0,
                    isNCFree: true,
                    matchType: 'available',
                    type: 'alternative',
                    alternativeType: 'studyAbroad',
                  });
                  showToastNotification(
                    wasAdded ? t('savedToWatchlist') : t('removedFromWatchlist'),
                    'success'
                  );
                }}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
                title={watchlist.isSaved(`${selectedUniversity || t('general')}_studyAbroad`) ? t('removeFromWatchlist') : t('addToWatchlist')}
              >
                {watchlist.isSaved(`${selectedUniversity || t('general')}_studyAbroad`) ? (
                  <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                ) : (
                  <Heart className="w-4 h-4 text-white/60" />
                )}
              </button>
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Globe className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{t('alternativeStudyAbroad')}</h4>
                  <p className="text-xs text-white/70">{t('alternativeStudyAbroadDesc')}</p>
                </div>
              </div>
              <a
                href="#"
                className="w-full inline-flex items-center justify-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {t('viewPrograms')}
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className="text-center mt-2">
                <AffiliateLabel variant="subtle" />
              </div>
            </div>

            {/* Dual Studies Card */}
            <div className={`backdrop-blur-sm border rounded-xl p-5 relative group ${
              getMostRelevantAlternative === 'dualStudies'
                ? 'border-blue-500/50 bg-blue-950/30 shadow-lg shadow-blue-500/10'
                : 'border-white/10 bg-slate-950/80'
            }`}>
              {getMostRelevantAlternative === 'dualStudies' && (
                <div className="absolute top-3 right-12 z-10">
                  <span className="px-2 py-1 bg-blue-500/30 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/50">
                    {t('recommended')}
                  </span>
                </div>
              )}
              <button
                onClick={() => {
                  const wasAdded = watchlist.toggleItem({
                    university: selectedUniversity || t('general'),
                    programName: t('alternativeDualStudies'),
                    ncThreshold: 0,
                    waitingSemesters: 0,
                    isNCFree: true,
                    matchType: 'available',
                    type: 'alternative',
                    alternativeType: 'dualStudies',
                  });
                  showToastNotification(
                    wasAdded ? t('savedToWatchlist') : t('removedFromWatchlist'),
                    'success'
                  );
                }}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
                title={watchlist.isSaved(`${selectedUniversity || t('general')}_dualStudies`) ? t('removeFromWatchlist') : t('addToWatchlist')}
              >
                {watchlist.isSaved(`${selectedUniversity || t('general')}_dualStudies`) ? (
                  <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                ) : (
                  <Heart className="w-4 h-4 text-white/60" />
                )}
              </button>
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Briefcase className="w-5 h-5 text-green-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{t('alternativeDualStudies')}</h4>
                  <p className="text-xs text-white/70">{t('alternativeDualStudiesDesc')}</p>
                </div>
              </div>
              <a
                href="#"
                className="w-full inline-flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {t('viewPrograms')}
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className="text-center mt-2">
                <AffiliateLabel variant="subtle" />
              </div>
            </div>

            {/* Prep Courses / Waiting Semesters Card */}
            <div className={`backdrop-blur-sm border rounded-xl p-5 relative group ${
              getMostRelevantAlternative === 'prepCourses'
                ? 'border-blue-500/50 bg-blue-950/30 shadow-lg shadow-blue-500/10'
                : 'border-white/10 bg-slate-950/80'
            }`}>
              {getMostRelevantAlternative === 'prepCourses' && (
                <div className="absolute top-3 right-12 z-10">
                  <span className="px-2 py-1 bg-blue-500/30 text-blue-300 text-xs font-semibold rounded-full border border-blue-500/50">
                    {t('recommended')}
                  </span>
                </div>
              )}
              <button
                onClick={() => {
                  const wasAdded = watchlist.toggleItem({
                    university: selectedUniversity || t('general'),
                    programName: t('alternativePrepCourses'),
                    ncThreshold: 0,
                    waitingSemesters: 0,
                    isNCFree: true,
                    matchType: 'available',
                    type: 'alternative',
                    alternativeType: 'prepCourses',
                  });
                  showToastNotification(
                    wasAdded ? t('savedToWatchlist') : t('removedFromWatchlist'),
                    'success'
                  );
                }}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/40 hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100 z-10"
                title={watchlist.isSaved(`${selectedUniversity || t('general')}_prepCourses`) ? t('removeFromWatchlist') : t('addToWatchlist')}
              >
                {watchlist.isSaved(`${selectedUniversity || t('general')}_prepCourses`) ? (
                  <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                ) : (
                  <Heart className="w-4 h-4 text-white/60" />
                )}
              </button>
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <BookOpen className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">{t('alternativePrepCourses')}</h4>
                  <p className="text-xs text-white/70">{t('alternativePrepCoursesDesc')}</p>
                </div>
              </div>
              <a
                href="#"
                className="w-full inline-flex items-center justify-center gap-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              >
                {t('getConsultation')}
                <ExternalLink className="w-4 h-4" />
              </a>
              <div className="text-center mt-2">
                <AffiliateLabel variant="subtle" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      {userGrade && selectedUniversity && (
        <div className="backdrop-blur-sm bg-blue-950/30 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-white/80">
              <p className="mb-2 font-medium">{t('infoText')}</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-white/70 mb-3">
                <li><span className="text-green-300 font-medium">{t('highChance')}:</span> {t('infoSafe')}</li>
                <li><span className="text-yellow-300 font-medium">{t('potentialChance')}:</span> {t('infoReach')}</li>
                <li><span className="text-blue-300 font-medium">{t('available')}:</span> {t('infoAvailable')}</li>
                <li><span className="text-red-300 font-medium">{t('unlikely')}:</span> {t('infoUnlikely')}</li>
              </ul>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-xs text-yellow-300/90 font-medium">
                  ⚠️ {t('ncDisclaimer')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NC-Checker Legal Disclaimer */}
      {selectedUniversity && (
        <div className="backdrop-blur-sm bg-slate-950/60 border border-white/10 rounded-xl p-4">
          <p className="text-xs text-white/50 leading-relaxed text-center">
            {t('ncLegalDisclaimer')}
          </p>
        </div>
      )}
    </div>
  );
}

