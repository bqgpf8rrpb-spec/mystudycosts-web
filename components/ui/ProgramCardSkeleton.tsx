'use client';

interface ProgramCardSkeletonProps {
  compact?: boolean;
}

export default function ProgramCardSkeleton({ compact = false }: ProgramCardSkeletonProps) {
  return (
    <div className="relative bg-slate-900/40 border border-slate-800 rounded-xl p-4 md:p-6 shadow-lg shadow-blue-500/5 animate-pulse">
      <div className="mb-4 space-y-3">
        <div className="h-6 w-3/4 rounded bg-slate-700/70" />
        <div className="h-4 w-1/2 rounded bg-slate-800/80" />
        <div className="h-4 w-2/3 rounded bg-slate-800/80" />
        <div className="flex gap-2">
          <div className="h-7 w-24 rounded-md bg-slate-800/80" />
          <div className="h-7 w-20 rounded-md bg-slate-800/80" />
        </div>
      </div>

      {!compact && (
        <>
          <div className="mb-4 rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 md:p-4 space-y-2.5">
            <div className="h-4 w-40 rounded bg-slate-700/70" />
            <div className="h-4 w-full rounded bg-slate-800/80" />
            <div className="h-4 w-5/6 rounded bg-slate-800/80" />
            <div className="h-6 w-32 rounded bg-slate-700/70" />
          </div>

          <div className="mb-4 space-y-3">
            <div className="h-4 w-24 rounded bg-slate-800/80" />
            <div className="h-6 w-20 rounded bg-slate-700/70" />
            <div className="h-10 w-full rounded bg-slate-800/80" />
          </div>
        </>
      )}

      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <div className="h-8 w-24 rounded-md bg-slate-800/80" />
        <div className="h-4 w-28 rounded bg-slate-800/80" />
      </div>
    </div>
  );
}
