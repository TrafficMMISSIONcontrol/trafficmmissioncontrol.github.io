'use client';

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  ShieldAlert, 
  Camera, 
  CloudSun, 
  Wind, 
  Car,
  ChevronRight,
  Eye,
  EyeOff,
  Activity
} from 'lucide-react';
import { GeoEvent, TrafficSummary } from '@/types';
import { InferredThreat } from '@/lib/analytics/correlation';
import { isPointInPoland } from '@/lib/geo/polandBorder';

interface SidebarProps {
  events: GeoEvent[];
  inferredThreats: InferredThreat[];
  trafficSummary?: TrafficSummary | null;
  selectedLayers: {
    roads: boolean;
    traffic: boolean;
    weather: boolean;
    environment: boolean;
    hydrology: boolean;
    threats: boolean;
  };
  toggleLayer: (layer: 'roads' | 'traffic' | 'weather' | 'environment' | 'hydrology' | 'threats') => void;
  onSelectEvent: (event: GeoEvent) => void;
  onSearchSelect: (lat: number, lon: number, title: string) => void;
  onGeolocate: () => void;
  onlyPoland: boolean;
  setOnlyPoland: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  events,
  inferredThreats,
  trafficSummary,
  selectedLayers,
  toggleLayer,
  onSelectEvent,
  onSearchSelect,
  onGeolocate,
  onlyPoland,
  setOnlyPoland,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filtrowanie zdarzeń do listy
  const filteredEvents = events.filter((e) => {
    if (onlyPoland && !isPointInPoland(e.latitude, e.longitude)) {
      return false;
    }
    if (!selectedLayers[e.category as keyof typeof selectedLayers] && e.category !== 'alerts') {
      return false;
    }
    if (severityFilter !== 'all' && e.severity !== severityFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = e.title.toLowerCase().includes(q);
      const matchDesc = e.description?.toLowerCase().includes(q);
      const matchRoad = e.metadata?.road?.toLowerCase()?.includes(q);
      return matchTitle || matchDesc || matchRoad;
    }
    return true;
  });

