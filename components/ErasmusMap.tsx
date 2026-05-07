'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getLocalizedCountryName, toCanonicalCountry } from '@/lib/country-i18n';
import { formatCurrency } from '@/lib/format';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import cityCoordinates from '@/data/city-coordinates.json';
import cityAliases from '@/data/city-aliases.json';
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

import type { PartnerUniversity } from '@/data/erasmus-types';

interface ErasmusMapProps {
  partners: PartnerUniversity[];
}

type PartnerWithCoords = PartnerUniversity & { lat: number; lng: number };

const JITTER_RAD = 0.002;

const cityAliasMap = cityAliases as Record<string, string>;

function resolveCityCoords(
  city: string,
  coordsData: Record<string, { lat: number; lng: number }>,
  country?: string
): { lat: number; lng: number } | null {
  const trimmed = city.trim();
  // Strip parenthetical suffix: "Camaiore (lu)" -> "Camaiore"
  const baseCity = trimmed.replace(/\s*\([^)]+\)\s*$/, '').trim();
  const candidates = trimmed !== baseCity ? [trimmed, baseCity] : [trimmed];

  for (const c of candidates) {
    // 1. Direct city lookup
    const resolvedKey = cityAliasMap[c] ?? c;
    let coords = coordsData[c] ?? coordsData[resolvedKey];
    if (coords) return coords;

    // 2. With country disambiguation (City|Country format)
    if (country && country !== 'Various' && country !== 'Unknown') {
      const cityCountryKey = `${c}|${country}`;
      const resolvedCityCountryKey = cityAliasMap[cityCountryKey] ?? cityCountryKey;
      coords = coordsData[cityCountryKey] ?? coordsData[resolvedCityCountryKey];
      if (coords) return coords;
    }
  }

  // Case-insensitive fallback: try matching coordsData keys
  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(coordsData)) {
    if (key.toLowerCase() === lower) return coordsData[key];
  }
  return null;
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function applyJitterForOverlaps(partners: PartnerWithCoords[]): PartnerWithCoords[] {
  const byPos = new Map<string, PartnerWithCoords[]>();
  for (const p of partners) {
    const key = `${p.lat.toFixed(6)}-${p.lng.toFixed(6)}`;
    if (!byPos.has(key)) byPos.set(key, []);
    byPos.get(key)!.push(p);
  }
  const result: PartnerWithCoords[] = [];
  for (const group of byPos.values()) {
    if (group.length === 1) {
      result.push(group[0]);
    } else {
      group.forEach((p, i) => {
        const baseAngle = (simpleHash(p.name) % 360) * (Math.PI / 180);
        const angle = baseAngle + i * 1.5;
        result.push({
          ...p,
          lat: p.lat + JITTER_RAD * Math.cos(angle),
          lng: p.lng + JITTER_RAD * Math.sin(angle),
        });
      });
    }
  }
  return result;
}

