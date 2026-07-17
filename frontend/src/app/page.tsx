'use client';

import React, { useEffect, useState } from 'react';
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
  ClipboardList,
  Menu,
  X
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleNavClick = (viewId: any) => {
    setView(viewId);
    setMobileMenuOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col justify-between h-full w-full bg-[#eae4d5]">
      <div>
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-[#d8d2c4] flex items-center gap-3">
          <img 
            src="/icon-transparent.png" 
            alt="Logo" 
            className="w-8 h-8 object-contain" 
          />
          <span className="text-slate-900 font-extrabold text-lg tracking-wider">VoltReturn</span>
        </div>

        {/* Nav list */}
        <nav className="p-4 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id || (item.id === 'scenarios' && activeView === 'dashboard');
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id as any)}
                className={`w-full py-2.5 px-4 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-3 transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-[#15803d] text-white font-bold' 
                    : 'text-[#5c564c] hover:text-slate-900 hover:bg-[#dfd9cc]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Exit Workspace Button */}
      <div className="p-4 border-t border-[#d8d2c4]">
        <button
          onClick={() => handleNavClick('landing')}
          className="w-full py-2.5 px-4 bg-[#f0ebe0] border border-[#d8d2c4] hover:border-red-600 hover:bg-red-50 text-[#5c564c] hover:text-red-600 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Exit Platform
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3ebd9] text-[#111111] flex overflow-hidden select-none font-sans relative">
      
      {/* 1. DESKTOP SIDEBAR NAVIGATION (Hidden in Board Mode or Mobile) */}
      {!isBoardMode && (
        <aside className="hidden lg:flex w-64 bg-[#eae4d5] border-r border-[#d8d2c4] flex-col shrink-0 z-20">
          <SidebarContent />
        </aside>
      )}

      {/* 2. MOBILE DRAWER OVERLAY SIDEBAR */}
      {mobileMenuOpen && !isBoardMode && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-950/60 backdrop-blur-xs">
          <div className="w-64 h-full relative shrink-0">
            <SidebarContent />
            {/* Close button inside drawer */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-[-48px] p-2 bg-[#eae4d5] border border-[#d8d2c4] text-[#5c564c] hover:text-[#111111] rounded cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Backdrop click to close */}
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* 3. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Top Header Nav */}
        <header className="h-16 bg-white border-b border-[#d8d2c4] px-4 md:px-6 flex justify-between items-center z-10 select-none shrink-0">
          <div className="flex items-center gap-3">
            
            {/* Mobile hamburger menu toggle */}
            {!isBoardMode && (
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-[#5c564c] hover:text-slate-950 border border-[#d8d2c4] rounded hover:bg-[#eae4d5]/50 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {isBoardMode && (
              <img 
                src="/icon-transparent.png" 
                alt="Logo" 
                className="w-7 h-7 object-contain" 
              />
            )}
            
            <h2 className="text-xs md:text-sm font-bold text-slate-950 tracking-wide uppercase truncate max-w-[150px] md:max-w-none">
              {isBoardMode ? 'VoltReturn AI Platform' : `Scenario: KES ${budget_kes/1000000}M / ${num_stations} BSS`}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            
            {/* Global Confidence Level */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded text-xs font-semibold select-none">
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              Decision Index: 91% Confidence
            </div>

            {/* Toggle Presentation Mode */}
            <button
              onClick={toggleBoardMode}
              className="p-2 border border-[#d8d2c4] text-[#5c564c] hover:text-slate-950 rounded hover:bg-[#eae4d5]/50 cursor-pointer transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
              title={isBoardMode ? "Exit Presentation Mode" : "Board Presentation Mode"}
            >
              {isBoardMode ? (
                <>
                  <Minimize2 className="w-4 h-4 text-emerald-700" />
                  <span className="hidden sm:inline">Exit Presentation</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4 text-emerald-700" />
                  <span className="hidden sm:inline">Presentation</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* View Switcher Container */}
        <div className="flex-1 overflow-y-auto bg-[#f3ebd9] relative select-none">
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
