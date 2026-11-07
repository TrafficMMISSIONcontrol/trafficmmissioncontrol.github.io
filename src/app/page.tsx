'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/dashboard/Header';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { EventDetailModal } from '@/components/dashboard/EventDetailModal';
import { AdminModal } from '@/components/dashboard/AdminModal';
import { AnalyticsModal } from '@/components/dashboard/AnalyticsModal';
import { GeoEvent, TrafficSummary } from '@/types';
import { InferredThreat } from '@/lib/analytics/correlation';

// MapLibre musi być dynamicznie importowane z ssr: false (używa obiektu window)
const MapLibreView = dynamic(
  () => import('@/components/map/MapLibreView').then((mod) => mod.MapLibreView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Ładowanie silnika mapowego GIS...</span>
        </div>
      </div>
    ),
  }
);

export default function GeoDataHubHome() {
  const [events, setEvents] = useState<GeoEvent[]>([]);
  const [inferredThreats, setInferredThreats] = useState<InferredThreat[]>([]);
  const [trafficData, setTrafficData] = useState<any>(null);
  const [trafficSummary, setTrafficSummary] = useState<TrafficSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<GeoEvent | null>(null);
  const [focusedCoords, setFocusedCoords] = useState<[number, number] | null>(null);

  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  const [selectedLayers, setSelectedLayers] = useState({
    roads: true,
    traffic: true,
    weather: true,
    environment: true,
    hydrology: true,
    threats: true,
  });

  // Opcja filtracji terytorialnej (domyślnie: tylko Polska)
  const [onlyPoland, setOnlyPoland] = useState(true);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success) {
        setEvents(data.events || []);
        setInferredThreats(data.inferredThreats || []);
      }
    } catch (err) {
      console.error('Błąd pobierania zdarzeń:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTraffic = useCallback(async () => {
    try {
      const res = await fetch('/api/traffic');
      const json = await res.json();
      if (json.success && json.data) {
        setTrafficData(json.data);
        if (json.data.summary) {
          setTrafficSummary(json.data.summary);
        }
      }
    } catch (err) {
      console.error('Błąd pobierania natężenia ruchu:', err);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    fetchTraffic();

    // Auto-odświeżanie natężenia ruchu co 30 sekund
    const trafficInterval = setInterval(fetchTraffic, 30000);
    return () => clearInterval(trafficInterval);
  }, [fetchEvents, fetchTraffic]);

  // Synchronizacja wyboru modułu z warstwami
  const handleModuleChange = (mod: string) => {
    setActiveModule(mod);
    if (mod === 'all') {
      setSelectedLayers({ roads: true, traffic: true, weather: true, environment: true, hydrology: true, threats: true });
    } else if (mod === 'roads') {
      setSelectedLayers({ roads: true, traffic: true, weather: false, environment: false, hydrology: false, threats: false });
    } else if (mod === 'weather') {
      setSelectedLayers({ roads: false, traffic: false, weather: true, environment: false, hydrology: false, threats: false });
    } else if (mod === 'environment') {
      setSelectedLayers({ roads: false, traffic: false, weather: false, environment: true, hydrology: false, threats: false });
    } else if (mod === 'hydrology') {
      setSelectedLayers({ roads: false, traffic: false, weather: false, environment: false, hydrology: true, threats: false });
    } else if (mod === 'alerts') {
      setSelectedLayers({ roads: false, traffic: false, weather: false, environment: false, hydrology: false, threats: true });
    }
  };

  const toggleLayer = (layer: 'roads' | 'traffic' | 'weather' | 'environment' | 'hydrology' | 'threats') => {
    setSelectedLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const handleGeolocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFocusedCoords([pos.coords.longitude, pos.coords.latitude]);
        },
        (err) => {
          console.warn('Błąd geolokalizacji:', err);
        }
      );
    }
  };

  const handleSearchSelect = (lat: number, lon: number, title: string) => {
    setFocusedCoords([lon, lat]);
  };

  const handleSelectEvent = (event: GeoEvent) => {
    setSelectedEvent(event);
    setFocusedCoords([event.longitude, event.latitude]);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-950">
      <Header
        activeModule={activeModule}
        setActiveModule={handleModuleChange}
        onRefresh={() => {
          fetchEvents();
          fetchTraffic();
        }}
        isLoading={isLoading}
        totalEventsCount={events.length}
        trafficSummary={trafficSummary}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenAnalytics={() => setIsAnalyticsOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          events={events}
          inferredThreats={inferredThreats}
          selectedLayers={selectedLayers}
          trafficSummary={trafficSummary}
          toggleLayer={toggleLayer}
          onSelectEvent={handleSelectEvent}
          onSearchSelect={handleSearchSelect}
          onGeolocate={handleGeolocate}
          onlyPoland={onlyPoland}
          setOnlyPoland={setOnlyPoland}
        />

        <main className="flex-1 h-full relative">
          <MapLibreView
            events={events}
            threats={inferredThreats}
            trafficData={trafficData}
            selectedLayers={selectedLayers}
            onEventClick={handleSelectEvent}
            focusedCoordinates={focusedCoords}
            onlyPoland={onlyPoland}
          />
        </main>
      </div>

      {/* Modale */}
      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      <AdminModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      <AnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        events={events}
        threats={inferredThreats}
        trafficSummary={trafficSummary}
      />
    </div>
  );
}