// Custom green marker icon for verified partners (no animations for performance)
const createVerifiedMarker = () => {
  return L.divIcon({
    className: 'custom-verified-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%);
        border: 3px solid #6ee7b7;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 
          0 0 0 3px rgba(16, 185, 129, 0.4),
          0 4px 20px rgba(16, 185, 129, 0.8),
          0 0 30px rgba(52, 211, 153, 0.6);
        position: relative;
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
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Custom magenta marker for traineeships (no animations)
const createTraineeshipMarker = () => {
  return L.divIcon({
    className: 'custom-traineeship-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #e879f9 0%, #d946ef 50%, #c026d3 100%);
        border: 3px solid #f5d0fe;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(192, 38, 211, 0.5);
        position: relative;
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
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Custom orange marker for unverified partners (no animations)
const createUnverifiedMarker = () => {
  return L.divIcon({
    className: 'custom-unverified-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #fb923c 0%, #f97316 50%, #ea580c 100%);
        border: 3px solid #fed7aa;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 
          0 0 0 3px rgba(249, 115, 22, 0.4),
          0 4px 20px rgba(249, 115, 22, 0.8),
          0 0 30px rgba(251, 146, 60, 0.6);
        position: relative;
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
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to handle map view updates
function MapViewUpdater({ partnersWithCoords }: { partnersWithCoords: PartnerWithCoords[] }) {
  const map = useMap();

  useEffect(() => {
    if (partnersWithCoords.length === 0) return;

    const coordinates = partnersWithCoords.map((p) => [p.lat, p.lng] as [number, number]);
    if (coordinates.length > 0) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 });
    }
  }, [partnersWithCoords, map]);

  return null;
}

export default function ErasmusMap({ partners }: ErasmusMapProps) {
  const t = useTranslations('ErasmusSelector');
  const pathname = usePathname();
  const locale = (pathname?.split('/')[1] || 'de') as 'de' | 'en';
  const mapRef = useRef<L.Map | null>(null);

  // Get partners with coordinates (use city alias mapping to fix empty state for e.g. Austria/Wien)
  // Skip partners with invalid city (Unknown, empty, Various) - they cannot be geocoded
  const INVALID_CITIES = new Set(['', 'Unknown', 'Various']);
  const coordsData = cityCoordinates as Record<string, { lat: number; lng: number }>;
  const partnersWithCoords = partners
    .filter((partner) => !INVALID_CITIES.has((partner.city || '').trim()))
    .map((partner) => {
      // Prefer existing lat/lng from source data (e.g. MoveOn enrichment)
      if (typeof partner.lat === 'number' && typeof partner.lng === 'number') {
        return { ...partner, lat: partner.lat, lng: partner.lng };
      }
      const canonicalCountry = toCanonicalCountry(partner.country || '');
      const coords = resolveCityCoords(partner.city, coordsData, canonicalCountry || partner.country);
      if (!coords) return null;
      return { ...partner, lat: coords.lat, lng: coords.lng };
    })
    .filter((partner): partner is PartnerUniversity & { lat: number; lng: number } => partner !== null);

  // Apply jitter for partners in same city so each gets a visible pin
  const partnersToShow = applyJitterForOverlaps(partnersWithCoords);

  if (partnersToShow.length === 0) {
    return (
      <div className="backdrop-blur-sm bg-slate-950/80 border border-white/10 rounded-xl p-8 text-center">
        <p className="text-white/60 text-sm">{t('noPartnerLocationsOnMap')}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border-2 border-blue-500/20 shadow-2xl shadow-blue-500/10">
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
        .custom-verified-marker,
        .custom-unverified-marker,
        .custom-traineeship-marker {
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
        {/* CartoDB Dark Matter TileLayer - No API key required */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
        />
        <MapViewUpdater partnersWithCoords={partnersToShow} />
        {partnersToShow.map((partner, index) => {
          const isTraineeship = partner.activity_type === 'traineeship';
          const isVerified =
            partner.confidence === 'verified_active' || partner.confidence === 'moveon_only';
          const icon = isTraineeship
            ? createTraineeshipMarker()
            : isVerified
              ? createVerifiedMarker()
              : createUnverifiedMarker();
          return (
            <Marker
              key={`${partner.name}-${partner.city}-${partner.country}-${index}`}
              position={[partner.lat, partner.lng]}
              icon={icon}
            >
              <Popup>
                <div className="text-white">
                  <h3 className="font-bold text-base mb-3 text-white">
                    {partner.name}
                  </h3>
                  {partner.activity_type === 'traineeship' && (
                    <span className="inline-block px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-xs font-medium rounded-full border border-emerald-500/50 mb-2">
                      {t('traineeshipBadge')}
                    </span>
                  )}
                  <p className="text-sm text-white mb-2">
                    <strong className="text-white">{t('location')}:</strong> {partner.city}, {getLocalizedCountryName(partner.country, locale)}
                  </p>
                  <p className="text-sm text-white mb-2">
                    <strong className="text-white">{t('monthlyCost')}:</strong>{' '}
                    {formatCurrency(partner.monthlyLivingCost, 'EUR', 1)}
                  </p>
                  {(partner.spotsPerSemester ?? partner.spotsPerYear) != null && (
                    <p className="text-sm text-white mb-2">
                      <strong className="text-white">
                        {partner.spotsPerSemester != null
                          ? t('spotsPerSemester', { count: partner.spotsPerSemester })
                          : t('spotsPerYear', { count: partner.spotsPerYear })}
                      </strong>
                    </p>
                  )}
                  <p className="text-xs mt-3 pt-2 border-t border-white/10 text-blue-300/80">
                    {t('clickPartnerForDetails')}
                  </p>
                <div className="mt-2 pt-2 border-t border-white/5">
                  <AffiliateLabel variant="subtle" className="text-center" />
                </div>
              </div>
            </Popup>
          </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

