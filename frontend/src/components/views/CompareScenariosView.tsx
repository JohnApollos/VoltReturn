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
      
      <div className="flex justify-between items-center border-b border-[#d8d2c4] pb-4 mb-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
            <Columns className="text-[#15803d] w-5 h-5" />
            Scenario Comparison Matrix
          </h2>
          <p className="text-xs text-[#5c564c] mt-1 uppercase tracking-widest leading-relaxed">
            Side-by-side comparative analysis of saved capital configurations and forecasted default variables.
          </p>
        </div>
      </div>

      {savedScenarios.length === 0 ? (
        <div className="bg-white border border-[#d8d2c4] p-12 text-center rounded max-w-xl mx-auto mt-10">
          <div className="text-slate-900 font-bold mb-4 text-base">No Saved Scenarios Found</div>
          <p className="text-[#5c564c] text-xs leading-relaxed mb-6">
            Configure capital budgets, station counts, charging strategies, and risk profiles in the Scenario Configurator, then save your run to compare metrics here.
          </p>
          <button 
            onClick={() => setView('dashboard')}
            className="px-6 py-2.5 bg-[#15803d] text-white font-bold text-xs rounded uppercase tracking-wider hover:bg-[#166534] transition-all cursor-pointer inline-flex items-center gap-2"
          >
            Start Scenario Configuration
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Highlight Optimal Scenario Card */}
          {optimalSc && (
            <div className="bg-white border border-[#d8d2c4] border-l-4 border-l-[#15803d] p-5 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="text-xs font-bold text-[#15803d] uppercase tracking-widest mb-1">Recommended Optimization Outcome</div>
                <h3 className="text-slate-900 font-extrabold text-lg">Scenario: {optimalSc.name}</h3>
                <p className="text-[#5c564c] text-xs leading-relaxed mt-1">
                  Identified as the optimal frontier because it balances maximum returns (IRR: <span className="text-[#15803d] font-bold">{optimalSc.irr}%</span>) with lower default exposures (Default: <span className="text-[#15803d] font-bold">{optimalSc.default_reduction}%</span>).
                </p>
              </div>
              <button 
                onClick={() => handleLoadScenario(optimalSc)}
                className="px-5 py-2 bg-[#15803d] text-white font-bold text-xs uppercase tracking-wider rounded hover:bg-[#166534] cursor-pointer shrink-0 transition-all"
              >
                Load Scenario
              </button>
            </div>
          )}

          {/* Matrix Comparison Table */}
          <div className="bg-white rounded overflow-x-auto border border-[#d8d2c4] w-full">
            <table className="w-full text-left border-collapse text-xs select-none min-w-[800px]">
              <thead>
                <tr className="bg-[#fcfaf7] border-b border-[#d8d2c4] text-[#5c564c] font-bold uppercase tracking-wider">
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
              <tbody className="divide-y divide-[#d8d2c4] text-slate-800">
                {savedScenarios.map((sc) => (
                  <tr 
                    key={sc.id} 
                    className={`hover:bg-[#fcfaf7] transition-colors ${optimalSc?.id === sc.id ? 'bg-emerald-50/50' : ''}`}
                  >
                    <td className="p-4 font-bold text-slate-900 max-w-[200px] truncate">{sc.name}</td>
                    <td className="p-4 text-center">KES {sc.budget_kes / 1000000}M</td>
                    <td className="p-4 text-center">{sc.num_stations} Units</td>
                    <td className="p-4 text-center">{sc.horizon_years} Yrs</td>
                    <td className="p-4 text-center font-extrabold text-[#15803d]">{sc.irr}%</td>
                    <td className="p-4 text-center">KES {(sc.npv / 1000000).toFixed(1)}M</td>
                    <td className="p-4 text-center font-semibold text-slate-900">{sc.default_reduction}%</td>
                    <td className="p-4 text-center text-[#5c564c]">{sc.carbon_offset?.toLocaleString()} tCO2</td>
                    <td className="p-4 text-center">{sc.payback} Yrs</td>
                    <td className="p-4 text-center flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleLoadScenario(sc)}
                        className="p-1.5 bg-emerald-50 border border-emerald-200 hover:bg-[#15803d] text-[#15803d] hover:text-white rounded transition-all cursor-pointer"
                        title="Load Scenario"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                      <button 
                        onClick={() => deleteScenario(sc.id)}
                        className="p-1.5 bg-red-50 border border-red-100 hover:bg-red-600 text-red-600 hover:text-white rounded transition-all cursor-pointer"
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
