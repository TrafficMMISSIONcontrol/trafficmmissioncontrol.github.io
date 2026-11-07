'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { DataSourceInfo } from '@/types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [sources, setSources] = useState<DataSourceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSources = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sources');
      const data = await res.json();
      if (data.success) {
        setSources(data.sources);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSources();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <h2 className="text-sm font-semibold text-white">Centrum Diagnostyki & Integracji Źródeł</h2>
            <p className="text-[11px] text-slate-400">Monitoring statusów adapterów danych przestrzennych GeoData Hub</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchSources}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Odśwież statusy"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List of sources */}
        <div className="p-4 overflow-y-auto space-y-3">
          {sources.map((src) => {
            const isActive = src.status === 'ACTIVE';
            const isDegraded = src.status === 'DEGRADED';
            const isNotConfigured = src.status === 'NOT_CONFIGURED';

            return (
              <div
                key={src.id}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{src.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">[{src.id}]</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Kategoria: <span className="text-slate-300 font-medium">{src.category}</span> | Interwał:{' '}
                    <span className="text-slate-300 font-mono">{src.updateFrequencySeconds}s</span>
                  </div>
                  {src.errorMessage && (
                    <div className="text-[10px] text-rose-400/90 mt-1 bg-rose-950/30 p-1.5 rounded border border-rose-900/40">
                      {src.errorMessage}
                    </div>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {isActive && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-400 text-xs font-semibold border border-emerald-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ACTIVE
                    </span>
                  )}
                  {isDegraded && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-950/60 text-amber-400 text-xs font-semibold border border-amber-800/60">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      DEGRADED
                    </span>
                  )}
                  {isNotConfigured && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                      NOT_CONFIGURED
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex justify-between items-center text-[11px] text-slate-400">
          <span>Wszystkie adaptery są bezpiecznie odizolowane na brzegu sieci (Vercel Edge/Serverless).</span>
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

