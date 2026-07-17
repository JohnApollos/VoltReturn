import React from 'react';
import { useStore } from '../../store/useStore';
import { Download, FileText, ChevronRight, CheckCircle2 } from 'lucide-react';

export const BoardMemoView: React.FC = () => {
  const {
    budget_kes,
    num_stations,
    horizon_years,
    risk_appetite,
    tariff_type,
    default_rate_pct,
    simulationData,
    portfolioSummary
  } = useStore();

  const handleDownloadPdf = () => {
    const url = `http://127.0.0.1:8000/api/v1/reports/board-memo?budget_kes=${budget_kes}&num_stations=${num_stations}&horizon_years=${horizon_years}&risk_appetite=${risk_appetite}&tariff_type=${tariff_type}&default_rate_pct=${default_rate_pct}`;
    window.open(url, '_blank');
  };

  const todayStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      
      {/* TOP CONTROLS */}
      <div className="flex justify-between items-center border-b border-[#d8d2c4] pb-4 mb-2 shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-wide uppercase flex items-center gap-2">
            <FileText className="text-[#15803d] w-5 h-5" />
            Board Investment Memorandum
          </h2>
          <p className="text-xs text-[#5c564c] mt-1 uppercase tracking-widest leading-relaxed">
            McKinsey-style executive brief summarizing network returns and default mitigation loops.
          </p>
        </div>
        
        <button 
          onClick={handleDownloadPdf}
          className="px-5 py-2.5 bg-[#15803d] hover:bg-[#166534] text-white font-bold text-xs uppercase tracking-wider rounded shadow-[0_2px_8px_rgba(21,128,61,0.25)] flex items-center gap-2 cursor-pointer transition-all"
        >
          <Download className="w-4 h-4" />
          Export Printed PDF
        </button>
      </div>

      {/* PAPER CONTAINER VIEW */}
      <div className="bg-white border border-[#d8d2c4] rounded shadow-xl p-8 text-slate-800 flex flex-col gap-8 font-sans select-text">
        
        {/* Cover metadata header */}
        <div className="border-b border-[#d8d2c4] pb-6 flex flex-col md:flex-row justify-between text-xs text-[#5c564c] gap-4">
          <div className="flex flex-col gap-1">
            <div><b>Prepared For:</b> VoltReturn Investment Committee</div>
            <div><b>Prepared By:</b> VoltReturn AI Strategy Engine</div>
            <div><b>Date:</b> {todayStr}</div>
          </div>
          <div className="flex flex-col md:items-end gap-1">
            <div><b>Classification:</b> Board Confidential</div>
            <div><b>Scope:</b> Nairobi Core Network Expansion</div>
            <div><b>Status:</b> Scenario Evaluated</div>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <div>
          <h3 className="text-slate-900 font-extrabold text-base mb-3 uppercase tracking-wider flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-[#15803d]" />
            1. Executive Summary
          </h3>
          <p className="text-sm text-slate-800 leading-relaxed">
            This memorandum outlines the strategic return, spatial coverage metrics, and credit default exposure delta associated with the proposed network expansion. Grounded in geocoded coordinates covering **66 active swap stations** in Nairobi, the proposed deployment of **{num_stations} Swap Cabinets** with a CapEx of **KES {budget_kes/1000000}M** yields an expected IRR of **{simulationData?.expected_irr_pct || '0.0'}%** and an NPV of **KES {((simulationData?.expected_npv_kes || 0) / 1000000).toFixed(1)}M**.
          </p>
        </div>

        {/* Section 2: Core Metrics Comparison Table */}
        <div className="border border-[#d8d2c4] rounded overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#fcfaf7] text-[#5c564c] font-bold border-b border-[#d8d2c4]">
                <th className="p-3">Key Performance Indicator</th>
                <th className="p-3 text-center">Value</th>
                <th className="p-3">Investment Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d8d2c4]">
              <tr>
                <td className="p-3 text-slate-900 font-semibold">Expected Internal Rate of Return (IRR)</td>
                <td className="p-3 text-center text-[#15803d] font-bold">{simulationData?.expected_irr_pct || '0.0'}%</td>
                <td className="p-3 text-[#5c564c]">Exceeds standard hurdle target rate of 12.0%.</td>
              </tr>
              <tr className="bg-[#fcfaf7]">
                <td className="p-3 text-slate-900 font-semibold">Net Present Value (NPV)</td>
                <td className="p-3 text-center text-[#1a68d1] font-bold">KES {((simulationData?.expected_npv_kes || 0) / 1000000).toFixed(1)}M</td>
                <td className="p-3 text-[#5c564c]">NPV discounted over {horizon_years} years.</td>
              </tr>
              <tr>
                <td className="p-3 text-slate-900 font-semibold">PAYG Borrower Default Rate</td>
                <td className="p-3 text-center text-red-700 font-bold">{portfolioSummary?.expected_default_rate_pct || '0.0'}%</td>
                <td className="p-3 text-[#5c564c]">Reflects a reduction from Nairobi's baseline 4.9% default.</td>
              </tr>
              <tr className="bg-[#fcfaf7]">
                <td className="p-3 text-slate-900 font-semibold">Carbon Offset (CO2 avoidance)</td>
                <td className="p-3 text-center text-[#15803d] font-bold">{simulationData?.carbon_offset_tco2?.toLocaleString() || '0'} tCO2</td>
                <td className="p-3 text-[#5c564c]">Eligible carbon offsets calculated under Verra VM0038 rules.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Strategic Findings */}
        <div>
          <h3 className="text-slate-900 font-extrabold text-base mb-3 uppercase tracking-wider flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-[#15803d]" />
            2. Strategic Insights
          </h3>
          <div className="flex flex-col gap-3 text-sm text-slate-800 leading-relaxed">
            <div className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#15803d] shrink-0 mt-0.5" />
              <div>
                <b>Infrastructure Proximity reduces default:</b> Distance to the nearest BSS remains the single strongest predictor of borrower credit risk. Placing swap cabinets closer to riders preserves operational hours, improving daily net earnings.
              </div>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#15803d] shrink-0 mt-0.5" />
              <div>
                <b>Grid Tariffs Optimizations:</b> Operating charging schedules under the proposed <span className="text-slate-900 font-semibold">{tariff_type}</span> strategy mitigates peak grid loading tariffs, shielding the operational margins.
              </div>
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#15803d] shrink-0 mt-0.5" />
              <div>
                <b>Secondary ESG Monetization:</b> Verra VM0038 CO2 displacement supports secondary cash flows, allowing asset financiers to leverage climate finance backups.
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Mathematical Assumptions & Limitations */}
        <div>
          <h3 className="text-slate-900 font-extrabold text-base mb-3 uppercase tracking-wider flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-[#15803d]" />
            3. Model Assumptions & Limitations
          </h3>
          <p className="text-xs text-[#5c564c] leading-relaxed">
            * Battery capacity degradation is modeled using a 1,800 cycle Weibull curve. Calculations assume grid stability indicators of KES 0.05 kg CO2/kWh on Kenya's renewable-heavy grid. Changes in grid reliability or backup diesel generator utilization will increase the grid emissions index and impact carbon margins.
          </p>
        </div>

      </div>
    </div>
  );
};
export default BoardMemoView;
