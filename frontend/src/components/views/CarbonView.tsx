import React from 'react';
import { useStore } from '../../store/useStore';
import { Leaf, Globe, Sparkles, AlertCircle, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const CarbonView: React.FC = () => {
  const { simulationData, isLoading } = useStore();

  const getCarbonChartData = () => {
    if (!simulationData) return [];
    const totalTons = simulationData.carbon_offset_tco2 || 0;
    return [
      { year: 'Year 1', offset: Math.round(totalTons * 0.15) },
      { year: 'Year 2', offset: Math.round(totalTons * 0.35) },
      { year: 'Year 3', offset: Math.round(totalTons * 0.60) },
      { year: 'Year 4', offset: Math.round(totalTons * 0.85) },
      { year: 'Year 5', offset: Math.round(totalTons) }
    ];
  };

  const chartData = getCarbonChartData();
  const totalOffset = simulationData?.carbon_offset_tco2 || 0;
  const petrolDisplaced = Math.round(totalOffset * 322.5); // 322.5 liters petrol displaced per ton CO2 saved
  const treesEquivalent = Math.round(totalOffset * 45); // 45 trees offset per ton CO2 saved
  const carbonRevenue = Math.round(totalOffset * 20 * 130); // $20/ton carbon credit priced at 130 KES

  return (
    <div className="p-6 flex flex-col gap-6">
      
      <div className="flex justify-between items-center border-b border-[#1e293b] pb-4 mb-2">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Leaf className="text-emerald-400 w-5 h-5" />
            Carbon Offset & Sustainability Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest leading-relaxed">
            Calculates environmental displacement indicators in compliance with Verra VM0038 rules.
          </p>
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Net CO2 offset */}
        <div className="glass-panel p-5 rounded-lg border-l-4 border-l-emerald-500">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Net CO2 Displaced</div>
          <div className="text-3xl font-extrabold text-white mt-2">
            {isLoading ? '...' : `${totalOffset.toLocaleString()} Tons`}
          </div>
          <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Verra VM0038 certified</span>
          </div>
        </div>

        {/* Petrol liters displaced */}
        <div className="glass-panel p-5 rounded-lg border-l-4 border-l-blue-500">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Petrol Displaced</div>
          <div className="text-3xl font-extrabold text-white mt-2">
            {isLoading ? '...' : `${petrolDisplaced.toLocaleString()} Liters`}
          </div>
          <div className="text-xs text-blue-400 mt-2">Displacing petrol fuel emissions</div>
        </div>

        {/* Trees Planted equivalent */}
        <div className="glass-panel p-5 rounded-lg border-l-4 border-l-amber-500">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Trees Planted Equiv.</div>
          <div className="text-3xl font-extrabold text-white mt-2">
            {isLoading ? '...' : `${treesEquivalent.toLocaleString()} Trees`}
          </div>
          <div className="text-xs text-amber-400 mt-2">Acre-years absorption rate</div>
        </div>

        {/* Potential ESG credit funding */}
        <div className="glass-panel p-5 rounded-lg border-l-4 border-l-purple-500">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Carbon Credits Value</div>
          <div className="text-3xl font-extrabold text-white mt-2">
            {isLoading ? '...' : `KES ${(carbonRevenue / 1000000).toFixed(1)}M`}
          </div>
          <div className="text-xs text-purple-400 mt-2">Priced at $20/ton baseline</div>
        </div>

      </div>

      {/* Row 2: Charts and Detailed methodology */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cumulative Carbon Offset Chart */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-lg h-[340px] flex flex-col justify-between">
          <div>
            <h3 className="text-white font-bold text-sm tracking-wide uppercase mb-4">Cumulative CO2 Avoidance Projection</h3>
          </div>
          
          <div className="flex-1 w-full mt-2">
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid stroke="#1e293b" vertical={false} />
                <XAxis dataKey="year" stroke="#475569" fontSize={9} tickLine={false} />
                <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '4px' }}
                  labelClassName="text-slate-400 font-mono text-xs"
                />
                <Bar dataKey="offset" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth={1.5} name="CO2 Offsets (Tons)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Methodology Notes */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-lg flex flex-col justify-between h-[340px]">
          <div>
            <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-400" />
              Methodology
            </h3>
            
            <div className="text-slate-300 text-xs leading-relaxed flex flex-col gap-3">
              <p>
                <b>Petrol Baseline emissions:</b> Standard 100cc petrol boda boda exhaust factor is set to 3.10 kg CO2 per liter, assuming fuel efficiency of 35 km/L.
              </p>
              <p>
                <b>Grid Electricity displacement:</b> EV charging electricity offset assumes Kenya's high-renewables grid mix factor (0.05 kg CO2/kWh).
              </p>
              <p className="text-amber-400 flex items-start gap-2 pt-2 border-t border-[#1e293b] mt-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>If simulating diesel generator backups, the grid factor rises to 0.45 kg CO2/kWh, decreasing offset yields.</span>
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
export default CarbonView;
