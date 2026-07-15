import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Define the interface for a saved Scenario
export interface SavedScenario {
  id: string;
  name: string;
  timestamp: string;
  // Sliders
  budget_kes: number;
  num_stations: number;
  horizon_years: number;
  risk_appetite: 'low' | 'medium' | 'high';
  tariff_type: 'peak' | 'mixed' | 'off-peak';
  default_rate_pct: number;
  // Cached outcomes
  irr: number;
  npv: number;
  coverage: number;
  default_reduction: number;
  carbon_offset: number;
  payback: number;
  fleet_size: number;
}

// Define the interface for GIS proposed station coordinates
export interface RecommendedStation {
  latitude: number;
  longitude: number;
  subcounty: string;
  rider_demand_score: number;
  grid_stability_score: number;
  overall_viability_score: number;
  distance_to_existing_km: number;
}

// Define the main VoltReturn state interface
interface VoltReturnState {
  // Navigation & UI States
  activeView: 'landing' | 'dashboard' | 'scenarios' | 'gis' | 'optimization' | 'financials' | 'carbon' | 'ai' | 'compare' | 'memo' | 'settings';
  isBoardMode: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Active Scenario Sliders
  budget_kes: number;
  num_stations: number;
  horizon_years: number;
  risk_appetite: 'low' | 'medium' | 'high';
  tariff_type: 'peak' | 'mixed' | 'off-peak';
  default_rate_pct: number;
  
  // Simulation results
  simulationData: any | null;
  gisData: RecommendedStation[];
  fleetSummary: any | null;
  portfolioSummary: any | null;
  
  // Saved scenarios (persisted)
  savedScenarios: SavedScenario[];
  
  // AI assistant states
  aiConversation: { role: 'user' | 'assistant'; content: string }[];
  aiLoading: boolean;
  
  // Actions
  setView: (view: VoltReturnState['activeView']) => void;
  toggleBoardMode: () => void;
  setSlider: (key: 'budget_kes' | 'num_stations' | 'horizon_years' | 'default_rate_pct', value: number) => void;
  setToggle: (key: 'risk_appetite' | 'tariff_type', value: any) => void;
  
  // Fetch actions
  runSimulation: () => Promise<void>;
  askAssistant: (prompt: string) => Promise<void>;
  clearAiChat: () => void;
  
  // Scenario actions
  saveScenario: (name: string) => void;
  deleteScenario: (id: string) => void;
}

const BACKEND_URL = 'http://127.0.0.1:8000';

let currentRequestVersion = 0;
let debounceTimer: NodeJS.Timeout | null = null;
const debouncedRunSimulation = (get: any) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    get().runSimulation();
  }, 250);
};

