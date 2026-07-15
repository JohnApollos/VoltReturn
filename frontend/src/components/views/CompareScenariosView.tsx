import React from 'react';
import { useStore, SavedScenario } from '../../store/useStore';
import { Columns, Play, Trash2, ArrowRight } from 'lucide-react';

export const CompareScenariosView: React.FC = () => {
  const { savedScenarios, deleteScenario, setSlider, setToggle, runSimulation, setView } = useStore();

  const handleLoadScenario = (sc: SavedScenario) => {
    setSlider('budget_kes', sc.budget_kes);
    setSlider('num_stations', sc.num_stations);
    setSlider('horizon_years', sc.horizon_years);
    setToggle('risk_appetite', sc.risk_appetite);
    setToggle('tariff_type', sc.tariff_type);
    
    runSimulation();
    setView('dashboard');
  };

  // Find the optimal scenario (highest IRR / lowest default risk ratio)
  const getOptimalScenario = () => {
    if (savedScenarios.length === 0) return null;
    return savedScenarios.reduce((prev, current) => {
      const prevRatio = prev.irr / (prev.default_reduction || 1.0);
      const currRatio = current.irr / (current.default_reduction || 1.0);
      return currRatio > prevRatio ? current : prev;
    });
  };

  const optimalSc = getOptimalScenario();

  return (
    <div className="p-6 flex flex-col gap-6">
      
      <div className="flex justify-between items-center border-b border-[#1e293b] pb-4 mb-2">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide uppercase flex items-center gap-2">
            <Columns className="text-emerald-400 w-5 h-5" />
            Scenario Comparison Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest leading-relaxed">
            Side-by-side comparative analysis of saved capital configurations and forecasted default variables.
          </p>
        </div>
      </div>

      {savedScenarios.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-lg max-w-xl mx-auto mt-10">
          <div className="text-slate-400 font-semibold mb-4 text-base">No Saved Scenarios Found</div>
          <p className="text-slate-500 text-xs leading-relaxed mb-6">
            Configure capital budgets, station counts, charging strategies, and risk profiles in the Scenario Configurator, then save your run to compare metrics here.
          </p>
          <button 
            onClick={() => setView('dashboard')}
            className="px-6 py-2.5 bg-emerald-500 text-[#060813] font-bold text-xs rounded uppercase tracking-wider hover:bg-emerald-600 transition-all cursor-pointer inline-flex items-center gap-2"
          >
            Start Scenario Configuration
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Highlight Optimal Scenario Card */}
          {optimalSc && (
            <div className="glass-panel p-5 rounded border-l-4 border-l-emerald-500 bg-[#0e1017] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">Recommended Optimization Outcome</div>
                <h3 className="text-white font-extrabold text-lg">Scenario: {optimalSc.name}</h3>
                <p className="text-slate-400 text-xs leading-relaxed mt-1">
                  Identified as the optimal frontier because it balances maximum returns (IRR: <span className="text-emerald-400">{optimalSc.irr}%</span>) with lower default exposures (Default: <span className="text-emerald-400">{optimalSc.default_reduction}%</span>).
                </p>
              </div>
              <button 
                onClick={() => handleLoadScenario(optimalSc)}
                className="px-5 py-2 bg-emerald-500 text-[#060813] font-bold text-xs uppercase tracking-wider rounded hover:bg-emerald-600 cursor-pointer shrink-0 transition-all"
              >
                Load Scenario
              </button>
            </div>
          )}

          {/* Matrix Comparison Table */}
          <div className="glass-panel rounded overflow-x-auto border border-[#181b24] w-full">
            <table className="w-full text-left border-collapse text-xs select-none min-w-[800px]">
              <thead>
                <tr className="bg-[#0c0d12] border-b border-[#181b24] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Scenario Name</th>
                  <th className="p-4 text-center">Budget (CapEx)</th>
                  <th className="p-4 text-center">BSS Units</th>
                  <th className="p-4 text-center">Horizon</th>
                  <th className="p-4 text-center">IRR (%)</th>
                  <th className="p-4 text-center">NPV (KES)</th>
                  <th className="p-4 text-center">Expected Default</th>
                  <th className="p-4 text-center">CO2 Offset</th>
                  <th className="p-4 text-center">Payback</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181b24] text-slate-300">
                {savedScenarios.map((sc) => (
                  <tr 
                    key={sc.id} 
                    className={`hover:bg-slate-900/30 transition-colors ${optimalSc?.id === sc.id ? 'bg-emerald-500/5' : ''}`}
                  >
                    <td className="p-4 font-bold text-white max-w-[200px] truncate">{sc.name}</td>
                    <td className="p-4 text-center">KES {sc.budget_kes / 1000000}M</td>
                    <td className="p-4 text-center">{sc.num_stations} Units</td>
                    <td className="p-4 text-center">{sc.horizon_years} Yrs</td>
                    <td className="p-4 text-center font-extrabold text-emerald-400">{sc.irr}%</td>
                    <td className="p-4 text-center">KES {(sc.npv / 1000000).toFixed(1)}M</td>
                    <td className="p-4 text-center font-semibold text-slate-200">{sc.default_reduction}%</td>
                    <td className="p-4 text-center text-slate-400">{sc.carbon_offset?.toLocaleString()} tCO2</td>
                    <td className="p-4 text-center">{sc.payback} Yrs</td>
                    <td className="p-4 text-center flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleLoadScenario(sc)}
                        className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-[#060813] rounded transition-all cursor-pointer"
                        title="Load Scenario"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button 
                        onClick={() => deleteScenario(sc.id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded transition-all cursor-pointer"
                        title="Delete Scenario"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default CompareScenariosView;
