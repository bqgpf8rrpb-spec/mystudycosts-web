'use client';

import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled - Leaflet requires window object
const ErasmusMap = dynamic(() => import('./ErasmusMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-[#020617] h-full w-full" />
  ),
});

export default function MapWrapper() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#020617]">
      {/* Map Layer */}
      <ErasmusMap isBackground={true} />
      
      {/* Overlay - Radial Gradient - Reduzierte Opacity für bessere Sichtbarkeit der Küstenlinien */}
      <div className="absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,_transparent_30%,_#020617_95%)] pointer-events-none opacity-90" />
    </div>
  );
}

