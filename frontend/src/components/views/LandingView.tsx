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
    <div className="min-h-screen bg-[#060813] text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Decorative light glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none"></div>

      {/* Main hero area */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 py-12 text-center z-10">
        
        {/* Brand Banner */}
        <div className="mb-8 select-none">
          <img 
            src="/logo-wide.png" 
            alt="VoltReturn AI" 
            className="h-24 md:h-32 object-contain filter drop-shadow-[0_4px_12px_rgba(16,185,129,0.25)]" 
          />
        </div>

        {/* Dynamic Tagline */}
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
          Investment Decision Platform <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-blue-500">
            For African E-Mobility
          </span>
        </h1>
        
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          VoltReturn leverages physical demographics, geocoded station coverage metrics, and battery degradation curves 
          to forecast project cash flows, default exposures, and carbon offsets for African infrastructure funds.
        </p>

        {/* Start Button */}
        <button 
          onClick={handleStartNew}
          className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-[#060813] font-bold text-lg rounded-lg shadow-[0_4px_20px_rgba(16,185,129,0.35)] transition-all transform hover:-translate-y-0.5 duration-200 flex items-center gap-3 cursor-pointer"
        >
          <Play className="fill-current w-5 h-5" />
          Configure New Scenario
        </button>

        {/* Quick features bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full">
          <div className="glass-panel p-6 rounded-lg text-left flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base mb-1">Credit Risk Feedback Loop</h3>
              <p className="text-slate-400 text-sm">Quantifies how battery swap station proximity directly reduces PAYG borrower defaults.</p>
            </div>
          </div>
          
          <div className="glass-panel p-6 rounded-lg text-left flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-md">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base mb-1">Newton-Raphson IRR</h3>
              <p className="text-slate-400 text-sm">Simulates cash flows, grid electricity tariffs, and numerical hurdle returns.</p>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-lg text-left flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-md">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base mb-1">RAG Decision Assistant</h3>
              <p className="text-slate-400 text-sm">Retrieves live data queries and runs structured strategic analysis with Gemini.</p>
            </div>
          </div>
        </div>

        {/* Persisted Saved Scenarios Section */}
        {savedScenarios.length > 0 && (
          <div className="mt-16 w-full text-left">
            <div className="flex items-center gap-2 border-b border-[#1e293b] pb-3 mb-6">
              <ClipboardList className="text-slate-400 w-5 h-5" />
              <h2 className="text-lg font-bold text-white tracking-wide uppercase">Saved Scenarios ({savedScenarios.length})</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedScenarios.map((sc) => (
                <div 
                  key={sc.id} 
                  className="glass-panel p-5 rounded-lg flex items-center justify-between transition-all hover:bg-slate-900/40"
                >
                  <div 
                    onClick={() => handleLoadScenario(sc)}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-bold text-white hover:text-emerald-400 transition-colors">{sc.name}</div>
                    <div className="text-xs text-slate-500 mt-1">Saved: {sc.timestamp}</div>
                    <div className="flex gap-4 mt-3 text-xs text-slate-400">
                      <div>Budget: <span className="text-slate-200">KES {sc.budget_kes/1000000}M</span></div>
                      <div>Stations: <span className="text-slate-200">{sc.num_stations}</span></div>
                      <div>IRR: <span className="text-emerald-400 font-bold">{sc.irr}%</span></div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => deleteScenario(sc.id)}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-md hover:bg-red-500/10 cursor-pointer"
                    title="Delete Scenario"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#1e293b] py-6 text-center text-slate-500 text-xs">
        &copy; {new Date().getFullYear()} VoltReturn AI Decision Intelligence Systems. Prepared for Board & Investment Committee Consultation.
      </div>
    </div>
  );
};
export default LandingView;
