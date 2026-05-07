'use client';

import Image from 'next/image';

/**
 * @deprecated Archived - not imported anywhere. Kept for reference.
 */
export default function HeroDataMap() {
  return (
    <div className="relative w-full h-full min-h-[400px] lg:min-h-[500px] rounded-2xl overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.1) 0%, rgba(10, 25, 47, 0.8) 50%, #000000 100%)'
        }}
      />
      
      {/* Network Map Image */}
      <div className="relative w-full h-full min-h-[400px] flex items-center justify-center">
        <Image 
          src="/hero-network-map.png"
          alt="Map of Erasmus partner universities across Europe for German study programs - interactive data network visualization"
          fill
          className="object-contain"
          priority
        />
      </div>
      
      {/* Additional glow effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-600/5 pointer-events-none" />
    </div>
  );
}
