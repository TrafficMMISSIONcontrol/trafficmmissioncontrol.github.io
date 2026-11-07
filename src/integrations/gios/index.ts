import { BaseAdapter, AdapterResult } from '../base';
import { GeoEvent } from '@/types';
import { globalCache } from '@/lib/cache';

interface GiosStationRaw {
  id: number;
  stationName: string;
  gegrLat: string;
  gegrLon: string;
  city?: {
    name: string;
    commune?: {
      provinceName: string;
    };
  };
  addressStreet?: string;
}

export class GiosAdapter extends BaseAdapter {
  readonly id = 'gios_air';
  readonly name = 'GIOŚ - Portal Jakości Powietrza';
  readonly category = 'environment' as const;
  readonly updateFrequencySeconds = 3600; // co 1h

  async fetchAndNormalize(): Promise<AdapterResult> {
    const startTime = Date.now();
    this.lastAttemptAt = new Date().toISOString();

    const cacheKey = 'adapter_gios_stations_data';
    return await globalCache.getOrFetch(cacheKey, 1800, async () => {
      try {
        const response = await fetch('https://api.gios.gov.pl/pjp-api/rest/station/findAll', {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 1800 }
        });

        if (!response.ok) {
          throw new Error(`GIOŚ API zwróciło status ${response.status}`);
        }

        const rawStations: GiosStationRaw[] = await response.json();
        const events: GeoEvent[] = [];

        // Ograniczmy przetwarzanie stacji do prawidłowo zlokalizowanych w PL
        for (const station of rawStations) {
          const lat = parseFloat(station.gegrLat);
          const lon = parseFloat(station.gegrLon);
          if (isNaN(lat) || isNaN(lon)) continue;

          events.push({
            id: `gios_${station.id}`,
            source: this.id,
            category: 'environment',
            eventType: 'air_quality_station',
            title: `Stacja jakości powietrza: ${station.stationName}`,
            description: `Lokalizacja: ${station.city?.name || 'Polska'}${station.addressStreet ? ` (${station.addressStreet})` : ''}`,
            latitude: lat,
            longitude: lon,
            geometryType: 'Point',
            observedAt: new Date().toISOString(),
            fetchedAt: new Date().toISOString(),
            severity: 'low',
            verificationStatus: 'CONFIRMED',
            confidence: 1.0,
            metadata: {
              stationId: station.id,
              stationName: station.stationName,
              city: station.city?.name,
              province: station.city?.commune?.provinceName,
              address: station.addressStreet
            }
          });
        }

        this.status = 'ACTIVE';
        this.lastSuccessAt = new Date().toISOString();
        this.lastErrorMessage = undefined;

        return {
          sourceId: this.id,
          status: 'ACTIVE',
          events,
          recordsCount: events.length,
          responseTimeMs: Date.now() - startTime
        };
      } catch (err: any) {
        this.status = 'DEGRADED';
        this.lastErrorMessage = err.message || 'Błąd połączenia z GIOŚ API';
        return {
          sourceId: this.id,
          status: 'DEGRADED',
          events: [],
          recordsCount: 0,
          responseTimeMs: Date.now() - startTime,
          errorMessage: this.lastErrorMessage
        };
      }
    });
  }

  /**
   * Pobiera szczegółowy indeks stacji w locie na żądanie użytkownika (lazy loading)
   */
  async fetchStationIndex(stationId: number) {
    const cacheKey = `gios_index_${stationId}`;
    return await globalCache.getOrFetch(cacheKey, 600, async () => {
      try {
        const res = await fetch(`https://api.gios.gov.pl/pjp-api/rest/aqindex/getIndex/${stationId}`);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    });
  }
}

