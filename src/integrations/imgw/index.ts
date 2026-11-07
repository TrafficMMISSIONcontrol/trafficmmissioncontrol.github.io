import { BaseAdapter, AdapterResult } from '../base';
import { GeoEvent } from '@/types';
import { globalCache } from '@/lib/cache';

// Oficjalne koordynaty stacji synoptycznych IMGW PIB
const IMGW_STATION_COORDS: Record<string, { lat: number; lon: number }> = {
  'Białystok': { lat: 53.1325, lon: 23.1688 },
  'Bielsko-Biała': { lat: 49.8224, lon: 19.0444 },
  'Bydgoszcz': { lat: 53.1235, lon: 18.0084 },
  'Chojnice': { lat: 53.6954, lon: 17.5562 },
  'Częstochowa': { lat: 50.8118, lon: 19.1203 },
  'Elbląg': { lat: 54.1561, lon: 19.4045 },
  'Gdańsk': { lat: 54.3520, lon: 18.6466 },
  'Gorzów Wielkopolski': { lat: 52.7368, lon: 15.2288 },
  'Hel': { lat: 54.6083, lon: 18.8014 },
  'Jelenia Góra': { lat: 50.9044, lon: 15.7275 },
  'Kalisz': { lat: 51.7673, lon: 18.0853 },
  'Katowice': { lat: 50.2649, lon: 19.0238 },
  'Kętrzyn': { lat: 54.0769, lon: 21.3745 },
  'Kielce': { lat: 50.8660, lon: 20.6285 },
  'Kłodzko': { lat: 50.4382, lon: 16.6548 },
  'Koło': { lat: 52.2003, lon: 18.6386 },
  'Kołobrzeg': { lat: 54.1759, lon: 15.5833 },
  'Koszalin': { lat: 54.1944, lon: 16.1722 },
  'Kozienice': { lat: 51.5833, lon: 21.5500 },
  'Kraków': { lat: 50.0647, lon: 19.9450 },
  'Krosno': { lat: 49.6886, lon: 21.7656 },
  'Kasprowy Wierch': { lat: 49.2325, lon: 19.9819 },
  'Krynica': { lat: 49.4214, lon: 20.9594 },
  'Legnica': { lat: 51.2070, lon: 16.1550 },
  'Lesko': { lat: 49.4708, lon: 22.3292 },
  'Leszno': { lat: 51.8403, lon: 16.5744 },
  'Lębork': { lat: 54.5392, lon: 17.7497 },
  'Lublin': { lat: 51.2465, lon: 22.5684 },
  'Łeba': { lat: 54.7600, lon: 17.5500 },
  'Łódź': { lat: 51.7592, lon: 19.4560 },
  'Mikołajki': { lat: 53.8019, lon: 21.5714 },
  'Mława': { lat: 53.1131, lon: 20.3808 },
  'Nowy Sącz': { lat: 49.6250, lon: 20.6972 },
  'Olsztyn': { lat: 53.7784, lon: 20.4801 },
  'Opole': { lat: 50.6751, lon: 17.9213 },
  'Ostrołęka': { lat: 53.0850, lon: 21.5753 },
  'Piła': { lat: 53.1514, lon: 16.7378 },
  'Płock': { lat: 52.5463, lon: 19.7065 },
  'Poznań': { lat: 52.4064, lon: 16.9252 },
  'Przemyśl': { lat: 49.7839, lon: 22.7678 },
  'Racibórz': { lat: 50.0919, lon: 18.2192 },
  'Radom': { lat: 51.4027, lon: 21.1471 },
  'Resko': { lat: 53.7733, lon: 15.4056 },
  'Rzeszów': { lat: 50.0413, lon: 21.9991 },
  'Sandomierz': { lat: 50.6828, lon: 21.7486 },
  'Siedlce': { lat: 52.1678, lon: 22.2900 },
  'Słubice': { lat: 52.3508, lon: 14.5611 },
  'Sulejów': { lat: 51.3533, lon: 19.8850 },
  'Suwałki': { lat: 54.1117, lon: 22.9308 },
  'Szczecin': { lat: 53.4285, lon: 14.5528 },
  'Szczecinek': { lat: 53.7081, lon: 16.6989 },
  'Śnieżka': { lat: 50.7358, lon: 15.7397 },
  'Świnoujście': { lat: 53.9100, lon: 14.2472 },
  'Tarnów': { lat: 50.0121, lon: 20.9858 },
  'Terespol': { lat: 52.0750, lon: 23.6194 },
  'Toruń': { lat: 53.0138, lon: 18.5984 },
  'Ustka': { lat: 54.5806, lon: 16.8619 },
  'Warszawa': { lat: 52.2297, lon: 21.0122 },
  'Wieluń': { lat: 51.2208, lon: 18.5703 },
  'Włodawa': { lat: 51.5433, lon: 23.5517 },
  'Wrocław': { lat: 51.1079, lon: 17.0385 },
  'Zakopane': { lat: 49.2992, lon: 19.9496 },
  'Zamość': { lat: 50.7231, lon: 23.2519 },
  'Zielona Góra': { lat: 51.9356, lon: 15.5062 }
};

