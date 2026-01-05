'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Bookmark, Trash2, GitCompare, Heart, Building2, Globe, Briefcase, BookOpen } from 'lucide-react';
import { useWatchlist, type WatchlistItem } from '@/hooks/useWatchlist';
import { getMatchTypeStyles } from '@/lib/nc-filter';

interface WatchlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WatchlistDrawer({ isOpen, onClose }: WatchlistDrawerProps) {
  const t = useTranslations('Watchlist');
  const watchlist = useWatchlist();
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleCompare = (id: string) => {
    setSelectedForCompare(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getAlternativeIcon = (type?: string) => {
    switch (type) {
      case 'private':
        return <Building2 className="w-4 h-4" />;
      case 'studyAbroad':
        return <Globe className="w-4 h-4" />;
      case 'dualStudies':
        return <Briefcase className="w-4 h-4" />;
      case 'prepCourses':
        return <BookOpen className="w-4 h-4" />;
      default:
        return <Bookmark className="w-4 h-4" />;
    }
  };

  const programs = watchlist.items.filter(item => item.type === 'program');
  const alternatives = watchlist.items.filter(item => item.type === 'alternative');

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-slate-900 border-l border-white/10 z-50 shadow-2xl overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bookmark className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">{t('title')}</h2>
              {watchlist.count > 0 && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-full">
                  {watchlist.count}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Actions */}
          {watchlist.count > 0 && (
            <div className="flex items-center gap-3">
              {selectedForCompare.size >= 2 && (
                <button
                  onClick={() => {
                    // Compare logic would go here
                    alert(t('compareFeature', { count: selectedForCompare.size }));
                  }}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                >
                  <GitCompare className="w-4 h-4" />
                  {t('compareSelected', { count: selectedForCompare.size })}
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm(t('confirmClear'))) {
                    watchlist.clearAll();
                    setSelectedForCompare(new Set());
                  }
                }}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('clearAll')}
              </button>
            </div>
          )}

          {/* Empty State */}
          {watchlist.count === 0 && (
            <div className="text-center py-12">
              <Bookmark className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/60 text-lg mb-2">{t('emptyTitle')}</p>
              <p className="text-white/40 text-sm">{t('emptyDescription')}</p>
            </div>
          )}

          {/* Saved Programs */}
          {programs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">{t('savedPrograms')} ({programs.length})</h3>
              <div className="space-y-3">
                {programs.map((item) => {
                  const styles = getMatchTypeStyles(item.matchType);
                  return (
                    <div
                      key={item.id}
                      className={`backdrop-blur-sm border rounded-lg p-4 ${styles.container} relative group`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="font-semibold text-white mb-1">{item.programName}</div>
                          <div className="text-xs text-white/60 mb-2">{item.university}</div>
                          <div className="flex items-center gap-4 text-xs">
                            {!item.isNCFree && (
                              <span className="text-white/70">
                                NC: {item.ncThreshold.toFixed(1)}
                              </span>
                            )}
                            {item.waitingSemesters > 0 && (
                              <span className="text-white/70">
                                {item.waitingSemesters} {t('waitingSemesters')}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles.badge}`}>
                              {styles.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCompare(item.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              selectedForCompare.has(item.id)
                                ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                : 'bg-black/40 text-white/60 hover:bg-white/10 border border-white/10'
                            }`}
                            title={t('toggleCompare')}
                          >
                            <GitCompare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => watchlist.removeItem(item.id)}
                            className="p-2 rounded-lg bg-black/40 text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                            title={t('remove')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Saved Alternatives */}
          {alternatives.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">{t('savedAlternatives')} ({alternatives.length})</h3>
              <div className="space-y-3">
                {alternatives.map((item) => {
                  const iconColor = item.alternativeType === 'private' ? 'text-blue-400' :
                                   item.alternativeType === 'studyAbroad' ? 'text-purple-400' :
                                   item.alternativeType === 'dualStudies' ? 'text-green-400' :
                                   'text-orange-400';
                  const bgColor = item.alternativeType === 'private' ? 'bg-blue-500/20' :
                                 item.alternativeType === 'studyAbroad' ? 'bg-purple-500/20' :
                                 item.alternativeType === 'dualStudies' ? 'bg-green-500/20' :
                                 'bg-orange-500/20';
                  return (
                    <div
                      key={item.id}
                      className="backdrop-blur-sm border border-white/10 rounded-lg p-4 bg-slate-950/80 relative group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 ${bgColor} rounded-lg ${iconColor}`}>
                            {getAlternativeIcon(item.alternativeType)}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-white mb-1">{item.programName}</div>
                            <div className="text-xs text-white/60">{item.university}</div>
                            <div className="text-xs text-blue-300/80 mt-1">
                              {t('alternativeType')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCompare(item.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              selectedForCompare.has(item.id)
                                ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                : 'bg-black/40 text-white/60 hover:bg-white/10 border border-white/10'
                            }`}
                            title={t('toggleCompare')}
                          >
                            <GitCompare className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => watchlist.removeItem(item.id)}
                            className="p-2 rounded-lg bg-black/40 text-white/60 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                            title={t('remove')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

