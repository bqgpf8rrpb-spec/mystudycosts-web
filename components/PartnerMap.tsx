'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

interface PartnerMapProps {
  partners: any[];
}

export default function PartnerMap({ partners }: PartnerMapProps) {
  return (
    <MapContainer
      center={[50, 10]}
      zoom={4}
      style={{ height: '500px', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {partners.map((partner, index) => (
        <Marker
          key={partner.id || index}
          position={[partner.lat, partner.lng]}
        >
          <Popup>
            <div>
              <h3 className="font-bold">{partner.name}</h3>
              <p>€{partner.erasmus_monthly_amount}/month</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}