'use client';

import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';

// Views
import LandingView from '../components/views/LandingView';
import DashboardView from '../components/views/DashboardView';
import GisWorkspaceView from '../components/views/GisWorkspaceView';
import FinancialView from '../components/views/FinancialView';
import CompareScenariosView from '../components/views/CompareScenariosView';
import BoardMemoView from '../components/views/BoardMemoView';
import AiAdvisorView from '../components/views/AiAdvisorView';
import OptimizationView from '../components/views/OptimizationView';
import CarbonView from '../components/views/CarbonView';

// Icons
import { 
  LayoutDashboard, 
  Settings, 
  Map, 
  Compass, 
  TrendingUp, 
  Leaf, 
  Brain, 
  Columns, 
  FileText, 
  LogOut,
  Maximize2,
  Minimize2,
  Sparkles,
  ClipboardList
} from 'lucide-react';

export default function Home() {
  const { 
    activeView, 
    setView, 
    isBoardMode, 
    toggleBoardMode, 
    runSimulation,
    budget_kes,
    num_stations
  } = useStore();

  // Run initial simulation query on first page load
  useEffect(() => {
    runSimulation();
  }, []);

  // Return landing page view directly if activeView is 'landing'
  if (activeView === 'landing') {
    return <LandingView />;
  }

  // Sidebar navigations mapping
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'scenarios', name: 'Scenario Builder', icon: ClipboardList },
    { id: 'gis', name: 'GIS Workspace', icon: Map },
    { id: 'optimization', name: 'Optimization Engine', icon: Compass },
    { id: 'financials', name: 'Financial Analysis', icon: TrendingUp },
    { id: 'carbon', name: 'Carbon Analytics', icon: Leaf },
    { id: 'ai', name: 'AI Advisor', icon: Brain },
    { id: 'compare', name: 'Compare Scenarios', icon: Columns },
    { id: 'memo', name: 'Board Memo', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-[#060813] text-slate-100 flex overflow-hidden select-none font-sans">
      
      {/* 1. ENTERPRISE SIDEBAR NAVIGATION (Hidden in Board Mode) */}
      {!isBoardMode && (
        <aside className="w-64 bg-[#0b0f19] border-r border-[#1e293b] flex flex-col justify-between shrink-0 z-20">
          <div>
            {/* Brand Logo Header */}
            <div className="p-6 border-b border-[#1e293b] flex items-center justify-center gap-3">
              <img 
                src="/icon-transparent.png" 
                alt="Logo" 
                className="w-10 h-10 object-contain filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)]" 
              />
              <span className="text-white font-extrabold text-lg tracking-wider">VoltReturn</span>
            </div>

            {/* Nav list */}
            <nav className="p-4 flex flex-col gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id || (item.id === 'scenarios' && activeView === 'dashboard');
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id as any)}
                    className={`w-full py-2.5 px-4 rounded text-sm font-semibold tracking-wide flex items-center gap-3 transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-emerald-500 text-[#060813] shadow-[0_2px_10px_rgba(16,185,129,0.2)]' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Exit Workspace Button */}
          <div className="p-4 border-t border-[#1e293b]">
            <button
              onClick={() => setView('landing')}
              className="w-full py-2.5 px-4 bg-slate-950/40 border border-[#1e293b] hover:border-red-500/50 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Exit Platform
            </button>
          </div>
        </aside>
      )}

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Header Nav */}
        <header className="h-16 bg-[#0b0f19] border-b border-[#1e293b] px-6 flex justify-between items-center z-10 select-none shrink-0">
          <div className="flex items-center gap-4">
            {isBoardMode && (
              <img 
                src="/icon-transparent.png" 
                alt="Logo" 
                className="w-8 h-8 object-contain filter drop-shadow-[0_2px_8px_rgba(16,185,129,0.35)]" 
              />
            )}
            <h2 className="text-sm font-bold text-white tracking-wide uppercase">
              {isBoardMode ? 'VoltReturn AI Platform' : `Scenario: KES ${budget_kes/1000000}M / ${num_stations} BSS`}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Global Confidence Level */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-xs font-semibold select-none">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              Decision Index: 91% Confidence
            </div>

            {/* Toggle Presentation Mode */}
            <button
              onClick={toggleBoardMode}
              className="p-2 border border-[#1e293b] text-slate-400 hover:text-white rounded hover:bg-slate-900/40 cursor-pointer transition-all flex items-center gap-2 text-xs font-semibold"
              title={isBoardMode ? "Exit Presentation Mode" : "Board Presentation Mode"}
            >
              {isBoardMode ? (
                <>
                  <Minimize2 className="w-4 h-4 text-emerald-400" />
                  <span>Exit Presentation</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-emerald-400" />
                  <span>Presentation Mode</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* View Switcher Container */}
        <div className="flex-1 overflow-y-auto bg-[#060813] relative select-none">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'scenarios' && <DashboardView />} {/* Scenario Config uses Dashboard slider panel */}
          {activeView === 'gis' && <GisWorkspaceView />}
          {activeView === 'optimization' && <OptimizationView />}
          {activeView === 'financials' && <FinancialView />}
          {activeView === 'carbon' && <CarbonView />}
          {activeView === 'ai' && <AiAdvisorView />}
          {activeView === 'compare' && <CompareScenariosView />}
          {activeView === 'memo' && <BoardMemoView />}
        </div>
      </main>
    </div>
  );
}
