'use client';

/**
 * @deprecated Archived - not imported anywhere. Uses removed CSS (.heartbeat-glow, .network-line, etc). Kept for reference.
 */
export default function HeartbeatMap() {
  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-[500px] rounded-2xl overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.1) 0%, rgba(10, 25, 47, 0.8) 50%, #000000 100%)'
        }}
      />
      
      {/* SVG Map of Europe - Simplified but recognizable */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 1000 800" 
        preserveAspectRatio="xMidYMid meet"
        style={{ filter: 'drop-shadow(0 0 20px rgba(100, 255, 218, 0.1))' }}
      >
        {/* Base map paths - simplified Europe with more realistic shapes */}
        
        {/* Spain & Portugal */}
        <path
          d="M 100 500 Q 100 450 150 450 L 200 450 L 200 550 L 150 550 Q 100 550 100 500 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* France */}
        <path
          d="M 200 350 Q 200 300 250 300 L 350 300 L 350 400 Q 350 450 300 450 L 250 450 Q 200 450 200 400 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* United Kingdom */}
        <path
          d="M 150 200 Q 150 150 200 150 L 250 150 Q 300 150 300 200 L 300 280 Q 300 320 250 320 L 200 320 Q 150 320 150 280 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Italy */}
        <path
          d="M 350 450 L 400 450 L 400 550 L 420 600 L 400 650 L 380 650 L 360 600 L 350 550 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Germany - Highlighted with heartbeat animation */}
        <path
          id="DE"
          className="heartbeat-glow"
          d="M 350 300 Q 350 250 400 250 L 500 250 Q 550 250 550 300 L 550 400 Q 550 450 500 450 L 400 450 Q 350 450 350 400 Z"
          fill="#172a45"
          stroke="#64ffda"
          strokeWidth="2"
        />
        
        {/* Poland */}
        <path
          d="M 550 250 L 650 250 L 650 350 L 550 350 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Czech Republic */}
        <path
          d="M 520 350 L 580 350 L 580 400 L 520 400 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Austria */}
        <path
          d="M 480 400 L 540 400 L 540 450 L 480 450 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Switzerland */}
        <path
          d="M 350 400 L 400 400 L 400 450 L 350 450 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Netherlands */}
        <path
          d="M 350 200 L 400 200 L 400 250 L 350 250 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Belgium */}
        <path
          d="M 300 300 L 350 300 L 350 350 L 300 350 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Denmark */}
        <path
          d="M 400 150 L 450 150 L 450 200 L 400 200 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Sweden */}
        <path
          d="M 450 50 L 550 50 L 550 150 L 450 150 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Norway */}
        <path
          d="M 300 50 L 450 50 L 450 150 L 300 150 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Finland */}
        <path
          d="M 550 50 L 700 50 L 700 150 L 550 150 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Greece */}
        <path
          d="M 500 550 L 600 550 L 600 650 L 500 650 Z"
          fill="#0a192f"
          stroke="#64ffda"
          strokeWidth="0.5"
          opacity="0.6"
        />
        
        {/* Additional glow effect for Germany */}
        <path
          id="DE-glow"
          className="heartbeat-glow-secondary"
          d="M 350 300 Q 350 250 400 250 L 500 250 Q 550 250 550 300 L 550 400 Q 550 450 500 450 L 400 450 Q 350 450 350 400 Z"
          fill="none"
          stroke="#64ffda"
          strokeWidth="1"
          opacity="0.4"
        />
      </svg>
      
      {/* Network Overlay - Glowing dots and connecting lines */}
      <svg 
        className="absolute inset-0 w-full h-full pointer-events-none" 
        viewBox="0 0 1000 800"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Connecting lines from Germany (center of Europe) */}
        <line 
          x1="450" 
          y1="350" 
          x2="500" 
          y2="400" 
          stroke="#64ffda" 
          strokeWidth="1" 
          opacity="0.3"
          className="network-line"
        />
        <line 
          x1="450" 
          y1="350" 
          x2="400" 
          y2="400" 
          stroke="#64ffda" 
          strokeWidth="1" 
          opacity="0.3"
          className="network-line"
        />
        <line 
          x1="450" 
          y1="350" 
          x2="350" 
          y2="350" 
          stroke="#64ffda" 
          strokeWidth="1" 
          opacity="0.3"
          className="network-line"
        />
        <line 
          x1="450" 
          y1="350" 
          x2="550" 
          y2="350" 
          stroke="#64ffda" 
          strokeWidth="1" 
          opacity="0.3"
          className="network-line"
        />
        <line 
          x1="450" 
          y1="350" 
          x2="400" 
          y2="300" 
          stroke="#64ffda" 
          strokeWidth="1" 
          opacity="0.3"
          className="network-line"
        />
        
        {/* Glowing data nodes - positioned around Germany */}
        <circle 
          cx="450" 
          cy="350" 
          r="5" 
          fill="#64ffda" 
          className="network-node network-node-pulse"
          opacity="0.9"
        />
        <circle 
          cx="500" 
          cy="400" 
          r="3" 
          fill="#64ffda" 
          className="network-node network-node-pulse"
          opacity="0.6"
          style={{ animationDelay: '0.3s' }}
        />
        <circle 
          cx="400" 
          cy="400" 
          r="3" 
          fill="#64ffda" 
          className="network-node network-node-pulse"
          opacity="0.6"
          style={{ animationDelay: '0.6s' }}
        />
        <circle 
          cx="350" 
          cy="350" 
          r="3" 
          fill="#64ffda" 
          className="network-node network-node-pulse"
          opacity="0.6"
          style={{ animationDelay: '0.9s' }}
        />
        <circle 
          cx="550" 
          cy="350" 
          r="3" 
          fill="#64ffda" 
          className="network-node network-node-pulse"
          opacity="0.6"
          style={{ animationDelay: '1.2s' }}
        />
        <circle 
          cx="400" 
          cy="300" 
          r="3" 
          fill="#64ffda" 
          className="network-node network-node-pulse"
          opacity="0.6"
          style={{ animationDelay: '1.5s' }}
        />
      </svg>
      
      {/* Additional glow effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-600/5 pointer-events-none" />
    </div>
  );
}
