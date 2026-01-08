'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet Icon Fix
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ErasmusMapProps {
  isBackground?: boolean;
}

const MapController = () => {
  const map = useMap();
  useEffect(() => { map.setView([51.1657, 10.4515], 6); }, [map]);
  return null;
};

export default function ErasmusMap({ isBackground = false }: ErasmusMapProps) {
  const [geoData, setGeoData] = useState<any>(null);

  useEffect(() => {
    // Load the local file (downloaded via script)
    fetch('/maps/germany.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("Map loading error:", err));
  }, []);

  return (
    <div className="relative w-full h-[600px] rounded-xl overflow-hidden shadow-2xl bg-[#020617] border border-blue-900/30">
      <MapContainer 
        center={[51.1657, 10.4515]} 
        zoom={6} 
        scrollWheelZoom={false} 
        dragging={!isBackground} 
        touchZoom={!isBackground}
        doubleClickZoom={!isBackground}
        zoomControl={false} 
        className="w-full h-full bg-[#020617]"
      >
        <MapController />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap' />
        {geoData && (
          <GeoJSON data={geoData} style={{
            fillColor: '#00eaff', fillOpacity: 0.15, color: '#00eaff', weight: 2, className: 'germany-neon-layer'
          }} />
        )}
      </MapContainer>
      <style jsx global>{`
        .leaflet-container { background: #020617 !important; }
        .germany-neon-layer {
          stroke-linecap: round; stroke-linejoin: round;
          filter: drop-shadow(0 0 2px rgba(0, 234, 255, 0.9)) drop-shadow(0 0 8px rgba(0, 234, 255, 0.4));
          animation: pulseSlow 6s infinite ease-in-out;
        }
        @keyframes pulseSlow {
          0%, 100% { fill-opacity: 0.15; filter: drop-shadow(0 0 2px rgba(0, 234, 255, 0.9)); }
          50% { fill-opacity: 0.25; filter: drop-shadow(0 0 4px #00eaff) drop-shadow(0 0 20px rgba(0, 234, 255, 0.6)); }
        }
      `}</style>
    </div>
  );
}
