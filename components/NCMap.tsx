'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import cityCoordinates from '@/data/city-coordinates.json';
import { type ProgramMatchType } from '@/lib/nc-filter';

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface UniversityWithMatch {
  university: {
    name: string;
    city: string;
    type: 'public' | 'private';
  };
  program: {
    name: string;
    nc_threshold: number;
    waiting_semesters: number;
  };
  matchType: ProgramMatchType;
  ncThreshold: number;
  waitingSemesters: number;
  isNCFree: boolean;
}

interface NCMapProps {
  universities: UniversityWithMatch[];
  onMarkerClick?: (universityName: string) => void;
}

// Create color-coded marker based on match type
const createColoredMarker = (matchType: ProgramMatchType) => {
  const colors = {
    safe: {
      gradient: 'linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)',
      border: '#86efac',
      shadow: 'rgba(34, 197, 94, 0.8)',
      glow: 'rgba(74, 222, 128, 0.6)',
    },
    reach: {
      gradient: 'linear-gradient(135deg, #facc15 0%, #eab308 50%, #ca8a04 100%)',
      border: '#fde047',
      shadow: 'rgba(234, 179, 8, 0.8)',
      glow: 'rgba(250, 204, 21, 0.6)',
    },
    available: {
      gradient: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
      border: '#93c5fd',
      shadow: 'rgba(59, 130, 246, 0.8)',
      glow: 'rgba(96, 165, 250, 0.6)',
    },
    unlikely: {
      gradient: 'linear-gradient(135deg, #f87171 0%, #ef4444 50%, #dc2626 100%)',
      border: '#fca5a5',
      shadow: 'rgba(239, 68, 68, 0.8)',
      glow: 'rgba(248, 113, 113, 0.6)',
    },
  };

  const color = colors[matchType];

  return L.divIcon({
    className: `custom-marker-${matchType}`,
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${color.gradient};
        border: 3px solid ${color.border};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 
          0 0 0 3px ${color.glow},
          0 4px 20px ${color.shadow},
          0 0 30px ${color.glow};
        position: relative;
        animation: pulse-${matchType} 2s ease-in-out infinite;
      ">
        <div style="
          width: 14px;
          height: 14px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        "></div>
      </div>
      <style>
        @keyframes pulse-${matchType} {
          0%, 100% { 
            box-shadow: 0 0 0 3px ${color.glow}, 0 4px 20px ${color.shadow}, 0 0 30px ${color.glow}; 
          }
          50% { 
            box-shadow: 0 0 0 5px ${color.glow.replace('0.6', '0.8')}, 0 6px 25px ${color.shadow}, 0 0 40px ${color.glow.replace('0.6', '0.8')}; 
          }
        }
      </style>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to handle map view updates
function MapViewUpdater({ universities }: { universities: UniversityWithMatch[] }) {
  const map = useMap();

  useEffect(() => {
    if (universities.length === 0) return;

    const coordinates = universities
      .map((item) => {
        const coords = (cityCoordinates as Record<string, { lat: number; lng: number }>)[item.university.city];
        return coords ? [coords.lat, coords.lng] : null;
      })
      .filter((coord): coord is [number, number] => coord !== null);

    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [universities, map]);

  return null;
}

export default function NCMap({ universities, onMarkerClick }: NCMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Get universities with coordinates
  const universitiesWithCoords = universities
    .map((item) => {
      const coords = (cityCoordinates as Record<string, { lat: number; lng: number }>)[item.university.city];
      if (!coords) return null;
      return { ...item, lat: coords.lat, lng: coords.lng };
    })
    .filter((item): item is UniversityWithMatch & { lat: number; lng: number } => item !== null);

  if (universitiesWithCoords.length === 0) {
    return (
      <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 text-center">
        <p className="text-white/60 text-sm">No university locations available to display on map</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] md:h-[600px] rounded-xl overflow-hidden border-2 border-blue-500/20 shadow-2xl shadow-blue-500/10">
      <style jsx global>{`
        .leaflet-container {
          background: #0a1628 !important;
          filter: brightness(1.2) contrast(1.1) hue-rotate(200deg) saturate(1.4);
        }
        .leaflet-tile-container img {
          filter: brightness(0.95) contrast(1.15);
        }
        .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.98) !important;
          backdrop-filter: blur(16px);
          border: 2px solid rgba(59, 130, 246, 0.4);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(59, 130, 246, 0.2);
          color: white;
        }
        .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.98) !important;
          border: 2px solid rgba(59, 130, 246, 0.4);
        }
        .leaflet-popup-content {
          margin: 16px;
          color: white;
          min-width: 200px;
        }
        .leaflet-popup-content h3 {
          color: #60a5fa !important;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
          margin-bottom: 8px;
        }
        .leaflet-popup-content p {
          margin: 6px 0;
          color: rgba(255, 255, 255, 0.95);
          font-size: 14px;
        }
        .leaflet-popup-content strong {
          color: rgba(255, 255, 255, 1);
          font-weight: 600;
        }
        .leaflet-control-zoom {
          border: 1px solid rgba(59, 130, 246, 0.4) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          border-radius: 4px;
        }
        .leaflet-control-zoom a {
          background: rgba(15, 23, 42, 0.95) !important;
          color: white !important;
          border: 1px solid rgba(59, 130, 246, 0.3) !important;
          font-weight: 700;
          font-size: 18px;
          line-height: 30px;
        }
        .leaflet-control-zoom a:hover {
          background: rgba(30, 58, 138, 0.95) !important;
          border-color: rgba(59, 130, 246, 0.6) !important;
          color: #93c5fd !important;
        }
        .custom-marker-safe,
        .custom-marker-reach,
        .custom-marker-available,
        .custom-marker-unlikely {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-close-button {
          color: white !important;
          font-size: 22px !important;
          font-weight: bold !important;
          padding: 6px 10px !important;
          opacity: 0.8;
        }
        .leaflet-popup-close-button:hover {
          color: #60a5fa !important;
          opacity: 1;
        }
        .leaflet-control-attribution {
          background: rgba(15, 23, 42, 0.85) !important;
          backdrop-filter: blur(8px);
          border-top: 1px solid rgba(59, 130, 246, 0.2) !important;
          border-left: 1px solid rgba(59, 130, 246, 0.2) !important;
          color: rgba(255, 255, 255, 0.6) !important;
          font-size: 10px !important;
          padding: 4px 6px !important;
        }
        .leaflet-control-attribution a {
          color: rgba(96, 165, 250, 0.8) !important;
        }
        .leaflet-control-attribution a:hover {
          color: #60a5fa !important;
        }
      `}</style>
      <MapContainer
        center={[51, 10]}
        zoom={6}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={true}
        scrollWheelZoom={true}
        className="nc-map"
      >
        {/* CartoDB Dark Matter TileLayer - No API key required */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
        />
        <MapViewUpdater universities={universities} />
        {universitiesWithCoords.map((item, index) => (
          <Marker
            key={`${item.university.name}-${item.university.city}-${index}`}
            position={[item.lat, item.lng]}
            icon={createColoredMarker(item.matchType)}
            eventHandlers={{
              click: () => {
                if (onMarkerClick) {
                  onMarkerClick(item.university.name);
                }
              },
            }}
          >
            <Popup>
              <div className="text-white">
                <h3 className="font-bold text-base mb-3 text-blue-400">{item.university.name}</h3>
                <p className="text-sm text-white mb-2">
                  <strong className="text-white">Location:</strong> {item.university.city}
                </p>
                <p className="text-sm text-white mb-2">
                  <strong className="text-white">Program:</strong> {item.program.name}
                </p>
                {!item.isNCFree ? (
                  <p className="text-sm text-white mb-2">
                    <strong className="text-white">NC Threshold:</strong> {item.ncThreshold.toFixed(1)}
                  </p>
                ) : (
                  <p className="text-sm text-green-400 mb-2">
                    <strong>NC-free</strong>
                  </p>
                )}
                <button
                  onClick={() => {
                    if (onMarkerClick) {
                      onMarkerClick(item.university.name);
                    }
                  }}
                  className="mt-3 w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-sm font-medium transition-all duration-200"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

