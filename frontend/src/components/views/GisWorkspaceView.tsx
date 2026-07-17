import React from 'react';
import dynamic from 'next/dynamic';
import { useStore } from '../../store/useStore';
import { Layers } from 'lucide-react';

// Dynamically import MapComponent with SSR disabled to prevent Server-Side compilation errors
const LazyMapComponent = dynamic(
  () => import('../MapComponent').then((mod) => mod.MapComponent),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-white flex items-center justify-center text-[#5c564c] font-semibold border border-[#d8d2c4] rounded">
        Loading GIS Spatial Workspace...
      </div>
    )
  }
);

export const GisWorkspaceView: React.FC = () => {
  const { gisData, isLoading } = useStore();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 lg:h-[calc(100vh-120px)] h-auto overflow-y-auto lg:overflow-hidden">
      
      {/* LEFT COLUMN: Recommended Centroids Listing */}
      <div className="lg:col-span-1 bg-[#eae4d5] border border-[#d8d2c4] p-5 rounded flex flex-col justify-between lg:h-full h-auto overflow-hidden">
        <div className="flex flex-col lg:h-full overflow-hidden">
          
          <div className="flex items-center gap-2 border-b border-[#d8d2c4] pb-3 mb-4 shrink-0">
            <Layers className="text-[#15803d] w-5 h-5" />
            <h2 className="text-md font-bold uppercase tracking-wider text-slate-900">GIS Coordinates</h2>
          </div>
          
          <div className="text-[10px] text-[#5c564c] mb-4 shrink-0 uppercase tracking-widest leading-relaxed">
            AI-optimized centroids calculated based on subcounty population densities and competitor coverage gaps.
          </div>

          {/* List scroll container */}
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3 scrollbar-thin">
            {isLoading ? (
              <div className="text-[#5c564c] text-sm text-center py-10">Recalculating network nodes...</div>
            ) : gisData.length === 0 ? (
              <div className="text-[#5c564c] text-sm text-center py-10">No recommendation coordinates loaded.</div>
            ) : (
              gisData.map((rec, idx) => (
                <div 
                  key={`gis-rec-${idx}`} 
                  className="bg-white border border-[#d8d2c4] border-l-2 border-l-[#15803d] p-4 rounded hover:border-[#111111] hover:bg-[#fdfcf9] transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-extrabold text-xs text-[#15803d] uppercase tracking-wider">Node #{idx + 1}</span>
                    <span className="text-[10px] font-bold text-[#15803d] bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">{rec.overall_viability_score}/100</span>
                  </div>
                  
                  <div className="font-bold text-slate-900 text-sm group-hover:text-[#15803d] transition-colors">{rec.subcounty} Centroid</div>
                  <div className="text-xs text-[#5c564c] mt-1 select-all font-mono">{rec.latitude.toFixed(5)}, {rec.longitude.toFixed(5)}</div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-[#d8d2c4] text-[10px] text-[#5c564c]">
                    <div>Demand: <span className="text-slate-900 font-semibold">{rec.rider_demand_score}/100</span></div>
                    <div>Grid Cap: <span className="text-slate-900 font-semibold">{rec.grid_stability_score}/100</span></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="border-t border-[#d8d2c4] pt-4 mt-4 shrink-0 text-[10px] text-[#5c564c] flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#15803d] border border-white"></span>
            <span className="text-[#5c564c]">Proposed Swap stations (Teal nodes)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-white"></span>
            <span className="text-[#5c564c]">Existing Charging points (Grey circles)</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Cinematic GIS Map Wrapper */}
      <div className="lg:col-span-3 lg:h-full h-[450px]">
        <LazyMapComponent />
      </div>
    </div>
  );
};
export default GisWorkspaceView;
