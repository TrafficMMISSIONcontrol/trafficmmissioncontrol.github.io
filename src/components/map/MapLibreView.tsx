'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl, { Map as MapLibreMap, GeoJSONSource } from 'maplibre-gl';
import { GeoEvent } from '@/types';
import { isPointInPoland } from '@/lib/geo/polandBorder';
import { InferredThreat } from '@/lib/analytics/correlation';

// Obrys granic Polski dla wyrazistej linii granicznej
const POLAND_OUTLINE_COORDS: [number, number][] = [
  [18.57, 54.44], [19.65, 54.55], [22.79, 54.36], [23.55, 54.10], [23.51, 53.95],
  [23.95, 53.25], [23.18, 52.12], [23.62, 51.50], [24.15, 50.28], [22.70, 49.00],
  [21.00, 49.40], [20.08, 49.19], [18.85, 49.50], [18.30, 49.95], [17.50, 50.25],
  [16.20, 50.45], [15.40, 50.85], [14.82, 50.90], [14.75, 51.50], [14.65, 52.05],
  [14.55, 52.55], [14.35, 53.40], [14.25, 53.90], [16.80, 54.50], [18.30, 54.83],
  [18.57, 54.44] // zamknięcie pętli
];

interface MapLibreViewProps {
  events: GeoEvent[];
  threats: InferredThreat[];
  trafficData?: any;
  selectedLayers: {
    roads: boolean;
    traffic: boolean;
    weather: boolean;
    environment: boolean;
    hydrology: boolean;
    threats: boolean;
  };
  onEventClick: (event: GeoEvent) => void;
  focusedCoordinates?: [number, number] | null;
  onlyPoland: boolean;
}

