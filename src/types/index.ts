import { z } from 'zod';

export type SourceStatus = 'ACTIVE' | 'DEGRADED' | 'NOT_CONFIGURED' | 'DISABLED';
export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';
export type VerificationStatus = 'CONFIRMED' | 'OFFICIAL_WARNING' | 'SYSTEM_INFERENCE' | 'FORECAST';

export interface DataSourceInfo {
  id: string;
  name: string;
  category: 'roads' | 'weather' | 'environment' | 'alerts' | 'hydrology' | 'transport';
  status: SourceStatus;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  recordsCount?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  updateFrequencySeconds: number;
}

// Zod Schema for Base GeoEvent
export const GeoEventSchema = z.object({
  id: z.string(),
  source: z.string(),
  category: z.enum(['roads', 'weather', 'environment', 'alerts', 'hydrology', 'transport']),
  eventType: z.string(),
  title: z.string(),
  description: z.string().optional(),
  
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  geometryType: z.enum(['Point', 'LineString', 'Polygon']).default('Point'),
  coordinates: z.any().optional(), // GeoJSON coordinates if line or polygon

  observedAt: z.string(),
  fetchedAt: z.string(),
  expiresAt: z.string().optional(),

  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  verificationStatus: z.enum(['CONFIRMED', 'OFFICIAL_WARNING', 'SYSTEM_INFERENCE', 'FORECAST']).default('CONFIRMED'),
  confidence: z.number().min(0).max(1).default(1.0),

  metadata: z.record(z.any()).default({}),
});

export type GeoEvent = z.infer<typeof GeoEventSchema>;

export type TrafficStatus = 'fluid' | 'moderate' | 'jam' | 'blocked';

export interface TrafficSegment {
  id: string;
  roadId: string;
  name: string;
  type: 'as' | 'dk' | 'city';
  status: TrafficStatus;
  color: string;
  speed: number;
  speedLimit: number;
  delayMinutes: number;
  coordinates: [number, number][]; // [lon, lat]
  description?: string;
  updatedAt?: string;
}

export interface TrafficSummary {
  totalSegments: number;
  fluidCount: number;
  moderateCount: number;
  jamCount: number;
  blockedCount: number;
  fluidPercent: number;
  avgSpeedKmh: number;
}

export interface WeatherStationData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  temperature?: number;
  windSpeed?: number;
  windDirection?: number;
  humidity?: number;
  pressure?: number;
  precipitation?: number;
  observedAt: string;
}

export interface AirQualityStationData {
  id: string;
  name: string;
  city: string;
  address?: string;
  latitude: number;
  longitude: number;
  aqiIndex?: string; // np. Bardzo dobry, Dobry, Umiarkowany, Zły
  aqiValue?: number;
  pm10?: number;
  pm25?: number;
  no2?: number;
  o3?: number;
  so2?: number;
  observedAt: string;
}

export interface RoadEventData {
  id: string;
  type: 'speed_camera' | 'avg_speed_check' | 'roadworks' | 'accident' | 'blockage';
  roadNumber?: string;
  title: string;
  speedLimit?: number;
  latitude: number;
  longitude: number;
  path?: [number, number][]; // dla OPP
  observedAt: string;
}

export interface HydrologyData {
  id: string;
  stationName: string;
  riverName: string;
  waterLevelCm: number;
  warningLevelCm?: number;
  alarmLevelCm?: number;
  latitude: number;
  longitude: number;
  observedAt: string;
}

export interface AlertWarning {
  id: string;
  source: string;
  type: 'meteorological' | 'hydrological' | 'rcb' | 'civil';
  title: string;
  message: string;
  level: number;
  latitude?: number;
  longitude?: number;
  validFrom: string;
  validUntil: string;
  polygon?: [number, number][];
}

