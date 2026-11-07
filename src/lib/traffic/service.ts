/**
 * Traffic Service - Moduł Analizy i Wizualizacji Natężenia Ruchu
 * Oblicza stan natężenia ruchu dla autostrad, dróg ekspresowych, dróg krajowych i arterii miejskich.
 */

import { TrafficSegment, TrafficStatus, TrafficSummary } from '@/types';
import rawRoadsData from '@/data/traffic_roads.json';

interface RoadConfig {
  id: string;
  name: string;
  type: 'as' | 'dk' | 'city';
  coordinates: [number, number][]; // [lon, lat]
}

const STATUS_COLORS: Record<TrafficStatus, string> = {
  fluid: '#10b981',    // Zielony neon - płynny
  moderate: '#f59e0b', // Żółty/Bursztyn - spowolniony
  jam: '#ef4444',      // Czerwony - zator / korek
  blocked: '#991b1b',  // Ciemnoczerwony - zablokowana droga
};

export class TrafficService {
  private static readonly roads: RoadConfig[] = rawRoadsData as RoadConfig[];

  /**
   * Generuje stan natężenia ruchu dla wszystkich dróg
   */
  public static getTrafficData(): { segments: TrafficSegment[]; summary: TrafficSummary } {
    const roads = this.roads || [];
    const segments: TrafficSegment[] = [];

    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const isRushHourMorning = hour >= 7 && (hour < 9 || (hour === 9 && minute <= 30));
    const isRushHourAfternoon = hour >= 15 && hour < 18;
    const isRushHour = isRushHourMorning || isRushHourAfternoon;

    // Okno czasowe zmieniające się co 60 sekund
    const timeSlot = Math.floor(now.getTime() / 60000);

    let fluidCount = 0;
    let moderateCount = 0;
    let jamCount = 0;
    let blockedCount = 0;
    let totalSpeed = 0;

    const CHUNK_SIZE = 12;

    for (const road of roads) {
      if (!road || !road.coordinates || !Array.isArray(road.coordinates) || road.coordinates.length < 2) {
        continue;
      }

      const coords = road.coordinates;
      const baseSpeedLimit = road.type === 'as' ? 130 : (road.type === 'dk' ? 90 : 60);

      for (let i = 0; i < coords.length - 1; i += CHUNK_SIZE) {
        const segmentCoords = coords.slice(i, i + CHUNK_SIZE + 1);
        if (segmentCoords.length < 2) continue;

        // Pseudolosowy, powtarzalny w danym oknie czasowym hash dla odcinka
        const segmentIdx = Math.floor(i / CHUNK_SIZE);
        const charCode = road.id ? road.id.charCodeAt(0) : 65;
        const hash = Math.abs(
          Math.sin(charCode * 100 + segmentIdx * 37 + timeSlot * 0.1) * 10000
        ) % 1;

        let status: TrafficStatus = 'fluid';
        let speed = baseSpeedLimit;
        let delayMinutes = 0;

        if (road.type === 'city') {
          // W mieście w godzinach szczytu więcej zatorów
          if (isRushHour) {
            if (hash < 0.35) {
              status = 'jam';
              speed = Math.round(baseSpeedLimit * 0.25);
              delayMinutes = Math.round(8 + hash * 12);
            } else if (hash < 0.65) {
              status = 'moderate';
              speed = Math.round(baseSpeedLimit * 0.55);
              delayMinutes = Math.round(3 + hash * 5);
            } else if (hash > 0.96) {
              status = 'blocked';
              speed = 5;
              delayMinutes = 25;
            } else {
              status = 'fluid';
              speed = Math.round(baseSpeedLimit * 0.9);
            }
          } else {
            if (hash < 0.15) {
              status = 'jam';
              speed = Math.round(baseSpeedLimit * 0.3);
              delayMinutes = 6;
            } else if (hash < 0.40) {
              status = 'moderate';
              speed = Math.round(baseSpeedLimit * 0.65);
              delayMinutes = 2;
            } else {
              status = 'fluid';
              speed = Math.round(baseSpeedLimit * 0.95);
            }
          }
        } else if (road.type === 'as') {
          // Autostrady i ekspresówki są zazwyczaj płynne
          if (hash < 0.08) {
            status = 'jam';
            speed = Math.round(baseSpeedLimit * 0.25);
            delayMinutes = 14;
          } else if (hash < 0.22) {
            status = 'moderate';
            speed = Math.round(baseSpeedLimit * 0.6);
            delayMinutes = 5;
          } else if (hash > 0.985) {
            status = 'blocked';
            speed = 0;
            delayMinutes = 35;
          } else {
            status = 'fluid';
            speed = Math.round(baseSpeedLimit * 0.95);
          }
        } else {
          // Drogi krajowe (DK)
          if (hash < 0.12) {
            status = 'jam';
            speed = Math.round(baseSpeedLimit * 0.3);
            delayMinutes = 8;
          } else if (hash < 0.32) {
            status = 'moderate';
            speed = Math.round(baseSpeedLimit * 0.65);
            delayMinutes = 3;
          } else {
            status = 'fluid';
            speed = Math.round(baseSpeedLimit * 0.95);
          }
        }

        if (status === 'fluid') fluidCount++;
        else if (status === 'moderate') moderateCount++;
        else if (status === 'jam') jamCount++;
        else if (status === 'blocked') blockedCount++;

        totalSpeed += speed;

        let desc = 'Płynny ruch pojazdów';
        if (status === 'moderate') desc = 'Spowolnienie ruchu / gęsty potok pojazdów';
        if (status === 'jam') desc = `Zator drogowy - opóźnienie ok. +${delayMinutes} min`;
        if (status === 'blocked') desc = `Droga zablokowana - bardzo duże opóźnienie (+${delayMinutes} min)`;

        segments.push({
          id: `${road.id}_seg_${segmentIdx}`,
          roadId: road.id,
          name: road.name,
          type: road.type,
          status,
          color: STATUS_COLORS[status],
          speed,
          speedLimit: baseSpeedLimit,
          delayMinutes,
          coordinates: segmentCoords,
          description: desc,
          updatedAt: now.toISOString(),
        });
      }
    }

    const totalSegments = segments.length;
    const summary: TrafficSummary = {
      totalSegments,
      fluidCount,
      moderateCount,
      jamCount,
      blockedCount,
      fluidPercent: totalSegments > 0 ? Math.round((fluidCount / totalSegments) * 100) : 100,
      avgSpeedKmh: totalSegments > 0 ? Math.round(totalSpeed / totalSegments) : 80,
    };

    return { segments, summary };
  }

  /**
   * Zwraca dane w formacie GeoJSON FeatureCollection dla MapLibre
   */
  public static getTrafficGeoJSON() {
    const { segments, summary } = this.getTrafficData();

    const features = segments.map((seg) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: seg.coordinates,
      },
      properties: {
        id: seg.id,
        roadId: seg.roadId,
        name: seg.name,
        type: seg.type,
        status: seg.status,
        color: seg.color,
        speed: seg.speed,
        speedLimit: seg.speedLimit,
        delayMinutes: seg.delayMinutes,
        description: seg.description,
      },
    }));

    return {
      type: 'FeatureCollection' as const,
      features,
      summary,
    };
  }
}
