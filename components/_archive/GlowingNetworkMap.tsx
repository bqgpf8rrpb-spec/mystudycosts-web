'use client';

import EuropeMapSVG from '../EuropeMapSVG';

/**
 * @deprecated Archived - not imported anywhere. Kept for reference.
 */
export default function GlowingNetworkMap() {
  return (
    <div className="relative w-full max-w-4xl mx-auto mt-10 p-1">
      {/* The Glass Card Container */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/30 backdrop-blur-sm shadow-[0_0_50px_-15px_rgba(100,255,218,0.15)]">
        
        {/* Decorative Header / Status Bar */}
        <div className="absolute top-0 left-0 right-0 h-12 border-b border-cyan-500/10 bg-white/5 px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
            <span className="text-xs font-mono text-cyan-200/70 tracking-widest uppercase">Coverage: Active</span>
          </div>
          <div className="text-[10px] text-cyan-500/40 font-mono">EST. 2026</div>
        </div>

        {/* The Map Itself */}
        <div className="p-8 pt-16 min-h-[500px]">
          <EuropeMapSVG 
            className="w-full h-full drop-shadow-[0_0_15px_rgba(100,255,218,0.2)]" 
            style={{
              filter: 'drop-shadow(0 0 4px #64ffda) drop-shadow(0 0 8px rgba(100, 255, 218, 0.2))'
            }}
          />
        </div>

        {/* Decorative Corner Accents (Tech Look) */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t border-l border-cyan-500/30 rounded-tl-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b border-r border-cyan-500/30 rounded-br-2xl pointer-events-none"></div>
      </div>
    </div>
  );
}
