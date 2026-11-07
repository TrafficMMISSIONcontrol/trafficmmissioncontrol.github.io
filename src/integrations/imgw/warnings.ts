/**
 * Adapter: IMGW Ostrzeżenia Meteorologiczne i Hydrologiczne
 * Źródło: IMGW API ostrzeżeń (format JSON/GeoJSON)
 * Endpoint: https://danepubliczne.imgw.pl/api/data/meteo/warnings
 * Status: ACTIVE (ostrzeżenia są publicznie dostępne)
 */

import { BaseAdapter, AdapterResult } from '../base';
import { GeoEvent } from '@/types';
import { z } from 'zod';

// Schema walidacji ostrzeżeń IMGW
const ImgwWarningSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  type: z.string().optional(),
  level: z.union([z.string(), z.number()]).optional(),
  phenomenon: z.string().optional(),
  message: z.string().optional(),
  valid_from: z.string().optional(),
  valid_to: z.string().optional(),
  region: z.string().optional(),
  voivodeship: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
}).passthrough();

// Centrum województw (fallback dla ostrzeżeń bez współrzędnych)
const VOIVODESHIP_COORDS: Record<string, [number, number]> = {
  'dolnośląskie': [51.1079, 17.0385],
  'kujawsko-pomorskie': [53.1333, 18.0167],
  'lubelskie': [51.2500, 23.1333],
  'lubuskie': [51.9333, 15.5000],
  'łódzkie': [51.7500, 19.4667],
  'małopolskie': [49.7167, 20.0000],
  'mazowieckie': [52.0833, 21.0000],
  'opolskie': [50.6667, 17.9167],
  'podkarpackie': [49.9000, 22.0000],
  'podlaskie': [53.1333, 23.1500],
  'pomorskie': [54.3667, 18.0333],
  'śląskie': [50.2667, 19.0167],
  'świętokrzyskie': [50.8667, 20.6333],
  'warmińsko-mazurskie': [53.8667, 20.6500],
  'wielkopolskie': [52.4000, 16.9167],
  'zachodniopomorskie': [53.4167, 15.5667],
};

function levelToSeverity(level: string | number | undefined): GeoEvent['severity'] {
  const l = String(level ?? '1');
  if (l === '3' || l === 'extreme' || l === 'czerwony') return 'critical';
  if (l === '2' || l === 'severe' || l === 'pomarańczowy') return 'high';
  if (l === '1' || l === 'moderate' || l === 'żółty') return 'medium';
  return 'low';
}

function phenomenonToEmoji(phenomenon: string | undefined): string {
  if (!phenomenon) return '⚠️';
  const p = phenomenon.toLowerCase();
  if (p.includes('wiatr') || p.includes('wind')) return '🌬️';
  if (p.includes('burza') || p.includes('thunder')) return '⛈️';
  if (p.includes('śnieg') || p.includes('snow') || p.includes('zamieć')) return '❄️';
  if (p.includes('deszcz') || p.includes('rain') || p.includes('opad')) return '🌧️';
  if (p.includes('mgła') || p.includes('fog')) return '🌫️';
  if (p.includes('mróz') || p.includes('frost') || p.includes('oblodzen')) return '🧊';
  if (p.includes('upał') || p.includes('heat')) return '🌡️';
  if (p.includes('powód') || p.includes('flood')) return '🌊';
  if (p.includes('lawin') || p.includes('avalanche')) return '🏔️';
  return '⚠️';
}

export class ImgwWarningsAdapter extends BaseAdapter {
  readonly id = 'imgw_warnings';
  readonly name = 'IMGW Ostrzeżenia';
  readonly category = 'alerts' as const;
  readonly updateFrequencySeconds = 900;

  private readonly WARNINGS_URL = 'https://danepubliczne.imgw.pl/api/data/meteo/warnings';

  async fetchAndNormalize(): Promise<AdapterResult> {
    const startTime = Date.now();
    this.lastAttemptAt = new Date().toISOString();
    const events: GeoEvent[] = [];

    try {
      const meteoRes = await fetch(this.WARNINGS_URL, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (meteoRes.ok) {
        const raw = await meteoRes.json();
        const warnings = Array.isArray(raw) ? raw : (raw.warnings ?? raw.data ?? []);
        
        for (const w of warnings) {
          const parsed = ImgwWarningSchema.safeParse(w);
          if (!parsed.success) continue;
          const warning = parsed.data;

          let lat = warning.lat;
          let lon = warning.lon;

          if (!lat || !lon) {
            const voivKey = (warning.voivodeship ?? warning.region ?? '').toLowerCase();
            const coords = VOIVODESHIP_COORDS[voivKey];
            if (coords) {
              [lat, lon] = coords;
            } else {
              lat = 52.0693;
              lon = 19.4803;
            }
          }

          const phenomenon = warning.phenomenon ?? warning.type ?? 'Ostrzeżenie meteorologiczne';
          const emoji = phenomenonToEmoji(phenomenon);
          const severity = levelToSeverity(warning.level);

          events.push({
            id: `imgw_warning_${warning.id ?? Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            source: 'imgw_warnings',
            category: 'alerts',
            eventType: 'weather_warning',
            title: `${emoji} IMGW: ${phenomenon}`,
            description: warning.message ?? `Ostrzeżenie meteorologiczne IMGW. Region: ${warning.region ?? warning.voivodeship ?? 'Polska'}`,
            latitude: lat,
            longitude: lon,
            geometryType: 'Point',
            observedAt: warning.valid_from ?? new Date().toISOString(),
            fetchedAt: new Date().toISOString(),
            expiresAt: warning.valid_to ?? undefined,
            severity,
            verificationStatus: 'OFFICIAL_WARNING',
            confidence: 0.98,
            metadata: {
              source: 'IMGW',
              warningType: 'meteorological',
              level: warning.level,
              region: warning.region ?? warning.voivodeship,
            },
          });
        }
      }

      this.status = 'ACTIVE';
      this.lastSuccessAt = new Date().toISOString();

      return {
        sourceId: this.id,
        status: 'ACTIVE',
        events,
        recordsCount: events.length,
        responseTimeMs: Date.now() - startTime,
      };
    } catch (err: any) {
      this.status = 'DEGRADED';
      this.lastErrorMessage = err.message;
      return {
        sourceId: this.id,
        status: 'DEGRADED',
        events: [],
        recordsCount: 0,
        responseTimeMs: Date.now() - startTime,
        errorMessage: err.message,
      };
    }
  }
}
