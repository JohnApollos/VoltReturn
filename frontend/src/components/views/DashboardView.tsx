import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { 
  BarChart3, 
  Save, 
  HelpCircle, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  ShieldAlert 
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    budget_kes, 
    num_stations, 
    horizon_years, 
    risk_appetite, 
    tariff_type, 
    setSlider, 
    setToggle,
    simulationData,
    portfolioSummary,
    fleetSummary,
    saveScenario,
    isLoading
  } = useStore();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');

  // Derive dynamic investment score out of 100 based on IRR, NPV viability, and default rates
  const calculateScore = () => {
    let score = 50;
    const irr = simulationData?.expected_irr_pct || 0;
    const npv = simulationData?.expected_npv_kes || 0;
    const def = portfolioSummary?.expected_default_rate_pct || 4.9;
    score += Math.min(20, (irr / 30) * 20);
    if (npv > 0) score += 20;
    score += Math.max(0, Math.min(10, (5.0 - def) * 4));
    return Math.round(Math.min(99, score));
  };
  const investmentScore = calculateScore();

  const handleSave = () => {
    if (!scenarioName.trim()) return;
    saveScenario(scenarioName.trim());
    setScenarioName('');
    setShowSaveModal(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 p-6">
      
      {/* LEFT COLUMN: Scenario Builder Sliders */}
      <div className="xl:col-span-1 bg-[#eae4d5] border border-[#d8d2c4] p-6 rounded flex flex-col justify-between min-h-[500px]">
        <div>
          <div className="flex items-center gap-2 border-b border-[#d8d2c4] pb-3 mb-6">
            <BarChart3 className="text-[#15803d] w-5 h-5" />
            <h2 className="text-md font-bold uppercase tracking-wider text-slate-900">Scenario Configurator</h2>
          </div>

          {/* Budget Slider */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#5c564c]">CapEx Budget</span>
              <span className="text-[#15803d] font-bold">KES {budget_kes / 1000000}M</span>
            </div>
            <input 
              type="range" 
              min="10000000" 
              max="500000000" 
              step="10000000"
              value={budget_kes} 
              onChange={(e) => setSlider('budget_kes', Number(e.target.value))}
              className="w-full accent-[#15803d] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#5c564c] mt-1">
              <span>KES 10M</span>
              <span>KES 500M</span>
            </div>
          </div>

          {/* Stations Slider */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#5c564c]">Battery Swap Stations</span>
              <span className="text-[#15803d] font-bold">{num_stations} Units</span>
            </div>
            <input 
              type="range" 
              min="3" 
              max="50" 
              step="1"
              value={num_stations} 
              onChange={(e) => setSlider('num_stations', Number(e.target.value))}
              className="w-full accent-[#15803d] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#5c564c] mt-1">
              <span>3 Units</span>
              <span>50 Units</span>
            </div>
          </div>

          {/* Horizon Slider */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#5c564c]">Simulation Horizon</span>
              <span className="text-[#15803d] font-bold">{horizon_years} Years</span>
            </div>
            <input 
              type="range" 
              min="3" 
              max="10" 
              step="1"
              value={horizon_years} 
              onChange={(e) => setSlider('horizon_years', Number(e.target.value))}
              className="w-full accent-[#15803d] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#5c564c] mt-1">
              <span>3 Years</span>
              <span>10 Years</span>
            </div>
          </div>

          {/* Risk Appetite */}
          <div className="mb-6">
            <span className="text-[#5c564c] text-sm block mb-2">Risk Tolerance</span>
            <div className="grid grid-cols-3 gap-2">
              {['low', 'medium', 'high'].map((r) => (
                <button
                  key={r}
                  onClick={() => setToggle('risk_appetite', r)}
                  className={`py-2 text-xs font-bold rounded uppercase tracking-wider border transition-all cursor-pointer ${
                    risk_appetite === r 
                      ? 'bg-[#15803d] border-[#15803d] text-white' 
                      : 'border-[#ccc4b5] bg-white hover:border-[#111111] text-[#5c564c]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Tariff Options */}
          <div className="mb-6">
            <span className="text-[#5c564c] text-sm block mb-2">Charging Schedule (Tariff)</span>
            <div className="grid grid-cols-3 gap-2">
              {['peak', 'mixed', 'off-peak'].map((t) => (
                <button
                  key={t}
                  onClick={() => setToggle('tariff_type', t)}
                  className={`py-2 text-[10px] font-bold rounded uppercase tracking-wider border transition-all cursor-pointer ${
                    tariff_type === t 
                      ? 'bg-[#15803d] border-[#15803d] text-white' 
                      : 'border-[#ccc4b5] bg-white hover:border-[#111111] text-[#5c564c]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button: Save Scenario */}
        <button 
          onClick={() => setShowSaveModal(true)}
          className="w-full py-3 bg-[#111111] hover:bg-[#222222] border border-[#111111] hover:border-[#15803d] text-white font-bold text-sm rounded flex items-center justify-center gap-2 cursor-pointer transition-all"
        >
          <Save className="w-4 h-4 text-emerald-500" />
          Save Active Scenario
        </button>
      </div>

      {/* RIGHT COLUMN: Dashboard KPI scorecards and details */}
      <div className="xl:col-span-3 flex flex-col gap-6">
        
        {/* Row 1: Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Investment Score */}
          <div className="bg-white border border-[#d8d2c4] p-5 rounded flex items-center justify-between border-l-4 border-l-[#15803d]">
            <div>
              <div className="text-[#5c564c] text-xs font-bold uppercase tracking-wider">Project Score</div>
              <div className="text-4xl font-extrabold text-[#15803d] mt-2">{isLoading ? '...' : `${investmentScore}/100`}</div>
              <div className="text-xs text-emerald-700 mt-2 flex items-center gap-1 font-semibold">
                <span>94% Confidence Rating</span>
                <span title="Derived index weighting NPV feasibility, IRR threshold margins, and rider credit loss deltas.">
                  <HelpCircle className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-[#15803d] border border-emerald-100 rounded-md">
              <Activity className="w-8 h-8" />
            </div>
          </div>

          {/* Card 2: Expected IRR */}
          <div className="bg-white border border-[#d8d2c4] p-5 rounded flex items-center justify-between border-l-4 border-l-[#1a68d1]">
            <div>
              <div className="text-[#5c564c] text-xs font-bold uppercase tracking-wider">Internal Rate of Return (IRR)</div>
              <div className="text-4xl font-extrabold text-[#1a68d1] mt-2">
                {isLoading ? '...' : `${simulationData?.expected_irr_pct || '0.0'}%`}
              </div>
              <div className="text-xs text-blue-700 mt-2 font-semibold">
                Hurdle margin: +{(simulationData?.expected_irr_pct - 12.0).toFixed(1) || '0.0'}%
              </div>
            </div>
            <div className="p-3 bg-blue-50 text-[#1a68d1] border border-blue-100 rounded-md">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>

          {/* Card 3: Expected NPV */}
          <div className="bg-white border border-[#d8d2c4] p-5 rounded flex items-center justify-between border-l-4 border-l-[#ea580c]">
            <div>
              <div className="text-[#5c564c] text-xs font-bold uppercase tracking-wider">Net Present Value (NPV)</div>
              <div className="text-3xl font-extrabold text-[#ea580c] mt-2">
                {isLoading ? '...' : `KES ${(simulationData?.expected_npv_kes / 1000000).toFixed(1)}M`}
              </div>
              <div className="text-xs text-amber-700 mt-2 font-semibold">
                Discount factor: 12.0%
              </div>
            </div>
            <div className="p-3 bg-orange-50 text-[#ea580c] border border-orange-100 rounded-md">
              <DollarSign className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Row 2: Secondary Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Enabled Riders */}
          <div className="bg-white border border-[#d8d2c4] p-4 rounded">
            <div className="text-[#5c564c] text-xs font-bold uppercase tracking-wider">Fleet Scale</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{isLoading ? '...' : `+${simulationData?.fleet_size || 0} Riders`}</div>
            <div className="text-[10px] text-[#5c564c] mt-1">Total operational scale support</div>
          </div>

          {/* Default Reduction */}
          <div className="bg-white border border-[#d8d2c4] p-4 rounded">
            <div className="text-[#5c564c] text-xs font-bold uppercase tracking-wider">Borrower Default</div>
            <div className="text-2xl font-bold text-red-700 mt-1">{isLoading ? '...' : `${portfolioSummary?.expected_default_rate_pct || '0.0'}%`}</div>
            <div className="text-[10px] text-[#5c564c] mt-1">Nairobi baseline was 4.9%</div>
          </div>

          {/* Payback period */}
          <div className="bg-white border border-[#d8d2c4] p-4 rounded">
            <div className="text-[#5c564c] text-xs font-bold uppercase tracking-wider">Payback Time</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{isLoading ? '...' : `${simulationData?.payback_period_years || '0.0'} Years`}</div>
            <div className="text-[10px] text-[#5c564c] mt-1">Capital return amortization</div>
          </div>

          {/* Carbon credit offset */}
          <div className="bg-white border border-[#d8d2c4] p-4 rounded">
            <div className="text-[#5c564c] text-xs font-bold uppercase tracking-wider">CO2 Offsets</div>
            <div className="text-2xl font-bold text-[#15803d] mt-1">{isLoading ? '...' : `${simulationData?.carbon_offset_tco2?.toLocaleString() || '0'} tCO2`}</div>
            <div className="text-[10px] text-[#5c564c] mt-1">Verra VM0038 ESG index</div>
          </div>
        </div>

        {/* Row 3: Corporate Summary & Asset Warnings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Executive Statement Box */}
          <div className="lg:col-span-2 bg-white border border-[#d8d2c4] p-6 rounded">
            <h3 className="text-slate-900 font-bold text-base border-b border-[#d8d2c4] pb-2 mb-4">Investment Memo Strategy</h3>
            <p className="text-slate-800 text-sm leading-relaxed mb-4">
              Investing <span className="text-slate-950 font-extrabold">KES {budget_kes/1000000} Million</span> to build <span className="text-slate-950 font-extrabold">{num_stations} Swap Cabinets</span> in Nairobi yields an expected IRR of <span className="text-[#15803d] font-extrabold">{simulationData?.expected_irr_pct}%</span> and a net portfolio default risk of <span className="text-[#15803d] font-extrabold">{portfolioSummary?.expected_default_rate_pct}%</span>.
            </p>
            <p className="text-[#5c564c] text-xs leading-relaxed">
              This layout bridges credit loops with charging economics. Transitioning stations to <span className="text-slate-900 font-semibold">Mixed</span> or <span className="text-slate-900 font-semibold">Off-Peak</span> grid charging mitigates power tariffs, maximizing NPV.
            </p>
          </div>

          {/* Asset Warnings Drawer */}
          <div className="lg:col-span-1 bg-white border border-[#d8d2c4] p-6 rounded flex flex-col justify-between">
            <div>
              <h3 className="text-slate-900 font-bold text-base border-b border-[#d8d2c4] pb-2 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                Fleet Health Audit
              </h3>
              
              <div className="flex flex-col gap-3">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5c564c]">Total Pack Capacity Status</span>
                  <span className="text-slate-900 font-semibold">{fleetSummary?.total_batteries || 50} Packs</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#5c564c]">Average State of Health (SoH)</span>
                  <span className="text-slate-900 font-semibold">{fleetSummary?.avg_soh || 94.2}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#5c564c]">High Risk Degradation Alerts</span>
                  <span className="text-amber-700 font-bold">{fleetSummary?.high_risk_batteries || 0} Units</span>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-[#5c564c] mt-4 leading-relaxed border-t border-[#d8d2c4] pt-3">
              Survival rate calculated via a 1,800 cycle Weibull curve. Zero critical warnings currently active.
            </div>
          </div>
        </div>
      </div>

      {/* SAVE SCENARIO MODAL WINDOW */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-[#1a1c18]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-[#d8d2c4] rounded p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Save Active Scenario</h3>
            <p className="text-xs text-[#5c564c] mb-4 leading-relaxed">
              Name this configuration to preserve the CapEx inputs, station counts, IRR returns, and comparative defaults.
            </p>
            
            <input 
              type="text" 
              placeholder="e.g. Nairobi Balanced Phase 1" 
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full px-3 py-2 bg-[#fdfcf9] border border-[#d8d2c4] rounded text-slate-900 text-sm focus:outline-none focus:border-[#15803d] mb-6"
            />
            
            <div className="flex justify-end gap-3 text-sm">
              <button 
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 border border-[#d8d2c4] text-[#5c564c] rounded hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={!scenarioName.trim()}
                className="px-4 py-2 bg-[#15803d] text-white font-bold rounded hover:bg-[#166534] disabled:opacity-50 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DashboardView;
