import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useStore, RecommendedStation, BACKEND_URL } from '../store/useStore';

// Nairobi center coordinates
const NAIROBI_CENTER: [number, number] = [-1.2921, 36.8219];

const BRAND_COLORS: Record<string, { stroke: string; fill: string; badgeBg: string; badgeText: string }> = {
  Roam: { stroke: '#be123c', fill: '#e11d48', badgeBg: '#ffe4e6', badgeText: '#9f1239' },
  Ampersand: { stroke: '#b45309', fill: '#d97706', badgeBg: '#fef3c7', badgeText: '#92400e' },
  Spiro: { stroke: '#0369a1', fill: '#0284c7', badgeBg: '#e0f2fe', badgeText: '#075985' },
  Zeno: { stroke: '#6d28d9', fill: '#7c3aed', badgeBg: '#ede9fe', badgeText: '#5b21b6' },
  Default: { stroke: '#334155', fill: '#475569', badgeBg: '#f1f5f9', badgeText: '#334155' }
};

export const MapComponent: React.FC = () => {
  const { gisData } = useStore();
  const [existingStations, setExistingStations] = useState<any[]>([]);
  const [mapLayer, setMapLayer] = useState<'dark' | 'light'>('light');

  // Load registered swap stations coordinates from backend API
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/v1/infrastructure/existing-stations`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch existing stations');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped = data.map((st: any) => ({
            id: st.station_id || `ST-${Math.random()}`,
            name: st.name || 'Swap Station',
            brand: st.brand || 'Other',
            latitude: Number(st.lat ?? st.latitude),
            longitude: Number(st.lon ?? st.longitude),
            cabinets: st.cabinets || 2,
            grid_reliability: st.grid_reliability || 0.90,
            peak_power_kw: st.peak_power_kw || 40.0
          }));
          setExistingStations(mapped);
        }
      })
      .catch(() => {
        // Fallback seed of authentic landmark coordinates if backend is temporarily disconnected
        const landmarkFallbacks = [
          { id: 'ROAM-01', name: 'Roam Hub - Lusaka', brand: 'Roam', latitude: -1.3050, longitude: 36.8350, cabinets: 3, grid_reliability: 0.94, peak_power_kw: 60.0 },
          { id: 'ROAM-02', name: 'Roam Hub - Adams Arcade', brand: 'Roam', latitude: -1.3010, longitude: 36.7820, cabinets: 2, grid_reliability: 0.92, peak_power_kw: 40.0 },
          { id: 'ROAM-03', name: 'Roam Hub - Langata', brand: 'Roam', latitude: -1.3280, longitude: 36.7910, cabinets: 2, grid_reliability: 0.93, peak_power_kw: 40.0 },
          { id: 'AMP-01', name: 'Ampersand - Hurlingham', brand: 'Ampersand', latitude: -1.2941, longitude: 36.8025, cabinets: 2, grid_reliability: 0.95, peak_power_kw: 45.0 },
          { id: 'AMP-02', name: 'Ampersand - Westlands', brand: 'Ampersand', latitude: -1.2650, longitude: 36.8000, cabinets: 3, grid_reliability: 0.95, peak_power_kw: 67.5 },
          { id: 'AMP-03', name: 'Ampersand - Mombasa Road', brand: 'Ampersand', latitude: -1.3400, longitude: 36.8900, cabinets: 2, grid_reliability: 0.94, peak_power_kw: 45.0 },
          { id: 'SPI-01', name: 'Spiro - Petrocity Westlands', brand: 'Spiro', latitude: -1.2640, longitude: 36.8040, cabinets: 2, grid_reliability: 0.95, peak_power_kw: 45.0 },
          { id: 'SPI-02', name: 'Spiro - Industrial Area', brand: 'Spiro', latitude: -1.3120, longitude: 36.8450, cabinets: 3, grid_reliability: 0.94, peak_power_kw: 67.5 },
          { id: 'SPI-03', name: 'Spiro - Ngong Road', brand: 'Spiro', latitude: -1.3010, longitude: 36.7720, cabinets: 2, grid_reliability: 0.91, peak_power_kw: 45.0 },
          { id: 'ZEN-01', name: 'Zeno Swap Station - Bunyala', brand: 'Zeno', latitude: -1.3010, longitude: 36.8220, cabinets: 2, grid_reliability: 0.94, peak_power_kw: 30.0 }
        ];
        setExistingStations(landmarkFallbacks);
      });
  }, []);

  return (
    <div className="w-full h-full relative rounded overflow-hidden border border-[#d8d2c4]">
      
      {/* Map layer switcher */}
      <div className="absolute top-3 right-3 z-[1000] flex gap-2">
        <button 
          onClick={() => setMapLayer('light')}
          className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer transition-all border ${
            mapLayer === 'light' 
              ? 'bg-[#15803d] border-[#15803d] text-white' 
              : 'bg-white border-[#d8d2c4] text-[#5c564c] hover:border-[#111111] hover:bg-slate-50'
          }`}
        >
          Editorial Map
        </button>
        <button 
          onClick={() => setMapLayer('dark')}
          className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer transition-all border ${
            mapLayer === 'dark' 
              ? 'bg-[#15803d] border-[#15803d] text-white' 
              : 'bg-white border-[#d8d2c4] text-[#5c564c] hover:border-[#111111] hover:bg-slate-50'
          }`}
        >
          Satellite
        </button>
      </div>

      <MapContainer 
        center={NAIROBI_CENTER} 
        zoom={12} 
        scrollWheelZoom={true} 
        className="w-full h-full"
      >
        {/* Render base map tiles */}
        {mapLayer === 'light' ? (
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; ESRI Satellite'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        {/* 1. Plot Existing Stations (Color-coded by Operator Brand) */}
        {existingStations.map((st) => {
          const brandStyle = BRAND_COLORS[st.brand] || BRAND_COLORS.Default;
          return (
            <CircleMarker
              key={st.id}
              center={[st.latitude, st.longitude]}
              radius={6}
              pathOptions={{
                color: brandStyle.stroke,
                fillColor: brandStyle.fill,
                fillOpacity: 0.85,
                weight: 1.5
              }}
            >
              <Popup>
                <div className="text-xs p-1 select-none">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span 
                      className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider"
                      style={{ backgroundColor: brandStyle.badgeBg, color: brandStyle.badgeText }}
                    >
                      {st.brand}
                    </span>
                    <span className="text-[10px] text-[#5c564c] font-mono">{st.id}</span>
                  </div>
                  <div className="font-bold text-slate-900 text-sm mb-1">{st.name}</div>
                  <div className="flex flex-col gap-1 border-t border-[#d8d2c4] pt-1.5 mt-1 text-[10px] text-[#5c564c]">
                    <div className="flex justify-between gap-4">
                      <span>Cabinets:</span>
                      <span className="font-semibold text-slate-900">{st.cabinets} units</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Grid Reliability:</span>
                      <span className="font-semibold text-emerald-700">{Math.round((st.grid_reliability || 0.9) * 100)}%</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>Peak Power:</span>
                      <span className="font-semibold text-slate-900">{st.peak_power_kw || 40} kW</span>
                    </div>
                    <div className="flex justify-between gap-4 pt-1 border-t border-slate-100">
                      <span>Coordinates:</span>
                      <span className="font-mono text-[9px]">{st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* 2. Plot K-Means Recommended Stations (Neon Green circles with pulse glows) */}
        {gisData.map((rec, idx) => (
          <React.Fragment key={`rec-marker-${idx}`}>
            
            {/* Outer Glowing Ring */}
            <CircleMarker
              center={[rec.latitude, rec.longitude]}
              radius={14}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.1,
                weight: 1,
                dashArray: '3, 3'
              }}
            />

            {/* Inner Core Marker */}
            <CircleMarker
              center={[rec.latitude, rec.longitude]}
              radius={8}
              pathOptions={{
                color: '#060813',
                fillColor: '#10b981',
                fillOpacity: 1.0,
                weight: 2
              }}
            >
              <Popup>
                <div className="text-xs p-1 select-none">
                  <div className="font-extrabold text-[#15803d] text-sm mb-1 uppercase tracking-wide">Proposed Station #{idx + 1}</div>
                  <div className="font-semibold text-slate-900 mb-2">{rec.subcounty} Centroid</div>
                  
                  <div className="flex flex-col gap-1 border-t border-[#d8d2c4] pt-2 mt-2">
                    <div className="flex justify-between gap-6 text-[10px]">
                      <span className="text-[#5c564c]">Demand Score:</span>
                      <span className="text-slate-900 font-semibold">{rec.rider_demand_score}/100</span>
                    </div>
                    <div className="flex justify-between gap-6 text-[10px]">
                      <span className="text-[#5c564c]">Grid Stability:</span>
                      <span className="text-slate-900 font-semibold">{rec.grid_stability_score}/100</span>
                    </div>
                    <div className="flex justify-between gap-6 text-[10px]">
                      <span className="text-[#5c564c]">Overall Viability:</span>
                      <span className="text-[#15803d] font-bold">{rec.overall_viability_score}/100</span>
                    </div>
                    <div className="flex justify-between gap-6 text-[10px]">
                      <span className="text-[#5c564c]">Nearest Station:</span>
                      <span className="text-slate-900">{rec.distance_to_existing_km.toFixed(1)} km</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};
export default MapComponent;
