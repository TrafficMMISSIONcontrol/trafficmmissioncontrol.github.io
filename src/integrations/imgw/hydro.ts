import { BaseAdapter, AdapterResult } from '../base';
import { GeoEvent } from '@/types';
import { globalCache } from '@/lib/cache';

// Główne posterunki wodowskazowe w Polsce (Wisła, Odra, Warta, Bug, Narew, San)
const HYDRO_STATION_COORDS: Record<string, { lat: number; lon: number }> = {
  'Warszawa (Bulwary)': { lat: 52.2450, lon: 21.0180 },
  'Warszawa': { lat: 52.2450, lon: 21.0180 },
  'Kraków-Bielany': { lat: 50.0430, lon: 19.8350 },
  'Kraków': { lat: 50.0500, lon: 19.9300 },
  'Wrocław-Rędzin': { lat: 51.1550, lon: 16.9200 },
  'Wrocław': { lat: 51.1100, lon: 17.0300 },
  'Sandomierz': { lat: 50.6780, lon: 21.7500 },
  'Toruń': { lat: 53.0100, lon: 18.6000 },
  'Bydgoszcz': { lat: 53.1200, lon: 18.0100 },
  'Gdańsk-Sobieszewo': { lat: 54.3400, lon: 18.8700 },
  'Tczew': { lat: 54.0900, lon: 18.7900 },
  'Opole': { lat: 50.6700, lon: 17.9200 },
  'Racibórz-Miedonia': { lat: 50.1200, lon: 18.2100 },
  'Głogów': { lat: 51.6660, lon: 16.0840 },
  'Nowa Sól': { lat: 51.8000, lon: 15.7100 },
  'Kostrzyn nad Odrą': { lat: 52.5900, lon: 14.6500 },
  'Poznań-Most Teatralny': { lat: 52.4100, lon: 16.9200 },
  'Poznań': { lat: 52.4100, lon: 16.9400 },
  'Gorzów Wielkopolski': { lat: 52.7300, lon: 15.2300 },
  'Wyszków': { lat: 52.5900, lon: 21.4600 },
  'Puławy': { lat: 51.4100, lon: 21.9600 },
  'Przemyśl': { lat: 49.7800, lon: 22.7700 },
  'Szczecin-Most Długi': { lat: 53.4240, lon: 14.5600 },
  'Szczecin': { lat: 53.4240, lon: 14.5600 }
};

interface ImgwHydroRaw {
  id_stacji: string;
  stacja: string;
  rzeka: string;
  województwo: string;
  stan_wody: string;
  stan_wody_data_pomiaru: string;
  temperatura_wody?: string;
  stan_ostrzegawczy?: string;
  stan_alarmowy?: string;
}

export class ImgwHydroAdapter extends BaseAdapter {
  readonly id = 'imgw_hydro';
  readonly name = 'IMGW PIB - Pomiary Hydrologiczne & Stany Wód';
  readonly category = 'hydrology' as const;
  readonly updateFrequencySeconds = 1800;

  async fetchAndNormalize(): Promise<AdapterResult> {
    const startTime = Date.now();
    this.lastAttemptAt = new Date().toISOString();

    const cacheKey = 'adapter_imgw_hydro_data';
    return await globalCache.getOrFetch(cacheKey, 900, async () => {
      try {
        const response = await fetch('https://danepubliczne.imgw.pl/api/data/hydro', {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 900 }
        });

        if (!response.ok) {
          throw new Error(`IMGW Hydro API zwróciło status ${response.status}`);
        }

        const rawData: ImgwHydroRaw[] = await response.json();
        const events: GeoEvent[] = [];

        for (const item of rawData) {
          const stName = item.stacja.trim();
          const coords = HYDRO_STATION_COORDS[stName] || HYDRO_STATION_COORDS[stName.split(' ')[0]];
          if (!coords) continue;

          const waterLevel = parseInt(item.stan_wody, 10);
          const warnLevel = item.stan_ostrzegawczy ? parseInt(item.stan_ostrzegawczy, 10) : undefined;
          const alarmLevel = item.stan_alarmowy ? parseInt(item.stan_alarmowy, 10) : undefined;

          let severity: GeoEvent['severity'] = 'low';
          let threatNotice = '';

          if (alarmLevel && !isNaN(alarmLevel) && waterLevel >= alarmLevel) {
            severity = 'critical';
            threatNotice = ` [PRZEKROCZENIE STANU ALARMOWEGO: ${waterLevel} cm / próg ${alarmLevel} cm]`;
          } else if (warnLevel && !isNaN(warnLevel) && waterLevel >= warnLevel) {
            severity = 'high';
            threatNotice = ` [PRZEKROCZENIE STANU OSTRZEGAWCZEGO: ${waterLevel} cm / próg ${warnLevel} cm]`;
          }

          events.push({
            id: `hydro_${item.id_stacji}`,
            source: this.id,
            category: 'hydrology',
            eventType: 'water_level_gauge',
            title: `Wodowskaz: ${item.rzeka} — ${stName}`,
            description: `Stan wody: ${item.stan_wody} cm (Rzeka: ${item.rzeka}, woj. ${item.województwo})${threatNotice}`,
            latitude: coords.lat,
            longitude: coords.lon,
            geometryType: 'Point',
            observedAt: item.stan_wody_data_pomiaru ? `${item.stan_wody_data_pomiaru}Z` : new Date().toISOString(),
            fetchedAt: new Date().toISOString(),
            severity,
            verificationStatus: 'CONFIRMED',
            confidence: 1.0,
            metadata: {
              stationId: item.id_stacji,
              stationName: stName,
              river: item.rzeka,
              waterLevelCm: isNaN(waterLevel) ? null : waterLevel,
              warningLevelCm: warnLevel || null,
              alarmLevelCm: alarmLevel || null,
              waterTemp: item.temperatura_wody || null
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
        this.lastErrorMessage = err.message || 'Błąd połączenia z IMGW Hydro';
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

