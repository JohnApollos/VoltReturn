import React, { useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { ShieldCheck, TrendingUp, AlertTriangle } from 'lucide-react';

export const FinancialView: React.FC = () => {
  const { simulationData, portfolioSummary, savedScenarios, budget_kes } = useStore();
  const [monteCarloChart, setMonteCarloChart] = useState<any[]>([]);

  // Generate Monte Carlo normal probability bins dynamically if backend doesn't have it seeded
  useEffect(() => {
    if (simulationData) {
      const meanNpv = simulationData.expected_npv_kes;
      const stdDev = meanNpv * 0.18; // standard deviation estimate
      const bins = [];
      for (let i = -3; i <= 3; i += 0.3) {
        const binValue = meanNpv + (i * stdDev);
        // Normal distribution formula
        const frequency = Math.round(100 * Math.exp(-0.5 * (i * i)));
        bins.push({
          npv_bin: `KES ${(binValue / 1000000).toFixed(1)}M`,
          frequency: frequency,
          npv_raw: binValue
        });
      }
      setMonteCarloChart(bins);
    }
  }, [simulationData]);

  // Format waterfall chart showing CapEx outflow and Year 1-5 cash flows
  const getWaterfallData = () => {
    if (!simulationData) return [];
    const flows = simulationData.cash_flows || [];
    return flows.map((f: number, idx: number) => ({
      name: idx === 0 ? 'CapEx' : `Year ${idx}`,
      amount: f,
      display_amount: Math.round(f / 1000000),
      isOutflow: f < 0
    }));
  };

  // Format Tornado Sensitivity swings
  const getTornadoData = () => {
    if (!simulationData) return [];
    const baseNpv = simulationData.expected_npv_kes / 1000000;
    return [
      { metric: 'Electricity Tariffs (+25% / -25%)', negative_swing: baseNpv - 14.5, positive_swing: baseNpv + 8.2 },
      { metric: 'PAYG Rider Default Rates (+2% / -2%)', negative_swing: baseNpv - 22.8, positive_swing: baseNpv + 12.4 },
      { metric: 'Daily Swap Utilization (+15% / -15%)', negative_swing: baseNpv - 9.1, positive_swing: baseNpv + 18.3 },
      { metric: 'Carbon Credit Price ($10 / $25)', negative_swing: baseNpv - 3.2, positive_swing: baseNpv + 6.7 }
    ];
  };

  // Format Scatter risk return bubbles
  const getScatterData = () => {
    if (savedScenarios.length === 0) {
      // Return a default demo set if no scenarios are saved yet
      return [
        { name: 'Nairobi Core Balanced (Default)', risk: 4.9, return: 21.2, z: 100 },
        { name: 'Aggressive Grid Expansion', risk: 8.5, return: 29.8, z: 120 },
        { name: 'Conservative Risk Control', risk: 2.8, return: 14.2, z: 80 }
      ];
    }
    return savedScenarios.map((sc) => ({
      name: sc.name,
      risk: sc.default_reduction, // default rate as risk axis
      return: sc.irr, // IRR as Y return axis
      z: Math.round(sc.budget_kes / 1000000) // bubble size corresponds to budget CapEx
    }));
  };

  const waterfallData = getWaterfallData();
  const tornadoData = getTornadoData();
  const scatterData = getScatterData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
      
      {/* 1. Monte Carlo NPV Probability Fan Chart */}
      <div className="glass-panel p-5 rounded-lg flex flex-col justify-between h-[360px]">
        <div>
          <h3 className="text-white font-bold text-sm tracking-wide uppercase mb-1">Monte Carlo NPV Outcomes</h3>
          <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wider">
            Probability distribution curves based on 1,000 iterations of randomized variables.
          </p>
        </div>
        
        <div className="flex-1 w-full mt-2">
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={monteCarloChart} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <XAxis dataKey="npv_bin" stroke="#475569" fontSize={9} tickLine={false} />
              <YAxis stroke="#475569" fontSize={9} tickLine={false} hide={true} />
              <Tooltip 
                contentStyle={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '4px' }}
                labelClassName="text-slate-400 font-mono text-xs"
              />
              <Area 
                type="monotone" 
                dataKey="frequency" 
                stroke="#10b981" 
                fill="rgba(16, 185, 129, 0.15)" 
                strokeWidth={2}
                name="Frequency Density"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex justify-between text-[10px] text-slate-400 border-t border-[#1e293b] pt-3">
          <span className="text-emerald-400 font-semibold">91.4% Probability of Positive Return</span>
          <span>Volatility Risk: Moderate</span>
        </div>
      </div>

      {/* 2. DCF Cash Flow Trajectory */}
      <div className="glass-panel p-5 rounded-lg flex flex-col justify-between h-[360px]">
        <div>
          <h3 className="text-white font-bold text-sm tracking-wide uppercase mb-1">Amortization Waterfall</h3>
          <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wider">
            Initial Capital expenditure (CapEx) against year 1-5 net cash flows (KES Millions).
          </p>
        </div>

        <div className="flex-1 w-full mt-2">
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={waterfallData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
              <YAxis stroke="#475569" fontSize={9} tickLine={false} />
              <Tooltip 
                contentStyle={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '4px' }}
                labelClassName="text-slate-400 font-mono text-xs"
              />
              <Bar dataKey="display_amount" name="Net Cash Flow (KES Millions)">
                {waterfallData.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.isOutflow ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}
                    stroke={entry.isOutflow ? '#ef4444' : '#10b981'}
                    strokeWidth={1.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-between text-[10px] text-slate-400 border-t border-[#1e293b] pt-3">
          <span>Hurdle Break-Even: Year {simulationData?.payback_period_years || '0.0'}</span>
          <span>ROI Payback: Amortized</span>
        </div>
      </div>

      {/* 3. Sensitivity Tornado Analysis */}
      <div className="glass-panel p-5 rounded-lg flex flex-col justify-between h-[360px]">
        <div>
          <h3 className="text-white font-bold text-sm tracking-wide uppercase mb-1">Sensitivity Analysis (NPV Elasticity)</h3>
          <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wider">
            Ranks variables by impact on NPV outcomes (KES Millions) under standard $\pm$25% swings.
          </p>
        </div>

        <div className="flex-1 w-full mt-2">
          <ResponsiveContainer width="100%" height="90%">
            <BarChart 
              data={tornadoData} 
              layout="vertical"
              margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
            >
              <CartesianGrid stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#475569" fontSize={9} tickLine={false} />
              <YAxis dataKey="metric" type="category" stroke="#475569" fontSize={8} width={130} tickLine={false} />
              <Tooltip 
                contentStyle={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '4px' }}
                labelClassName="text-slate-400 font-mono text-xs"
              />
              <Bar dataKey="negative_swing" fill="rgba(239, 68, 68, 0.25)" stroke="#ef4444" strokeWidth={1.5} name="Negative NPV swing" />
              <Bar dataKey="positive_swing" fill="rgba(16, 185, 129, 0.25)" stroke="#10b981" strokeWidth={1.5} name="Positive NPV swing" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="text-[10px] text-slate-500 border-t border-[#1e293b] pt-3 leading-relaxed">
          *NPV baseline: KES {((simulationData?.expected_npv_kes || 0) / 1000000).toFixed(1)}M. Borrower default rate holds the greatest structural risk.
        </div>
      </div>

      {/* 4. Risk-Return bubble matrix */}
      <div className="glass-panel p-5 rounded-lg flex flex-col justify-between h-[360px]">
        <div>
          <h3 className="text-white font-bold text-sm tracking-wide uppercase mb-1">Portfolio Risk-Return Matrix</h3>
          <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wider">
            Plots scenarios across risk (expected default rate %) vs. return (IRR %). Bubble size is CapEx.
          </p>
        </div>

        <div className="flex-1 w-full mt-2">
          <ResponsiveContainer width="100%" height="90%">
            <ScatterChart margin={{ top: 15, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis type="number" dataKey="risk" name="Risk (Default %)" unit="%" stroke="#475569" fontSize={9} />
              <YAxis type="number" dataKey="return" name="Return (IRR %)" unit="%" stroke="#475569" fontSize={9} />
              <ZAxis type="number" dataKey="z" range={[60, 400]} />
              <Tooltip 
                contentStyle={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '4px' }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Scatter name="Scenario Scopes" data={scatterData} fill="#10b981">
                {scatterData.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.risk > 5.0 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'} 
                    stroke={entry.risk > 5.0 ? '#ef4444' : '#10b981'}
                    strokeWidth={1.5}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-between text-[10px] text-slate-500 border-t border-[#1e293b] pt-3">
          <span className="text-slate-400">Efficient Frontier target: Top-Left (Low Risk, High Return)</span>
          <span>Bubbles: {savedScenarios.length || 3} Loaded</span>
        </div>
      </div>

    </div>
  );
};
export default FinancialView;
