'use client';

import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Layers, 
  CloudRain, 
  Wind, 
  Car, 
  AlertTriangle, 
  BarChart3, 
  Settings,
  RefreshCw
} from 'lucide-react';

import { GeoEvent, TrafficSummary } from '@/types';

interface HeaderProps {
  activeModule: string;
  setActiveModule: (mod: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  totalEventsCount: number;
  trafficSummary?: TrafficSummary | null;
  onOpenAdmin: () => void;
  onOpenAnalytics: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeModule,
  setActiveModule,
  onRefresh,
  isLoading,
  totalEventsCount,
  trafficSummary,
  onOpenAdmin,
  onOpenAnalytics,
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pl-PL', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'all', label: 'Wszystko', icon: Layers },
    { id: 'roads', label: 'Drogi & Radary', icon: Car },
    { id: 'weather', label: 'Pogoda IMGW', icon: CloudRain },
    { id: 'environment', label: 'Jakość Powietrza', icon: Wind },
    { id: 'hydrology', label: 'Hydrologia IMGW', icon: Activity },
    { id: 'alerts', label: 'Zagrożenia & Wnioski', icon: AlertTriangle },
  ];

  return (
    <header className="h-14 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md px-4 flex items-center justify-between z-20 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
          <Activity className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
            GeoData Hub
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
              v3.0 Edge
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 hidden sm:block">Krajowy System Informacji Przestrzennej</p>
        </div>
      </div>

      {/* Module Selector */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-sky-500 text-slate-950 shadow-sm font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* System Status & Tools */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenAnalytics}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700/60 text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          title="Otwórz panel analiz i wykresów"
        >
          <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Analityka</span>
        </button>

        <button
          onClick={onOpenAdmin}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700/60 text-xs text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          title="Diagnostyka adapterów danych"
        >
          <Settings className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Źródła API</span>
        </button>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            title="Odśwież dane z serwera"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
          
          <div className="text-right hidden sm:block">
            <div className="text-[11px] font-mono text-emerald-400 font-medium">{time}</div>
            <div className="text-[9px] text-slate-500 font-mono">{totalEventsCount} obiektów</div>
          </div>
        </div>
      </div>
    </header>
  );
};

