import { GeoEvent } from '@/types';

export interface InferredThreat {
  id: string;
  type: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  verificationStatus: 'SYSTEM_INFERENCE';
  confidence: number;
  factors: string[];
}

export function analyzeCorrelations(events: GeoEvent[]): InferredThreat[] {
  const threats: InferredThreat[] = [];

  const weatherEvents = events.filter(e => e.category === 'weather');

  for (const w of weatherEvents) {
    const meta = w.metadata;
    if (!meta) continue;

    const temp = meta.temperature;
    const precip = meta.precipitation;
    const humidity = meta.humidity;
    const wind = meta.windSpeed;

    // Scenariusz 1: Ryzyko oblodzenia (Temp bliska 0 lub ujemna + opady/wysoka wilgotność)
    if (typeof temp === 'number' && temp <= 1 && temp >= -4 && (precip > 0 || humidity > 85)) {
      threats.push({
        id: `threat_ice_${w.id}`,
        type: 'black_ice_risk',
        title: `Wniosek systemu: Ryzyko gołoledzi / oblodzenia (${meta.stationName || meta.cityName || 'Region'})`,
        description: `Temperatura ${temp}°C przy wilgotności ${humidity}% i opadach ${precip || 0}mm stwarza bezpośrednie ryzyko marznącej nawierzchni na drogach.`,
        latitude: w.latitude,
        longitude: w.longitude,
        severity: 'high',
        verificationStatus: 'SYSTEM_INFERENCE',
        confidence: 0.85,
        factors: [
          `Temperatura powietrza: ${temp}°C`,
          `Wilgotność względna: ${humidity}%`,
          `Suma opadów: ${precip || 0} mm`
        ]
      });
    }

    // Scenariusz 2: Ryzyko wichury i uszkodzenia infrastruktury
    if (typeof wind === 'number' && wind >= 15) {
      threats.push({
        id: `threat_wind_${w.id}`,
        type: 'infrastructure_wind_hazard',
        title: `Wniosek systemu: Zagrożenie dla infrastruktury - porywisty wiatr`,
        description: `Wiatr o prędkości ${wind} m/s może powodować łamanie konarów i uszkodzenia linii energetycznych w rejonie ${meta.stationName || meta.cityName || ''}.`,
        latitude: w.latitude,
        longitude: w.longitude,
        severity: wind > 22 ? 'critical' : 'high',
        verificationStatus: 'SYSTEM_INFERENCE',
        confidence: 0.9,
        factors: [
          `Prędkość wiatru: ${wind} m/s (${Math.round(wind * 3.6)} km/h)`
        ]
      });
    }
  }

  // Scenariusz 3: Ryzyko powodziowe (Hydro)
  const hydroEvents = events.filter(e => e.category === 'hydrology');
  for (const h of hydroEvents) {
    const meta = h.metadata;
    if (!meta) continue;

    if (meta.alarmLevelCm && meta.waterLevelCm && meta.waterLevelCm >= meta.alarmLevelCm) {
      threats.push({
        id: `threat_flood_${h.id}`,
        type: 'flood_risk',
        title: `Wniosek systemu: Bezpośrednie zagrożenie wezbraniowe (${meta.river} - ${meta.stationName})`,
        description: `Stan wody ${meta.waterLevelCm} cm przekroczył stan alarmowy (${meta.alarmLevelCm} cm). Wysokie prawdopodobieństwo lokalnych podtopień.`,
        latitude: h.latitude,
        longitude: h.longitude,
        severity: 'critical',
        verificationStatus: 'SYSTEM_INFERENCE',
        confidence: 0.95,
        factors: [
          `Aktualny stan wody: ${meta.waterLevelCm} cm`,
          `Stan alarmowy: ${meta.alarmLevelCm} cm`,
          `Rzeka: ${meta.river}`
        ]
      });
    }
  }

  return threats;
}

