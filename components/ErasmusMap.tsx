'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import cityCoordinates from '@/data/city-coordinates.json';
import AffiliateLabel from '@/components/AffiliateLabel';

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface PartnerUniversity {
  name: string;
  city: string;
  country: string;
  monthlyLivingCost: number;
  travelCost: number;
  insuranceCost: number;
}

interface ErasmusMapProps {
  partners: PartnerUniversity[];
}

// Custom bright blue marker icon with glow for visibility on dark blue land
const createBlueMarker = () => {
  return L.divIcon({
    className: 'custom-blue-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%);
        border: 3px solid #93c5fd;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 
          0 0 0 3px rgba(59, 130, 246, 0.4),
          0 4px 20px rgba(59, 130, 246, 0.8),
          0 0 30px rgba(96, 165, 250, 0.6);
        position: relative;
        animation: pulse 2s ease-in-out infinite;
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
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4), 0 4px 20px rgba(59, 130, 246, 0.8), 0 0 30px rgba(96, 165, 250, 0.6); }
          50% { box-shadow: 0 0 0 5px rgba(59, 130, 246, 0.6), 0 6px 25px rgba(59, 130, 246, 1), 0 0 40px rgba(96, 165, 250, 0.8); }
        }
      </style>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to handle map view updates
function MapViewUpdater({ partners }: { partners: PartnerUniversity[] }) {
  const map = useMap();

  useEffect(() => {
    if (partners.length === 0) return;

    const coordinates = partners
      .map((partner) => {
        const coords = (cityCoordinates as Record<string, { lat: number; lng: number }>)[partner.city];
        return coords ? [coords.lat, coords.lng] : null;
      })
      .filter((coord): coord is [number, number] => coord !== null);

    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [partners, map]);

  return null;
}

export default function ErasmusMap({ partners }: ErasmusMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Get unique partners with coordinates
  const partnersWithCoords = partners
    .map((partner) => {
      const coords = (cityCoordinates as Record<string, { lat: number; lng: number }>)[partner.city];
      if (!coords) return null;
      return { ...partner, lat: coords.lat, lng: coords.lng };
    })
    .filter((partner): partner is PartnerUniversity & { lat: number; lng: number } => partner !== null);

  // Remove duplicates based on city
  const uniquePartners = Array.from(
    new Map(partnersWithCoords.map((p) => [`${p.city}-${p.country}`, p])).values()
  );

  if (uniquePartners.length === 0) {
    return (
      <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 text-center">
        <p className="text-white/60 text-sm">No partner locations available to display on map</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border-2 border-blue-500/20 shadow-2xl shadow-blue-500/10">
      <style jsx global>{`
        .leaflet-container {
          background: #0a1628 !important;
          filter: brightness(0.9) contrast(1.2) saturate(1.5) hue-rotate(190deg) invert(0.05);
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
        }
        .leaflet-popup-content h3 {
          color: #60a5fa !important;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        .leaflet-popup-content p {
          margin: 6px 0;
          color: rgba(255, 255, 255, 0.95);
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
        .custom-blue-marker {
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
        center={[50, 10]}
        zoom={4}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={true}
        scrollWheelZoom={true}
        className="erasmus-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
        />
        <MapViewUpdater partners={partners} />
        {uniquePartners.map((partner, index) => (
          <Marker
            key={`${partner.city}-${partner.country}-${index}`}
            position={[partner.lat, partner.lng]}
            icon={createBlueMarker()}
          >
            <Popup>
              <div className="text-white">
                <h3 className="font-bold text-base mb-3 text-blue-400">{partner.name}</h3>
                <p className="text-sm text-white mb-2">
                  <strong className="text-white">Location:</strong> {partner.city}, {partner.country}
                </p>
                <p className="text-sm text-white mb-2">
                  <strong className="text-white">Monthly Cost:</strong> €{partner.monthlyLivingCost.toLocaleString()}
                </p>
                <p className="text-xs text-blue-300/80 mt-3 pt-2 border-t border-white/10">
                  Click partner tile for full details
                </p>
                <div className="mt-2 pt-2 border-t border-white/5">
                  <AffiliateLabel variant="subtle" className="text-center" />
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