export const MapLibreView: React.FC<MapLibreViewProps> = ({
  events,
  threats,
  trafficData,
  selectedLayers,
  onEventClick,
  focusedCoordinates,
  onlyPoland,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  // Inicjalizacja MapLibre
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Styl wektorowy OpenFreeMap Dark
    const mapStyle = 'https://tiles.openfreemap.org/styles/dark';

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [19.4803, 52.0693], // Centrum Polski
      zoom: 6.3,
      minZoom: 5,
      maxZoom: 18,
    });

    map.on('error', (e) => {
      if (e.error && (e.error as any).status === 404) {
        console.warn('Błąd ładowania stylu mapy');
      }
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      // 0. Stylizacja granic i etykiet miast stylu podkładowego (zwiększenie czytelności)
      try {
        // Granice państwowe (wyrazisty srebrzysto-biały kontur)
        if (map.getLayer('boundary_country_z5-')) {
          map.setPaintProperty('boundary_country_z5-', 'line-color', '#cbd5e1');
          map.setPaintProperty('boundary_country_z5-', 'line-width', [
            'interpolate', ['exponential', 1.1], ['zoom'], 4, 1.8, 8, 2.8, 14, 4.5
          ]);
          map.setPaintProperty('boundary_country_z5-', 'line-opacity', 0.9);
        }
        if (map.getLayer('boundary_country_z0-4')) {
          map.setPaintProperty('boundary_country_z0-4', 'line-color', '#cbd5e1');
          map.setPaintProperty('boundary_country_z0-4', 'line-opacity', 0.85);
        }

        // Granice województw (wyraźniejsza linia przerywana)
        if (map.getLayer('boundary_state')) {
          map.setPaintProperty('boundary_state', 'line-color', '#94a3b8');
          map.setPaintProperty('boundary_state', 'line-width', [
            'interpolate', ['exponential', 1.2], ['zoom'], 4, 1.2, 8, 2.0, 14, 3.2
          ]);
          map.setPaintProperty('boundary_state', 'line-dasharray', [4, 3]);
          map.setPaintProperty('boundary_state', 'line-opacity', 0.85);
        }

        // Wyraźniejsze i bardziej czytelne nazwy miast (City Labels)
        if (map.getLayer('place_city_large')) {
          map.setPaintProperty('place_city_large', 'text-color', '#ffffff');
          map.setPaintProperty('place_city_large', 'text-halo-color', '#020617');
          map.setPaintProperty('place_city_large', 'text-halo-width', 2.2);
          map.setLayoutProperty('place_city_large', 'text-size', 14);
        }
        if (map.getLayer('place_city')) {
          map.setPaintProperty('place_city', 'text-color', '#f8fafc');
          map.setPaintProperty('place_city', 'text-halo-color', '#020617');
          map.setPaintProperty('place_city', 'text-halo-width', 2);
          map.setLayoutProperty('place_city', 'text-size', 12);
        }
        if (map.getLayer('place_town')) {
          map.setPaintProperty('place_town', 'text-color', '#e2e8f0');
          map.setPaintProperty('place_town', 'text-halo-color', '#020617');
          map.setPaintProperty('place_town', 'text-halo-width', 1.6);
          map.setLayoutProperty('place_town', 'text-size', 10.5);
        }
      } catch (styleErr) {
        console.warn('Dostosowywanie warstw stylu bazowego:', styleErr);
      }

      // 0b. Dedykowana wyrazista granica RP (subtelny błękitno-srebrny kontur Polski)
      map.addSource('poland-border-outline', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: 'Polska' },
          geometry: {
            type: 'LineString',
            coordinates: POLAND_OUTLINE_COORDS,
          },
        },
      });

      map.addLayer({
        id: 'poland-border-line',
        type: 'line',
        source: 'poland-border-outline',
        paint: {
          'line-color': '#38bdf8',
          'line-width': 2,
          'line-opacity': 0.75,
          'line-dasharray': [6, 3],
        },
      });

      // 1. Źródło GeoJSON dla klastrowanych punktów zdarzeń
      map.addSource('events-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 55,
      });

      // 1b. Źródło dla linii Odcinkowego Pomiaru Prędkości (OPP)
      map.addSource('opp-lines-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'opp-lines-layer',
        type: 'line',
        source: 'opp-lines-source',
        paint: {
          'line-color': '#c084fc', // neon fiolet
          'line-width': 3,
          'line-opacity': 0.8,
          'line-dasharray': [3, 2],
        },
      });

      // 1c. Źródło i warstwy dla Natężenia Ruchu (Traffic Flow - cieńsze i bardziej subtelne)
      map.addSource('traffic-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Subtelny podrys (casing) pod linią ruchu
      map.addLayer({
        id: 'traffic-casing-layer',
        type: 'line',
        source: 'traffic-source',
        paint: {
          'line-color': '#020617',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 2.0,
            9, 3.2,
            14, 5.0
          ],
          'line-opacity': 0.5,
        },
      });

      // Cieńsza, elegancka linia natężenia ruchu
      map.addLayer({
        id: 'traffic-lines-layer',
        type: 'line',
        source: 'traffic-source',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            5, 1.2,
            9, 2.2,
            14, 3.8
          ],
          'line-opacity': 0.82,
        },
      });

      // 2. Klastry (kółka) - mniejsze, półprzezroczyste, mniej inwazyjne
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'events-source',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#0284c7', // niebieski
            20,
            '#f59e0b', // bursztyn
            100,
            '#ef4444', // czerwony
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            10, // mały dyskretny rozmiar
            20,
            13,
            100,
            17
          ],
          'circle-opacity': 0.55, // półprzezroczyste, nie zasłaniają mapy
          'circle-stroke-width': 1.2,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.45,
        },
      });

      // 3. Licznik punktów w klastrze
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'events-source',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 9.5,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1,
        },
      });

      // 4. Niezgrupowane punkty - mniejsze, delikatne okręgi
      map.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'events-source',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'eventType'],
            'speed_camera',
            '#3b82f6',
            'avg_speed_check',
            '#a855f7',
            'road_works',
            '#f97316',
            'accident',
            '#ef4444',
            'weather_warning',
            '#eab308',
            'hydro_warning',
            '#06b6d4',
            'water_level_gauge',
            '#0284c7',
            'air_quality_station',
            '#10b981',
            'weather_station',
            '#f59e0b',
            'weather_forecast',
            '#38bdf8',
            '#64748b'
          ],
          'circle-radius': 7.5, // małe i subtelne
          'circle-opacity': 0.65,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.55,
        },
      });

      // 4b. Subtelne ikony wewnątrz punktów
      map.addLayer({
        id: 'unclustered-point-icon',
        type: 'symbol',
        source: 'events-source',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': [
            'match',
            ['get', 'eventType'],
            'speed_camera', '📸',
            'avg_speed_check', '⏱️',
            'road_works', '🚧',
            'accident', '💥',
            'weather_warning', '⚠️',
            'hydro_warning', '🌊',
            'water_level_gauge', '🌊',
            'air_quality_station', '🍃',
            'weather_station', '⛅',
            'weather_forecast', '🌤️',
            '📍'
          ],
          'text-size': 8.5,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
      });

      // 4c. Źródło i warstwa Zagrożeń / Wniosków Systemu
      map.addSource('threats-source', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'threats-circle',
        type: 'circle',
        source: 'threats-source',
        paint: {
          'circle-color': '#ef4444',
          'circle-radius': 11,
          'circle-stroke-width': 1.8,
          'circle-stroke-color': '#fef08a',
          'circle-opacity': 0.75,
        },
      });

      map.addLayer({
        id: 'threats-icon',
        type: 'symbol',
        source: 'threats-source',
        layout: {
          'text-field': [
            'match',
            ['get', 'type'],
            'black_ice', '❄️',
            'wind_hazard', '🌪️',
            'flood_risk', '🌊',
            '⚠️'
          ],
          'text-size': 10,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
      });

      // Obsługa kliknięć
      // 5a. Kliknięcie w klaster -> przybliżenie
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        const source = map.getSource('events-source') as GeoJSONSource;

        (source as any).getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          const coords = (features[0].geometry as any).coordinates;
          map.easeTo({ center: coords, zoom: zoom + 1 });
        });
      });

      // 5b. Kliknięcie w punkt zdarzenia -> Modal szczegółów
      map.on('click', 'unclustered-point', (e) => {
        const feature = e.features?.[0];
        if (!feature) return;

        const eventId = feature.properties?.id;
        const clickedEvent = events.find((ev) => ev.id === eventId);
        if (clickedEvent) {
          onEventClick(clickedEvent);
        }
      });

      // 5c. Kliknięcie w linię natężenia ruchu -> popup ze szczegółami
      map.on('click', 'traffic-lines-layer', (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties as any;

        let statusBadge = '';
        if (props.status === 'fluid') statusBadge = '<span style="color:#10b981;font-weight:700;">🟢 PŁYNNY</span>';
        else if (props.status === 'moderate') statusBadge = '<span style="color:#f59e0b;font-weight:700;">🟡 SPOWOLNIONY</span>';
        else if (props.status === 'jam') statusBadge = '<span style="color:#ef4444;font-weight:700;">🔴 ZATOR / KOREK</span>';
        else if (props.status === 'blocked') statusBadge = '<span style="color:#991b1b;font-weight:700;">⛔ ZABLOKOWANA</span>';

        const typeName = props.type === 'as' ? 'Autostrada / S' : (props.type === 'dk' ? 'Droga Krajowa' : 'Arteria miejska');

        new maplibregl.Popup({ offset: 10, maxWidth: '320px' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family: inherit; font-size: 12px; color: #f8fafc; padding: 4px;">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom: 6px; border-bottom: 1px solid #334155; padding-bottom: 4px;">
                <strong style="font-size: 13px; color: #38bdf8;">${props.name || props.roadId}</strong>
                <span style="font-size: 10px; background: #1e293b; padding: 2px 6px; border-radius: 4px; border: 1px solid #475569;">${typeName}</span>
              </div>
              <div style="margin-bottom: 6px; font-size: 12px;">
                Stan ruchu: ${statusBadge}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #0f172a; padding: 6px; border-radius: 6px; margin-bottom: 6px;">
                <div>
                  <div style="font-size: 10px; color: #94a3b8;">Prędkość aktualna</div>
                  <strong style="color: #ffffff; font-size: 12px;">${props.speed} km/h</strong>
                </div>
                <div>
                  <div style="font-size: 10px; color: #94a3b8;">Dopuszczalna</div>
                  <strong style="color: #ffffff; font-size: 12px;">${props.speedLimit} km/h</strong>
                </div>
              </div>
              ${Number(props.delayMinutes) > 0 ? `<div style="color: #fb7185; font-size: 11px; font-weight: 600; margin-bottom: 4px;">⏱️ Opóźnienie: +${props.delayMinutes} min</div>` : ''}
              <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">${props.description || ''}</div>
            </div>
          `)
          .addTo(map);
      });

      // 6. Kliknięcie w Zagrożenie Wnioskowane
      map.on('click', 'threats-circle', (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const coords = (feature.geometry as any).coordinates;
        const props = feature.properties;
        new maplibregl.Popup({ offset: 12 })
          .setLngLat(coords)
          .setHTML(
            `<div class="text-xs p-1">
              <div class="font-bold text-amber-400 mb-1 flex items-center gap-1">⚠️ ${props?.title || 'Zagrożenie korelacyjne'}</div>
              <p class="text-slate-200 mb-2 leading-relaxed">${props?.description || ''}</p>
              <div class="text-[10px] bg-amber-950/60 text-amber-300 p-1 rounded border border-amber-800">
                Weryfikacja: <strong>SYSTEM_INFERENCE</strong> | Poziom: ${props?.severity || 'Wysoki'}
              </div>
            </div>`
          )
          .addTo(map);
      });

      // 7. Kliknięcie w linię Odcinkowego Pomiaru Prędkości
      map.on('click', 'opp-lines-layer', (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const props = feature.properties;
        new maplibregl.Popup({ offset: 10 })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div class="text-xs">
              <div class="font-bold text-purple-400 mb-1">⏱️ ${props?.title || 'Odcinkowy Pomiar Prędkości'}</div>
              <p class="text-slate-300 mb-1">Strefa aktywnej kontroli średniej prędkości</p>
              <div class="text-[10px] text-slate-400">Źródło: CANARD / OSM</div>
            </div>`
          )
          .addTo(map);
      });

      // Subtelny hover: klastry po najechaniu delikatnie się rozjaśniają
      map.on('mouseenter', 'clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
        map.setPaintProperty('clusters', 'circle-opacity', 0.85);
        map.setPaintProperty('clusters', 'circle-stroke-opacity', 0.8);
      });
      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
        map.setPaintProperty('clusters', 'circle-opacity', 0.55);
        map.setPaintProperty('clusters', 'circle-stroke-opacity', 0.45);
      });

      // Pojedyncze punkty
      map.on('mouseenter', 'unclustered-point', () => {
        map.getCanvas().style.cursor = 'pointer';
        map.setPaintProperty('unclustered-point', 'circle-opacity', 0.95);
        map.setPaintProperty('unclustered-point', 'circle-stroke-width', 1.8);
      });
      map.on('mouseleave', 'unclustered-point', () => {
        map.getCanvas().style.cursor = '';
        map.setPaintProperty('unclustered-point', 'circle-opacity', 0.65);
        map.setPaintProperty('unclustered-point', 'circle-stroke-width', 1);
      });

      map.on('mouseenter', 'opp-lines-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'opp-lines-layer', () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'traffic-lines-layer', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'traffic-lines-layer', () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'threats-circle', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'threats-circle', () => { map.getCanvas().style.cursor = ''; });

      mapRef.current = map;
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Aktualizacja danych w warstwie po zmianie filtrowania lub pobraniu nowych obiektów
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const source = map.getSource('events-source') as GeoJSONSource;
    const oppLinesSource = map.getSource('opp-lines-source') as GeoJSONSource;
    const trafficSource = map.getSource('traffic-source') as GeoJSONSource;
    const threatsSource = map.getSource('threats-source') as GeoJSONSource;
    if (!source) return;

    // Filtrujemy zdarzenia według włączonych warstw oraz granic Polski
    const visibleEvents = events.filter((e) => {
      if (onlyPoland && !isPointInPoland(e.latitude, e.longitude)) return false;
      if (e.category === 'roads' && !selectedLayers.roads) return false;
      if (e.category === 'weather' && !selectedLayers.weather) return false;
      if (e.category === 'environment' && !selectedLayers.environment) return false;
      if (e.category === 'hydrology' && !selectedLayers.hydrology) return false;
      return true;
    });

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: visibleEvents.map((e) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [e.longitude, e.latitude],
        },
        properties: {
          id: e.id,
          title: e.title,
          description: e.description,
          category: e.category,
          eventType: e.eventType,
          source: e.source,
          severity: e.severity,
          observedAt: e.observedAt,
        },
      })),
    };

    source.setData(geojsonData);

    // Aktualizacja linii Odcinkowego Pomiaru Prędkości
    if (oppLinesSource) {
      const oppEvents = selectedLayers.roads
        ? events.filter((e) => e.eventType === 'avg_speed_check' && e.coordinates && Array.isArray(e.coordinates))
        : [];

      const linesGeoJson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: oppEvents.map((e) => ({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: e.coordinates,
          },
          properties: {
            id: e.id,
            title: e.title,
          },
        })),
      };

      oppLinesSource.setData(linesGeoJson);
    }

    // Aktualizacja linii Natężenia Ruchu
    if (trafficSource) {
      if (selectedLayers.traffic && trafficData?.features) {
        trafficSource.setData(trafficData);
      } else {
        trafficSource.setData({ type: 'FeatureCollection', features: [] });
      }
    }

    // Aktualizacja punktów Zagrożeń (Threats) na mapie
    if (threatsSource) {
      const visibleThreats = selectedLayers.threats
        ? threats.filter((t) => (!onlyPoland || isPointInPoland(t.latitude, t.longitude)))
        : [];

      const threatsGeoJson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: visibleThreats.map((t) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [t.longitude, t.latitude],
          },
          properties: {
            id: t.id,
            type: t.type,
            title: t.title,
            description: t.description,
            severity: t.severity,
          },
        })),
      };

      threatsSource.setData(threatsGeoJson);
    }
  }, [events, threats, trafficData, selectedLayers, onlyPoland]);

  // Centrowanie mapy na wybranym elemencie
  useEffect(() => {
    if (!mapRef.current || !focusedCoordinates) return;
    mapRef.current.flyTo({
      center: focusedCoordinates,
      zoom: 12,
      essential: true,
      duration: 1500,
    });
  }, [focusedCoordinates]);

  return <div ref={mapContainer} className="w-full h-full" />;
};