interface ImgwRawItem {
  id_stacji: string;
  stacja: string;
  data_pomiaru: string;
  godzina_pomiaru: string;
  temperatura: string;
  predkosc_wiatru: string;
  kierunek_wiatru: string;
  wilgotnosc_wzgledna: string;
  suma_opadu: string;
  cisnienie: string;
}

export class ImgwAdapter extends BaseAdapter {
  readonly id = 'imgw_synop';
  readonly name = 'IMGW PIB - Stacje Synoptyczne';
  readonly category = 'weather' as const;
  readonly updateFrequencySeconds = 1800; // co 30 min

  async fetchAndNormalize(): Promise<AdapterResult> {
    const startTime = Date.now();
    this.lastAttemptAt = new Date().toISOString();

    const cacheKey = 'adapter_imgw_synop_data';
    return await globalCache.getOrFetch(cacheKey, 900, async () => {
      try {
        const response = await fetch('https://danepubliczne.imgw.pl/api/data/synop', {
          headers: { 'Accept': 'application/json' },
          next: { revalidate: 900 }
        });

        if (!response.ok) {
          throw new Error(`IMGW API zwróciło status ${response.status}`);
        }

        const rawData: ImgwRawItem[] = await response.json();
        const events: GeoEvent[] = [];

        for (const item of rawData) {
          const coords = IMGW_STATION_COORDS[item.stacja.trim()];
          if (!coords) continue;

          const temp = parseFloat(item.temperatura);
          const wind = parseFloat(item.predkosc_wiatru);
          const rain = parseFloat(item.suma_opadu);
          const humidity = parseFloat(item.wilgotnosc_wzgledna);
          const pressure = parseFloat(item.cisnienie) || undefined;

          // Severity logic oparta na warunkach atmosferycznych
          let severity: GeoEvent['severity'] = 'low';
          if (wind > 15 || temp < -15 || temp > 35 || rain > 20) {
            severity = 'high';
          } else if (wind > 10 || temp < -5 || temp > 30 || rain > 10) {
            severity = 'medium';
          }

          const observedAt = `${item.data_pomiaru}T${item.godzina_pomiaru.padStart(2, '0')}:00:00Z`;

          events.push({
            id: `imgw_${item.id_stacji}`,
            source: this.id,
            category: 'weather',
            eventType: 'weather_station',
            title: `Stacja IMGW ${item.stacja}`,
            description: `Temp: ${item.temperatura}°C | Wiatr: ${item.predkosc_wiatru} m/s | Opady: ${item.suma_opadu} mm | Wilg: ${item.wilgotnosc_wzgledna}%`,
            latitude: coords.lat,
            longitude: coords.lon,
            geometryType: 'Point',
            observedAt,
            fetchedAt: new Date().toISOString(),
            severity,
            verificationStatus: 'CONFIRMED',
            confidence: 1.0,
            metadata: {
              stationId: item.id_stacji,
              stationName: item.stacja,
              temperature: isNaN(temp) ? null : temp,
              windSpeed: isNaN(wind) ? null : wind,
              windDirection: item.kierunek_wiatru,
              humidity: isNaN(humidity) ? null : humidity,
              precipitation: isNaN(rain) ? null : rain,
              pressure: pressure || null
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
        this.lastErrorMessage = err.message || 'Błąd połączenia z IMGW';
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

