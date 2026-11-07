'use client';

import React from 'react';
import { X, BarChart3, ShieldAlert } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { GeoEvent, TrafficSummary } from '@/types';
import { InferredThreat } from '@/lib/analytics/correlation';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: GeoEvent[];
  threats: InferredThreat[];
  trafficSummary?: TrafficSummary | null;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  events,
  threats,
  trafficSummary,
}) => {
  if (!isOpen) return null;

  // Podział na kategorie
  const categoryCounts: Record<string, number> = {};
  events.forEach((e) => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  });

  const chartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: {
      orient: 'vertical',
      left: 'left',
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    series: [
      {
        name: 'Obiekty GIS',
        type: 'pie',
        radius: ['45%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#0f172a',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: 'bold', color: '#f8fafc' },
        },
        data: Object.entries(categoryCounts).map(([cat, count]) => {
          let name = 'Inne';
          let color = '#38bdf8';
          if (cat === 'roads') { name = 'Radary & Roboty'; color = '#818cf8'; }
          if (cat === 'weather') { name = 'Pogoda IMGW'; color = '#fbbf24'; }
          if (cat === 'environment') { name = 'Jakość Powietrza'; color = '#34d399'; }
          if (cat === 'hydrology') { name = 'Rzeki IMGW'; color = '#0284c7'; }
          if (cat === 'alerts') { name = 'Ostrzeżenia'; color = '#ef4444'; }
          return { value: count, name, itemStyle: { color } };
        }),
      },
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Centrum Analityki & Inteligencji Danych</h2>
              <p className="text-[11px] text-slate-400">Korelacja wieloźródłowa i monitoring ruchu w czasie rzeczywistym</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">Zintegrowane obiekty</div>
              <div className="text-xl font-bold font-mono text-sky-400 mt-1">{events.length}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">Płynność Ruchu</div>
              <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                {trafficSummary ? `${trafficSummary.fluidPercent}%` : '---'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">Śr. Prędkość Sieci</div>
              <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
                {trafficSummary ? `${trafficSummary.avgSpeedKmh} km/h` : '---'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[11px] text-slate-400">Zagrożenia AI</div>
              <div className="text-xl font-bold font-mono text-amber-400 mt-1">{threats.length}</div>
            </div>
          </div>

          {/* Chart & Threat list */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-xs font-semibold text-slate-300 mb-2">Struktura danych przestrzennych</div>
              <div className="h-48 w-full">
                <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col">
              <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Wnioski analityczne (Korelacje)</span>
                <span className="text-[10px] text-amber-400 font-mono">{threats.length} zdarzeń</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 max-h-48 pr-1 text-xs">
                {threats.length === 0 ? (
                  <div className="text-slate-500 text-center py-8">
                    Brak aktywnych zagrożeń korelacyjnych na podstawie bieżących odczytów.
                  </div>
                ) : (
                  threats.map((t) => (
                    <div key={t.id} className="p-2 rounded bg-slate-900 border border-amber-900/40">
                      <div className="font-semibold text-amber-300 text-[11px] flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        {t.title}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">{t.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>GeoData Hub • Silnik Analityczny & Korelacyjny v3.0</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
