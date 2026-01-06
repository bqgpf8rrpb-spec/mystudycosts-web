'use client';

export default function HeroVisual() {
  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-[500px] rounded-2xl overflow-hidden">
      {/* Radial gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.2) 0%, rgba(37, 99, 235, 0.1) 40%, #0f172a 100%)'
        }}
      />
      
      {/* Network lines overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
        {/* Horizontal lines */}
        <line x1="50" y1="100" x2="350" y2="100" stroke="currentColor" strokeWidth="1" className="text-cyan-400/40" />
        <line x1="50" y1="200" x2="350" y2="200" stroke="currentColor" strokeWidth="1" className="text-cyan-400/40" />
        <line x1="50" y1="300" x2="350" y2="300" stroke="currentColor" strokeWidth="1" className="text-cyan-400/40" />
        
        {/* Vertical lines */}
        <line x1="100" y1="50" x2="100" y2="350" stroke="currentColor" strokeWidth="1" className="text-cyan-400/40" />
        <line x1="200" y1="50" x2="200" y2="350" stroke="currentColor" strokeWidth="1" className="text-cyan-400/40" />
        <line x1="300" y1="50" x2="300" y2="350" stroke="currentColor" strokeWidth="1" className="text-cyan-400/40" />
        
        {/* Diagonal connections */}
        <line x1="100" y1="100" x2="200" y2="200" stroke="currentColor" strokeWidth="0.5" className="text-cyan-400/30" />
        <line x1="200" y1="100" x2="300" y2="200" stroke="currentColor" strokeWidth="0.5" className="text-cyan-400/30" />
        <line x1="100" y1="200" x2="300" y2="300" stroke="currentColor" strokeWidth="0.5" className="text-cyan-400/30" />
        
        {/* Data nodes (glowing points) */}
        <circle cx="100" cy="100" r="3" fill="currentColor" className="text-cyan-400 animate-pulse" />
        <circle cx="200" cy="100" r="3" fill="currentColor" className="text-cyan-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <circle cx="300" cy="100" r="3" fill="currentColor" className="text-cyan-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
        <circle cx="100" cy="200" r="3" fill="currentColor" className="text-cyan-400 animate-pulse" style={{ animationDelay: '0.1s' }} />
        <circle cx="200" cy="200" r="4" fill="currentColor" className="text-cyan-500 animate-pulse" style={{ animationDelay: '0.3s' }} />
        <circle cx="300" cy="200" r="3" fill="currentColor" className="text-cyan-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <circle cx="100" cy="300" r="3" fill="currentColor" className="text-cyan-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <circle cx="200" cy="300" r="3" fill="currentColor" className="text-cyan-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
        <circle cx="300" cy="300" r="3" fill="currentColor" className="text-cyan-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
      </svg>
      
      {/* Map-like background pattern (subtle) */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-cyan-400/20 rounded-full" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 border border-cyan-400/20 rounded-full" />
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 border border-cyan-400/20 rounded-full" />
      </div>
      
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-600/5" />
    </div>
  );
}

