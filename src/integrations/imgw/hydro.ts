import { BaseAdapter, AdapterResult } from '../base';
import { GeoEvent } from '@/types';
import { globalCache } from '@/lib/cache';

// Rezerwowy słownik dla stacji bez współrzędnych w API
const FALLBACK_HYDRO_COORDS: Record<string, { lat: number; lon: number }> = {
  'Warszawa': { lat: 52.2450, lon: 21.0180 },
  'Kraków': { lat: 50.0500, lon: 19.9300 },
  'Wrocław': { lat: 51.1100, lon: 17.0300 },
  'Toruń': { lat: 53.0100, lon: 18.6000 },
  'Bydgoszcz': { lat: 53.1200, lon: 18.0100 },
  'Gdańsk': { lat: 54.3500, lon: 18.6500 },
  'Opole': { lat: 50.6700, lon: 17.9200 },
  'Poznań': { lat: 52.4100, lon: 16.9400 },
  'Szczecin': { lat: 53.4240, lon: 14.5600 }
};

interface ImgwHydroRaw {
  id_stacji: string;
  stacja: string;
  rzeka: string;
  wojewodztwo: string;
  lat?: string | number;
  lon?: string | number;
  stan_wody: string;
  stan_wody_data_pomiaru: string;
  temperatura_wody?: string;
  stan_ostrzegawczy?: string;
  stan_alarmowy?: string;
  przeplyw?: string;
}

export class ImgwHydroAdapter extends BaseAdapter {
  readonly id = 'imgw_hydro';
  readonly name = 'Stacje Hydrologiczne IMGW';
  readonly category = 'hydrology' as const;
  readonly updateFrequencySeconds = 900; // 15 minut

  async fetchAndNormalize(): Promise<AdapterResult> {
    const startTime = Date.now();
    this.lastAttemptAt = new Date().toISOString();

    const cacheKey = 'adapter_imgw_hydro_data';
    return await globalCache.getOrFetch(cacheKey, 900, async () => {
      try {
        const response = await fetch('https://danepubliczne.imgw.pl/api/data/hydro/', {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 900 }
        });

        if (!response.ok) {
          throw new Error(`IMGW Hydro API zwróciło status ${response.status}`);
        }

        const rawData: ImgwHydroRaw[] = await response.json();
        const events: GeoEvent[] = [];

        for (const item of rawData) {
          const stName = item.stacja?.trim() || 'Stacja Hydro';
          
          let lat: number | null = null;
          let lon: number | null = null;

          if (item.lat && item.lon) {
            lat = typeof item.lat === 'number' ? item.lat : parseFloat(String(item.lat));
            lon = typeof item.lon === 'number' ? item.lon : parseFloat(String(item.lon));
          }

          if (!lat || !lon || isNaN(lat) || isNaN(lon)) {
            const fallback = FALLBACK_HYDRO_COORDS[stName] || FALLBACK_HYDRO_COORDS[stName.split(' ')[0]];
            if (fallback) {
              lat = fallback.lat;
              lon = fallback.lon;
            } else {
              continue; // pomiń stacje bez znanych współrzędnych
            }
          }

          const waterLevel = parseInt(item.stan_wody, 10);
          const warnLevel = item.stan_ostrzegawczy ? parseInt(item.stan_ostrzegawczy, 10) : undefined;
          const alarmLevel = item.stan_alarmowy ? parseInt(item.stan_alarmowy, 10) : undefined;

          let severity: GeoEvent['severity'] = 'low';
          let threatNotice = '';

          if (alarmLevel && !isNaN(alarmLevel) && waterLevel >= alarmLevel) {
            severity = 'critical';
            threatNotice = ` 🚨 [STAN ALARMOWY: ${waterLevel} cm / próg ${alarmLevel} cm]`;
          } else if (warnLevel && !isNaN(warnLevel) && waterLevel >= warnLevel) {
            severity = 'high';
            threatNotice = ` ⚠️ [STAN OSTRZEGAWCZY: ${waterLevel} cm / próg ${warnLevel} cm]`;
          }

          events.push({
            id: `hydro_${item.id_stacji}`,
            source: this.id,
            category: 'hydrology',
            eventType: 'water_level_gauge',
            title: `Wodowskaz: ${item.rzeka || 'Rzeka'} — ${stName}`,
            description: `Stan wody: ${item.stan_wody} cm (Rzeka: ${item.rzeka || 'Brak danych'}, woj. ${item.wojewodztwo || 'Polska'})${threatNotice}`,
            latitude: lat,
            longitude: lon,
            geometryType: 'Point',
            observedAt: item.stan_wody_data_pomiaru ? `${item.stan_wody_data_pomiaru.replace(' ', 'T')}Z` : new Date().toISOString(),
            fetchedAt: new Date().toISOString(),
            severity,
            verificationStatus: 'CONFIRMED',
            confidence: 1.0,
            metadata: {
              stationId: item.id_stacji,
              stationName: stName,
              river: item.rzeka,
              voivodeship: item.wojewodztwo,
              waterLevelCm: isNaN(waterLevel) ? null : waterLevel,
              warningLevelCm: warnLevel,
              alarmLevelCm: alarmLevel,
              waterTempC: item.temperatura_wody ? parseFloat(item.temperatura_wody) : null,
              flowRateM3s: item.przeplyw ? parseFloat(item.przeplyw) : null,
              isAlarmExceeded: alarmLevel ? waterLevel >= alarmLevel : false,
              isWarningExceeded: warnLevel ? waterLevel >= warnLevel : false
            }
          });
        }

        this.status = 'ACTIVE';
        this.lastSuccessAt = new Date().toISOString();

        return {
          sourceId: this.id,
          status: 'ACTIVE',
          events,
          recordsCount: events.length,
          responseTimeMs: Date.now() - startTime
        };
      } catch (err: any) {
        this.status = 'DEGRADED';
        this.lastErrorMessage = err.message || 'Błąd odczytu danych hydrologicznych IMGW';
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
}
