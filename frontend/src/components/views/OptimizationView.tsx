import React from 'react';
import { useStore } from '../../store/useStore';
import { Compass, MapPin, Grid3X3 } from 'lucide-react';

export const OptimizationView: React.FC = () => {
  const { gisData, isLoading } = useStore();

  return (
    <div className="p-6 flex flex-col gap-6">
      
      <div className="flex justify-between items-center border-b border-[#d8d2c4] pb-4 mb-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
            <Compass className="text-[#15803d] w-5 h-5" />
            AI Network Optimization Engine
          </h2>
          <p className="text-xs text-[#5c564c] mt-1 uppercase tracking-widest leading-relaxed">
            Identifies underserved centroids by running population-weighted K-Means coordinates mapping.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Methodology & Parameters */}
        <div className="lg:col-span-1 bg-[#eae4d5] border border-[#d8d2c4] p-6 rounded flex flex-col justify-between">
          <div>
            <h3 className="text-slate-900 font-bold text-base mb-4 flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-[#15803d]" />
              Optimization Protocol
            </h3>
            
            <div className="text-slate-800 text-xs leading-relaxed flex flex-col gap-4">
              <p>
                <b>Location-Allocation Modeling:</b> VoltReturn scans candidate coordinates outside the active 5km buffer of current stations, assigning weights relative to census population densities.
              </p>
              <p>
                <b>Multi-Criteria Suitability (S):</b>
                {"S = 0.40 * S_rider + 0.30 * S_connectivity + 0.15 * S_grid + 0.15 * S_road"}
              </p>
              <p>
                <b>Competitor Brand Sharing:</b> Adjusts coordinates based on grid-stability constraints to maximize grid-tie capacity.
              </p>
            </div>
          </div>
          
          <div className="text-[10px] text-[#5c564c] border-t border-[#d8d2c4] pt-4 mt-6 leading-relaxed">
            Relational coordinates and viability results are logged to the SQLite Recommendation Ledger.
          </div>
        </div>

        {/* Right Column: Recommendations Table */}
        <div className="lg:col-span-2 bg-white rounded border border-[#d8d2c4] overflow-hidden h-full flex flex-col justify-between">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="bg-[#fcfaf7] border-b border-[#d8d2c4] text-[#5c564c] font-bold uppercase tracking-wider">
                <th className="p-4 text-center">Rank</th>
                <th className="p-4">Subcounty Centroid</th>
                <th className="p-4 text-center">Target Coordinates</th>
                <th className="p-4 text-center">Demand Score</th>
                <th className="p-4 text-center">Grid Capacity</th>
                <th className="p-4 text-center">Overall Index</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d8d2c4] text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#5c564c]">Recalculating network nodes...</td>
                </tr>
              ) : gisData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#5c564c]">No recommendation coordinates loaded.</td>
                </tr>
              ) : (
                gisData.map((rec, idx) => (
                  <tr key={`opt-rec-${idx}`} className="hover:bg-[#fcfaf7] transition-colors">
                    <td className="p-4 text-center font-bold text-[#5c564c]">#{idx + 1}</td>
                    <td className="p-4 font-bold text-slate-900 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#15803d]" />
                      {rec.subcounty}
                    </td>
                    <td className="p-4 text-center font-mono text-[10px] text-[#5c564c]">{rec.latitude.toFixed(5)}, {rec.longitude.toFixed(5)}</td>
                    <td className="p-4 text-center text-slate-900 font-semibold">{rec.rider_demand_score}/100</td>
                    <td className="p-4 text-center text-slate-900 font-semibold">{rec.grid_stability_score}/100</td>
                    <td className="p-4 text-center font-extrabold text-[#15803d]">{rec.overall_viability_score}/100</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          <div className="p-4 bg-[#fcfaf7] border-t border-[#d8d2c4] text-[10px] text-[#5c564c]">
            *Showing top {gisData.length} optimal placements. Click on the GIS workspace to examine station grid proximity.
          </div>
        </div>

      </div>

    </div>
  );
};
export default OptimizationView;