  return (
    <aside 
      className={`relative z-10 flex flex-col bg-slate-950/95 border-r border-slate-800/80 backdrop-blur transition-all duration-300 ${
        isCollapsed ? 'w-12' : 'w-80 md:w-96'
      } h-full`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 z-20 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white"
        title={isCollapsed ? 'Rozwiń panel' : 'Zwiń panel'}
      >
        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>

      {isCollapsed ? (
        <div className="flex flex-col items-center py-6 gap-6 text-slate-400">
          <Car className="w-5 h-5 text-emerald-400" />
          <Camera className="w-5 h-5" />
          <CloudSun className="w-5 h-5" />
          <Wind className="w-5 h-5" />
          <ShieldAlert className="w-5 h-5 text-amber-400" />
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Search bar & GPS button */}
          <div className="p-3 border-b border-slate-800/80 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Szukaj miasta, stacji, drogi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />
            </div>
            <button
              onClick={onGeolocate}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-sky-400 hover:border-sky-500 transition-colors"
              title="Znajdź moją lokalizację"
            >
              <MapPin className="w-4 h-4" />
            </button>
          </div>

          {/* Layer toggles */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/30">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Filter className="w-3 h-3 text-sky-400" />
                Warstwy przestrzenne
              </span>
              <button
                onClick={() => setOnlyPoland(!onlyPoland)}
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                  onlyPoland
                    ? 'bg-sky-950 text-sky-300 border-sky-800 font-semibold'
                    : 'bg-slate-850 text-slate-400 border-slate-700'
                }`}
                title="Przełącz filtr terytorialny Polski"
              >
                {onlyPoland ? '🇵🇱 Tylko Polska' : '🌍 Europa'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {/* Natężenie ruchu */}
              <button
                onClick={() => toggleLayer('traffic')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs border transition-colors ${
                  selectedLayers.traffic
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-emerald-400" />
                  Ruch i Tranzyt
                </span>
                {selectedLayers.traffic ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 opacity-40" />}
              </button>

              {/* Radary & OPP */}
              <button
                onClick={() => toggleLayer('roads')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs border transition-colors ${
                  selectedLayers.roads
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300 font-medium'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-400" />
                  Radary & Roboty
                </span>
                {selectedLayers.roads ? <Eye className="w-3 h-3 text-indigo-400" /> : <EyeOff className="w-3 h-3 opacity-40" />}
              </button>

              {/* Meteo IMGW */}
              <button
                onClick={() => toggleLayer('weather')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs border transition-colors ${
                  selectedLayers.weather
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-medium'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5 text-amber-400" />
                  Meteo IMGW
                </span>
                {selectedLayers.weather ? <Eye className="w-3 h-3 text-amber-400" /> : <EyeOff className="w-3 h-3 opacity-40" />}
              </button>

              {/* Jakość powietrza GIOŚ */}
              <button
                onClick={() => toggleLayer('environment')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs border transition-colors ${
                  selectedLayers.environment
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-emerald-400" />
                  Powietrze GIOŚ
                </span>
                {selectedLayers.environment ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3 opacity-40" />}
              </button>

              {/* Hydrologia IMGW */}
              <button
                onClick={() => toggleLayer('hydrology')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs border transition-colors ${
                  selectedLayers.hydrology
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 font-medium'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-cyan-400 text-xs">🌊</span>
                  Rzeki IMGW
                </span>
                {selectedLayers.hydrology ? <Eye className="w-3 h-3 text-sky-400" /> : <EyeOff className="w-3 h-3 opacity-40" />}
              </button>

              {/* Wnioski & Zagrożenia */}
              <button
                onClick={() => toggleLayer('threats')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs border transition-colors ${
                  selectedLayers.threats
                    ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 font-medium'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  Zagrożenia AI
                </span>
                {selectedLayers.threats ? <Eye className="w-3 h-3 text-rose-400" /> : <EyeOff className="w-3 h-3 opacity-40" />}
              </button>
            </div>

            {/* Live Traffic Quick KPI */}
            {trafficSummary && selectedLayers.traffic && (
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1 text-slate-400">
                  <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                  Płynność sieci: <strong className="text-emerald-400">{trafficSummary.fluidPercent}%</strong>
                </span>
                <span className="text-slate-400">
                  Śr. <strong className="text-white">{trafficSummary.avgSpeedKmh} km/h</strong>
                </span>
                <span className="text-rose-400 font-medium">
                  {trafficSummary.jamCount + trafficSummary.blockedCount} zatorów
                </span>
              </div>
            )}
          </div>

          {/* Inferred threats banner */}
          {selectedLayers.threats && inferredThreats.length > 0 && (
            <div className="p-3 border-b border-slate-800/80 bg-amber-950/20">
              <div className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Wykryte zagrożenia ({inferredThreats.length})
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-300 border border-amber-800">
                  Korelacje
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {inferredThreats.map((threat) => (
                  <div
                    key={threat.id}
                    onClick={() => onSearchSelect(threat.latitude, threat.longitude, threat.title)}
                    className="p-2 rounded bg-slate-900/80 border border-amber-800/40 hover:border-amber-500/60 cursor-pointer transition-colors"
                  >
                    <div className="text-xs font-medium text-amber-200">{threat.title}</div>
                    <div className="text-[10px] text-slate-300 mt-0.5 leading-snug">{threat.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Events list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Obiekty na mapie ({filteredEvents.length})
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  onClick={() => setSeverityFilter('all')}
                  className={`px-1.5 py-0.5 rounded ${
                    severityFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400'
                  }`}
                >
                  Wszystkie
                </button>
                <button
                  onClick={() => setSeverityFilter('high')}
                  className={`px-1.5 py-0.5 rounded ${
                    severityFilter === 'high' ? 'bg-rose-900/60 text-rose-300' : 'text-slate-400'
                  }`}
                >
                  Wysokie
                </button>
              </div>
            </div>

            {filteredEvents.slice(0, 100).map((event) => (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-200 line-clamp-1">{event.title}</div>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 uppercase ${
                      event.category === 'roads'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        : event.category === 'weather'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : event.category === 'hydrology'
                        ? 'bg-sky-950 text-sky-300 border border-sky-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {event.category}
                  </span>
                </div>
                {event.description && (
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{event.description}</p>
                )}
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 text-slate-400" />
                    {event.latitude.toFixed(3)}, {event.longitude.toFixed(3)}
                  </span>
                  <span>{new Date(event.observedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Legend footer with Traffic status and Icons */}
          <div className="p-2.5 border-t border-slate-800/80 bg-slate-900/50 text-[10px] text-slate-400 flex flex-col gap-1.5">
            {/* Natężenie ruchu legenda */}
            <div className="flex items-center justify-between text-[9px] text-slate-300 border-b border-slate-800/60 pb-1.5">
              <span className="font-semibold text-slate-400">RUCH:</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Płynny</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Gęsty</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Korek</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-900"></span> Blokada</span>
            </div>

            {/* Ikony warstw */}
            <div className="flex items-center justify-around flex-wrap gap-1 text-[9px]">
              <div className="flex items-center gap-0.5">📸 Radary/OPP</div>
              <div className="flex items-center gap-0.5">🚧 Roboty</div>
              <div className="flex items-center gap-0.5">⛅ IMGW</div>
              <div className="flex items-center gap-0.5">🍃 GIOŚ</div>
              <div className="flex items-center gap-0.5">🌊 Rzeki</div>
              <div className="flex items-center gap-0.5">⚠️ Zagrożenia</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
