'use client';

export default function MapSkeleton() {
  return (
    <div className="relative w-full h-[500px] md:h-[600px] rounded-xl overflow-hidden border-2 border-blue-500/20 bg-slate-900/60 animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 via-slate-900/70 to-slate-800/40" />
      <div className="absolute top-4 left-4 h-8 w-24 rounded-md bg-slate-700/70" />
      <div className="absolute top-14 left-4 h-8 w-24 rounded-md bg-slate-700/70" />
      <div className="absolute right-4 top-4 h-6 w-32 rounded-md bg-slate-700/70" />
      <div className="absolute left-1/4 top-1/3 h-4 w-4 rounded-full bg-slate-600/80" />
      <div className="absolute left-1/2 top-1/2 h-4 w-4 rounded-full bg-slate-600/80" />
      <div className="absolute left-2/3 top-1/4 h-4 w-4 rounded-full bg-slate-600/80" />
      <div className="absolute left-1/3 top-2/3 h-4 w-4 rounded-full bg-slate-600/80" />
    </div>
  );
}
