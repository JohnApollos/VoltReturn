import React from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '../../store/useStore';
import { MapPin, Globe, Compass, Grid3X3, Layers } from 'lucide-react';

// Dynamically import MapComponent with SSR disabled to prevent Server-Side compilation errors
const LazyMapComponent = dynamic(
  () => import('../MapComponent').then((mod) => mod.MapComponent),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#0b0f19] flex items-center justify-center text-slate-400 font-semibold border border-[#1e293b] rounded-lg">
        Loading GIS Spatial Workspace...
      </div>
    )
  }
);

export const GisWorkspaceView: React.FC = () => {
  const { gisData, isLoading } = useStore();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 h-[calc(100vh-140px)]">
      
      {/* LEFT COLUMN: Recommended Centroids Listing */}
      <div className="lg:col-span-1 glass-panel p-5 rounded-lg flex flex-col justify-between h-full overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          
          <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 mb-4 shrink-0">
            <Layers className="text-emerald-400 w-5 h-5" />
            <h2 className="text-md font-bold uppercase tracking-wider text-white">GIS Coordinates</h2>
          </div>
          
          <div className="text-[10px] text-slate-500 mb-4 shrink-0 uppercase tracking-widest leading-relaxed">
            AI-optimized centroids calculated based on subcounty population densities and competitor coverage gaps.
          </div>

          {/* List scroll container */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin">
            {isLoading ? (
              <div className="text-slate-500 text-sm text-center py-10">Recalculating network nodes...</div>
            ) : gisData.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-10">No recommendation coordinates loaded.</div>
            ) : (
              gisData.map((rec, idx) => (
                <div 
                  key={`gis-rec-${idx}`} 
                  className="glass-panel p-4 rounded-lg border-l-2 border-l-emerald-500/80 hover:bg-slate-900/30 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-extrabold text-xs text-emerald-400 uppercase tracking-wider">Node #{idx + 1}</span>
                    <span className="text-[10px] font-bold text-white bg-emerald-500/20 px-2 py-0.5 rounded-full">{rec.overall_viability_score}/100</span>
                  </div>
                  
                  <div className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">{rec.subcounty} Centroid</div>
                  <div className="text-xs text-slate-400 mt-1 select-all font-mono">{rec.latitude.toFixed(5)}, {rec.longitude.toFixed(5)}</div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#1e293b] text-[10px] text-slate-400">
                    <div>Demand: <span className="text-slate-200">{rec.rider_demand_score}/100</span></div>
                    <div>Grid Cap: <span className="text-slate-200">{rec.grid_stability_score}/100</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="border-t border-[#1e293b] pt-4 mt-4 shrink-0 text-[10px] text-slate-500 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-[#060813]"></span>
            <span className="text-slate-400">Proposed Swap stations (Neon nodes)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-[#060813]"></span>
            <span className="text-slate-400">Existing Charging points (Grey circles)</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Cinematic GIS Map Wrapper */}
      <div className="lg:col-span-3 h-full">
        <LazyMapComponent />
      </div>
    </div>
  );
};
export default GisWorkspaceView;