export const useStore = create<VoltReturnState>()(
  persist(
    (set, get) => ({
      // Navigation
      activeView: 'landing',
      isBoardMode: false,
      isLoading: false,
      error: null,
      
      // Sliders defaults
      budget_kes: 100000000,
      num_stations: 12,
      horizon_years: 5,
      risk_appetite: 'medium',
      tariff_type: 'mixed',
      default_rate_pct: 4.90,
      
      // Data Cache
      simulationData: null,
      gisData: [],
      fleetSummary: null,
      portfolioSummary: null,
      
      // Persisted scenarios list
      savedScenarios: [],
      
      // AI Chat
      aiConversation: [
        { role: 'assistant', content: 'Welcome to VoltReturn Executive Decision Console. I am your RAG-grounded strategist. Adjust investment parameters or ask spatial allocation and cash flow questions, and I will analyze the metrics for you.' }
      ],
      aiLoading: false,
      
      // Simple Setters
      setView: (view) => set({ activeView: view }),
      toggleBoardMode: () => set((state) => ({ isBoardMode: !state.isBoardMode })),
      
      setSlider: (key, value) => {
        set({ [key]: value } as any);
        debouncedRunSimulation(get);
      },
      
      setToggle: (key, value) => {
        set({ [key]: value } as any);
        debouncedRunSimulation(get);
      },
      
      // Runs complete analytical integration
      runSimulation: async () => {
        currentRequestVersion += 1;
        const thisVersion = currentRequestVersion;
        
        set({ isLoading: true, error: null });
        const { budget_kes, num_stations, horizon_years, risk_appetite, tariff_type, default_rate_pct } = get();
        
        try {
          // 1. Fetch DCF financial simulation
          const simRes = await fetch(
            `${BACKEND_URL}/api/v1/finance/simulate?budget_kes=${budget_kes}&num_stations=${num_stations}&horizon_years=${horizon_years}&risk_appetite=${risk_appetite}&tariff_type=${tariff_type}&default_rate_pct=${default_rate_pct}`
          );
          if (!simRes.ok) throw new Error('Failed to run DCF simulation');
          const simData = await simRes.json();
          
          if (thisVersion !== currentRequestVersion) return;

          // 2. Fetch K-Means GIS recommendations
          const gisRes = await fetch(
            `${BACKEND_URL}/api/v1/infrastructure/recommend?num_stations=${num_stations}&gap_threshold_km=5.0`
          );
          if (!gisRes.ok) throw new Error('Failed to retrieve GIS recommendations');
          const gisData = await gisRes.json();
          
          if (thisVersion !== currentRequestVersion) return;

          // 3. Fetch Fleet degradation survival summary
          const fleetRes = await fetch(`${BACKEND_URL}/api/v1/fleet/summary`);
          const fleetSummary = fleetRes.ok ? await fleetRes.json() : null;
          
          if (thisVersion !== currentRequestVersion) return;

          // 4. Fetch Portfolio default and churn summary
          const portRes = await fetch(`${BACKEND_URL}/api/v1/rider/portfolio-summary`);
          const portfolioSummary = portRes.ok ? await portRes.json() : null;
          
          if (thisVersion !== currentRequestVersion) return;

          set({
            simulationData: simData,
            gisData: gisData,
            fleetSummary: fleetSummary,
            portfolioSummary: portfolioSummary,
            isLoading: false
          });
        } catch (e: any) {
          if (thisVersion === currentRequestVersion) {
            set({ error: e.message || 'Server connection failed', isLoading: false });
          }
        }
      },
      
      // AI RAG Strategy consultation
      askAssistant: async (prompt) => {
        set({ aiLoading: true });
        
        // Append user prompt to state
        set((state) => ({
          aiConversation: [...state.aiConversation, { role: 'user', content: prompt }]
        }));
        
        try {
          const res = await fetch(`${BACKEND_URL}/api/v1/assistant/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: prompt })
          });
          
          if (!res.ok) throw new Error('Assistant failed to respond');
          const data = await res.json();
          
          set((state) => ({
            aiConversation: [...state.aiConversation, { role: 'assistant', content: data.answer }],
            aiLoading: false
          }));
        } catch (e: any) {
          set((state) => ({
            aiConversation: [...state.aiConversation, { role: 'assistant', content: 'Connection timed out. Please ensure the analytical server is active.' }],
            aiLoading: false
          }));
        }
      },
      
      clearAiChat: () => set({
        aiConversation: [
          { role: 'assistant', content: 'Welcome to VoltReturn Executive Decision Console. I am your RAG-grounded strategist. Adjust investment parameters or ask spatial allocation and cash flow questions, and I will analyze the metrics for you.' }
        ]
      }),
      
      // Saved scenarios manager
      saveScenario: (name) => {
        const { budget_kes, num_stations, horizon_years, risk_appetite, tariff_type, default_rate_pct, simulationData, portfolioSummary } = get();
        
        const newScenario: SavedScenario = {
          id: Math.random().toString(36).substr(2, 9),
          name: name || `Scenario: KES ${budget_kes / 1000000}M`,
          timestamp: new Date().toLocaleString(),
          budget_kes,
          num_stations,
          horizon_years,
          risk_appetite,
          tariff_type,
          default_rate_pct,
          irr: simulationData?.expected_irr_pct || 0,
          npv: simulationData?.expected_npv_kes || 0,
          coverage: portfolioSummary?.default_exposure_reduction_pct || 0,
          default_reduction: portfolioSummary?.expected_default_rate_pct || 0,
          carbon_offset: simulationData?.carbon_offset_tco2 || 0,
          payback: simulationData?.payback_period_years || 0,
          fleet_size: simulationData?.fleet_size || 0
        };
        
        set((state) => ({
          savedScenarios: [...state.savedScenarios, newScenario]
        }));
      },
      
      deleteScenario: (id) => set((state) => ({
        savedScenarios: state.savedScenarios.filter((s) => s.id !== id)
      }))
    }),
    {
      name: 'voltreturn-scenarios-store', // LocalStorage item name
      partialize: (state) => ({ savedScenarios: state.savedScenarios }), // Only persist savedScenarios
    }
  )
);
