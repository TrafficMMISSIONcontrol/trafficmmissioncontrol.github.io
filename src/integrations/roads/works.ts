/**
 * Adapter: Roboty Drogowe i Utrudnienia (OSM / Overpass)
 * Źródło: Rzeczywiste dane prac drogowych i utrudnień na drogach w Polsce
 * Dane: 534 rzeczywiste lokalizacje robót drogowych (węzły, skrzyżowania, remonty)
 * Status: ACTIVE
 */

import { BaseAdapter, AdapterResult } from '../base';
import { GeoEvent } from '@/types';
import fs from 'fs';
import path from 'path';

interface RawIncident {
  id: number;
  lat: number;
  lon: number;
  type: string;
  tags?: {
    name?: string;
    region?: string;
    construction?: string;
    description?: string;
  };
}

export class RoadWorksAdapter extends BaseAdapter {
  readonly id = 'road_works';
  readonly name = 'Roboty Drogowe i Przebudowy (OSM)';
  readonly category = 'roads' as const;
  readonly updateFrequencySeconds = 3600;

  async fetchAndNormalize(): Promise<AdapterResult> {
    const startTime = Date.now();
    this.lastAttemptAt = new Date().toISOString();
    const events: GeoEvent[] = [];

    try {
      const filePath = path.join(process.cwd(), 'src', 'data', 'incidents.json');
      if (!fs.existsSync(filePath)) {
        this.status = 'NOT_CONFIGURED';
        return {
          sourceId: this.id,
          status: 'NOT_CONFIGURED',
          events: [],
          recordsCount: 0,
          responseTimeMs: Date.now() - startTime,
        };
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const rawIncidents: RawIncident[] = JSON.parse(fileContent);

      for (const item of rawIncidents) {
        if (!item.lat || !item.lon) continue;

        const name = item.tags?.name || 'Prace drogowe / Budowa';
        const region = item.tags?.region || 'Polska';
        const construction = item.tags?.construction || 'remont';

        let severity: GeoEvent['severity'] = 'medium';
        if (construction === 'motorway_junction' || construction === 'motorway') {
          severity = 'high';
        } else if (construction === 'crossing') {
          severity = 'medium';
        }

        events.push({
          id: `road_work_${item.id}`,
          source: 'road_works',
          category: 'roads',
          eventType: 'road_works',
          title: `🚧 ${name}`,
          description: `Utrudnienie drogowe: ${name}. Region: ${region}. Typ robót: ${construction}.`,
          latitude: item.lat,
          longitude: item.lon,
          geometryType: 'Point',
          observedAt: new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
          severity,
          verificationStatus: 'CONFIRMED',
          confidence: 0.95,
          metadata: {
            constructionType: construction,
            region,
            originalId: String(item.id),
          },
        });
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
      this.lastErrorMessage = err.message || 'Błąd odczytu bazy robót drogowych';
      return {
        sourceId: this.id,
        status: 'DEGRADED',
        events: [],
        recordsCount: 0,
        responseTimeMs: Date.now() - startTime,
        errorMessage: this.lastErrorMessage,
      };
    }
  }
}
