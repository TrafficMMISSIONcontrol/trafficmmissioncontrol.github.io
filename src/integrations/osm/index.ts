import { BaseAdapter, AdapterResult } from '../base';
import { GeoEvent } from '@/types';
import rawCamerasData from '@/data/cameras.json';

interface OsmCameraRaw {
  id: number;
  lat: number;
  lon: number;
  path?: any;
  isMulti?: boolean;
  typeStr?: string;
  tags?: Record<string, string>;
}

export class OsmCamerasAdapter extends BaseAdapter {
  readonly id = 'osm_overpass';
  readonly name = 'OpenStreetMap & CANARD - Fotoradary i OPP';
  readonly category = 'roads' as const;
  readonly updateFrequencySeconds = 86400; // Dane infrastruktury drogowej (radary)

  async fetchAndNormalize(): Promise<AdapterResult> {
    const startTime = Date.now();
    this.lastAttemptAt = new Date().toISOString();

    try {
      const rawData = rawCamerasData as OsmCameraRaw[];
      const events: GeoEvent[] = [];

      for (const item of rawData) {
        if (!item.lat || !item.lon) continue;

        const isOpp = item.typeStr === 'opp' || (item.tags && item.tags.enforcement === 'average_speed');
        const speedLimit = item.tags?.maxspeed ? parseInt(item.tags.maxspeed, 10) : undefined;
        const title = isOpp ? 'Odcinkowy Pomiar Prędkości (OPP)' : 'Fotoradar stacjonarny';

        // Konwersja koordynatów ścieżki OPP [lat, lon] -> GeoJSON [lon, lat]
        let geoJsonCoords: any = undefined;
        let geometryType: 'Point' | 'LineString' = 'Point';

        if (isOpp && item.path && Array.isArray(item.path)) {
          if (item.isMulti) {
            // Jeśli tablica wielu linii, bierzemy punkty i łączymy
            const flat = item.path.flat();
            if (flat.length > 1) {
              geoJsonCoords = flat.map((pt: any) => [pt[1], pt[0]]);
              geometryType = 'LineString';
            }
          } else if (item.path.length > 1) {
            geoJsonCoords = item.path.map((pt: any) => [pt[1], pt[0]]);
            geometryType = 'LineString';
          }
        }

        events.push({
          id: `osm_cam_${item.id}`,
          source: this.id,
          category: 'roads',
          eventType: isOpp ? 'avg_speed_check' : 'speed_camera',
          title: speedLimit ? `${title} (${speedLimit} km/h)` : title,
          description: `Zarejestrowany punkt kontroli drogowej CANARD / OSM (ID: ${item.id})`,
          latitude: item.lat,
          longitude: item.lon,
          geometryType,
          coordinates: geoJsonCoords,
          observedAt: new Date().toISOString(),
          fetchedAt: new Date().toISOString(),
          severity: isOpp ? 'high' : 'medium',
          verificationStatus: 'CONFIRMED',
          confidence: 1.0,
          metadata: {
            osmId: item.id,
            speedLimit: isNaN(speedLimit as number) ? null : speedLimit,
            road: item.tags?.ref || item.tags?.name || null,
            isMulti: item.isMulti || false
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
      this.lastErrorMessage = err.message || 'Błąd odczytu bazy fotoradarów';
      return {
        sourceId: this.id,
        status: 'DEGRADED',
        events: [],
        recordsCount: 0,
        responseTimeMs: Date.now() - startTime,
        errorMessage: this.lastErrorMessage
      };
    }
  }
}

