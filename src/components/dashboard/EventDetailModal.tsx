'use client';

import React, { useEffect, useState } from 'react';
import { X, ExternalLink, ShieldCheck, Clock, MapPin, Gauge } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { GeoEvent } from '@/types';

interface EventDetailModalProps {
  event: GeoEvent | null;
  onClose: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({ event, onClose }) => {
  const [giosIndex, setGiosIndex] = useState<any>(null);
  const [isLoadingGios, setIsLoadingGios] = useState(false);

  useEffect(() => {
    if (!event) {
      setGiosIndex(null);
      return;
    }

    if (event.category === 'environment' && event.metadata?.stationId) {
      setIsLoadingGios(true);
      fetch(`/api/gios-index?stationId=${event.metadata.stationId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.data) {
            setGiosIndex(data.data);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingGios(false));
    } else {
      setGiosIndex(null);
    }
  }, [event]);

  if (!event) return null;

  // Przygotowanie wykresu ECharts w zależności od typu
  let chartOption: any = null;

  if (event.category === 'weather' && event.metadata) {
    const { temperature, windSpeed, humidity, precipitation } = event.metadata;
    chartOption = {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 20, bottom: 25, left: 40 },
      xAxis: {
        type: 'category',
        data: ['Temp (°C)', 'Wiatr (m/s)', 'Wilg (%)', 'Opad (mm)'],
        axisLine: { lineStyle: { color: '#64748b' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#64748b' } },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      series: [
        {
          name: 'Pomiary',
          type: 'bar',
          data: [temperature || 0, windSpeed || 0, humidity || 0, precipitation || 0],
          itemStyle: {
            color: '#38bdf8',
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
    };
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-semibold ${
                  event.category === 'roads'
                    ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                    : event.category === 'weather'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {event.category}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                {event.verificationStatus}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-white">{event.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {event.description && (
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300">
              {event.description}
            </div>
          )}

          {/* GIOŚ Index if available */}
          {event.category === 'environment' && (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase mb-2 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                Indeks Jakości Powietrza (GIOŚ PJP)
              </div>
              {isLoadingGios ? (
                <div className="text-slate-500 text-[11px]">Pobieranie bieżącego indeksu stacji...</div>
              ) : giosIndex?.aqIndexLevel ? (
                <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-emerald-900/40">
                  <span className="text-slate-300 font-medium">Ogólny stan powietrza:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                    {giosIndex.aqIndexLevel.indexLevelName}
                  </span>
                </div>
              ) : (
                <div className="text-slate-500 text-[11px]">Brak danych telemetrycznych na żywo dla tej stacji.</div>
              )}
            </div>
          )}

          {/* Chart */}
          {chartOption && (
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase mb-1">Parametry pomiarowe stacji</div>
              <div className="h-44 w-full">
                <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          )}

          {/* Metadata table */}
          <div className="space-y-1.5 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Współrzędne GPS:
              </span>
              <span className="font-mono text-slate-200">
                {event.latitude.toFixed(4)}°N, {event.longitude.toFixed(4)}°E
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Czas obserwacji:
              </span>
              <span className="font-mono text-slate-200">{new Date(event.observedAt).toLocaleString('pl-PL')}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Źródło danych:</span>
              <span className="font-mono text-sky-400">{event.source}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};

