import { BaseAdapter, AdapterResult } from '../base';
import { GeoEvent } from '@/types';
import { globalCache } from '@/lib/cache';

// Centra głównych aglomeracji do próbkowania prognozy pogody
const MAJOR_CITIES = [
  { name: 'Warszawa', lat: 52.2297, lon: 21.0122 },
  { name: 'Kraków', lat: 50.0647, lon: 19.9450 },
  { name: 'Gdańsk', lat: 54.3520, lon: 18.6466 },
  { name: 'Wrocław', lat: 51.1079, lon: 17.0385 },
  { name: 'Poznań', lat: 52.4064, lon: 16.9252 },
  { name: 'Katowice', lat: 50.2649, lon: 19.0238 },
  { name: 'Lublin', lat: 51.2465, lon: 22.5684 },
  { name: 'Szczecin', lat: 53.4285, lon: 14.5528 }
];

export class OpenMeteoAdapter extends BaseAdapter {
  readonly id = 'openmeteo';
  readonly name = 'Open-Meteo - Prognozy & Warunki';
  readonly category = 'weather' as const;
  readonly updateFrequencySeconds = 3600;

  async fetchAndNormalize(): Promise<AdapterResult> {
    const startTime = Date.now();
    this.lastAttemptAt = new Date().toISOString();

    const cacheKey = 'adapter_openmeteo_major_cities';
    return await globalCache.getOrFetch(cacheKey, 1800, async () => {
      try {
        const events: GeoEvent[] = [];

        for (const city of MAJOR_CITIES) {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto`;
          const res = await fetch(url, { next: { revalidate: 1800 } });
          if (!res.ok) continue;

          const data = await res.json();
          const current = data.current;
          if (!current) continue;

          const temp = current.temperature_2m;
          const wind = current.wind_speed_10m;
          const rain = current.precipitation;

          let severity: GeoEvent['severity'] = 'low';
          if (wind > 60 || temp < -15 || temp > 35 || rain > 25) {
            severity = 'critical';
          } else if (wind > 40 || rain > 10) {
            severity = 'medium';
          }

          events.push({
            id: `openmeteo_${city.name.toLowerCase()}`,
            source: this.id,
            category: 'weather',
            eventType: 'weather_forecast',
            title: `Prognoza Open-Meteo: ${city.name}`,
            description: `Temperatura: ${temp}°C, Wiatr: ${wind} km/h, Opady: ${rain} mm`,
            latitude: city.lat,
            longitude: city.lon,
            geometryType: 'Point',
            observedAt: current.time,
            fetchedAt: new Date().toISOString(),
            severity,
            verificationStatus: 'FORECAST',
            confidence: 0.9,
            metadata: {
              cityName: city.name,
              temperature: temp,
              windSpeed: wind,
              precipitation: rain,
              weatherCode: current.weather_code,
              humidity: current.relative_humidity_2m
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
        this.lastErrorMessage = err.message || 'Błąd połączenia z Open-Meteo';
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

