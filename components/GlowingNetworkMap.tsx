'use client';

import EuropeMapSVG from './EuropeMapSVG';

export default function GlowingNetworkMap() {
  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-[500px] rounded-2xl overflow-hidden bg-[#0a192f]">
      <EuropeMapSVG 
        className="w-full h-full"
        style={{
          filter: 'drop-shadow(0 0 4px #64ffda) drop-shadow(0 0 8px rgba(100, 255, 218, 0.2))'
        }}
      />
    </div>
  );
}
// Force reload triggers: 2
