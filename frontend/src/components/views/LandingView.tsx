import React from 'react';
import { useStore, SavedScenario } from '../../store/useStore';
import { Play, ClipboardList, Trash2, ShieldCheck, TrendingUp, Sparkles } from 'lucide-react';

export const LandingView: React.FC = () => {
  const { savedScenarios, setView, deleteScenario, setSlider, setToggle, runSimulation } = useStore();

  const handleStartNew = () => {
    // Reset to default configs
    setSlider('budget_kes', 100000000);
    setSlider('num_stations', 12);
    setSlider('horizon_years', 5);
    setToggle('risk_appetite', 'medium');
    setToggle('tariff_type', 'mixed');
    
    runSimulation();
    setView('dashboard');
  };

  const handleLoadScenario = (sc: SavedScenario) => {
    setSlider('budget_kes', sc.budget_kes);
    setSlider('num_stations', sc.num_stations);
    setSlider('horizon_years', sc.horizon_years);
    setToggle('risk_appetite', sc.risk_appetite);
    setToggle('tariff_type', sc.tariff_type);
    
    runSimulation();
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f3ebd9] text-[#111111] flex flex-col justify-between relative overflow-hidden select-none">
      
      {/* Main hero area */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 py-12 text-center z-10 w-full">
        
        {/* Brand Banner */}
        <div className="mb-6 select-none">
          <img 
            src="/logo-wide.png" 
            alt="VoltReturn AI" 
            className="h-20 md:h-24 object-contain filter drop-shadow-[0_1px_4px_rgba(21,128,61,0.15)]" 
          />
        </div>

        {/* Dynamic Tagline */}
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[#111111] mb-6 leading-tight">
          Investment Decision Platform <br />
          <span className="text-[#15803d] italic font-serif">
            For African E-Mobility
          </span>
        </h1>
        
        <p className="text-[#5c564c] text-sm md:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
          VoltReturn leverages geocoded station distributions and battery degradation telemetry 
          to forecast cash flows, default exposures, and carbon offsets for African infrastructure funds.
        </p>

        {/* Start Button */}
        <button 
          onClick={handleStartNew}
          className="group px-8 py-3.5 bg-[#15803d] hover:bg-[#166534] text-white font-bold text-sm rounded shadow-[0_2px_8px_rgba(21,128,61,0.2)] transition-all flex items-center gap-3 cursor-pointer select-none"
        >
          <Play className="fill-current w-4 h-4" />
          Configure New Scenario
        </button>

        {/* Quick features bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full text-left">
          <div className="bg-white border border-[#d8d2c4] p-6 rounded flex items-start gap-4 hover:border-[#111111] transition-colors">
            <div className="p-3 bg-emerald-50 text-[#15803d] border border-emerald-100 rounded shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Credit Risk Feedback</h3>
              <p className="text-[#5c564c] text-xs leading-relaxed">Quantifies how swap station proximity directly reduces PAYG borrower defaults.</p>
            </div>
          </div>
          
          <div className="bg-white border border-[#d8d2c4] p-6 rounded flex items-start gap-4 hover:border-[#111111] transition-colors">
            <div className="p-3 bg-blue-50 text-[#1a68d1] border border-blue-100 rounded shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Newton-Raphson IRR</h3>
              <p className="text-[#5c564c] text-xs leading-relaxed">Simulates cash flows, grid electricity tariffs, and numerical hurdle returns.</p>
            </div>
          </div>

          <div className="bg-white border border-[#d8d2c4] p-6 rounded flex items-start gap-4 hover:border-[#111111] transition-colors">
            <div className="p-3 bg-amber-50 text-amber-700 border border-amber-100 rounded shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">RAG Decision Assistant</h3>
              <p className="text-[#5c564c] text-xs leading-relaxed">Retrieves live data queries and runs structured strategic analysis with Gemini.</p>
            </div>
          </div>
        </div>

        {/* Persisted Saved Scenarios Section */}
        {savedScenarios.length > 0 && (
          <div className="mt-16 w-full text-left">
            <div className="flex items-center gap-2 border-b border-[#d8d2c4] pb-3 mb-6">
              <ClipboardList className="text-[#5c564c] w-5 h-5" />
              <h2 className="text-sm font-bold text-[#111111] tracking-wide uppercase">Saved Scenarios ({savedScenarios.length})</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedScenarios.map((sc) => (
                <div 
                  key={sc.id} 
                  className="bg-white border border-[#d8d2c4] hover:border-[#111111] p-5 rounded flex items-center justify-between transition-all"
                >
                  <div 
                    onClick={() => handleLoadScenario(sc)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-bold text-slate-900 text-sm hover:text-[#15803d] transition-colors">{sc.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1">Saved: {sc.timestamp}</div>
                    <div className="flex gap-4 mt-3 text-[10px] text-[#5c564c]">
                      <div>Budget: <span className="text-slate-900 font-bold">KES {sc.budget_kes/1000000}M</span></div>
                      <div>Stations: <span className="text-slate-900 font-bold">{sc.num_stations}</span></div>
                      <div>IRR: <span className="text-[#15803d] font-extrabold">{sc.irr}%</span></div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => deleteScenario(sc.id)}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors rounded cursor-pointer"
                    title="Delete Scenario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#d8d2c4] py-6 text-center text-slate-500 text-xs">
        &copy; {new Date().getFullYear()} VoltReturn AI Decision Intelligence Systems. Prepared for Board & Investment Committee Consultation.
      </div>
    </div>
  );
};
export default LandingView;
