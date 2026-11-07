import { DataSourceInfo, GeoEvent, SourceStatus } from '@/types';

export interface AdapterResult {
  sourceId: string;
  status: SourceStatus;
  events: GeoEvent[];
  responseTimeMs: number;
  recordsCount: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export abstract class BaseAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly category: DataSourceInfo['category'];
  abstract readonly updateFrequencySeconds: number;

  protected status: SourceStatus = 'NOT_CONFIGURED';
  protected lastSuccessAt?: string;
  protected lastAttemptAt?: string;
  protected lastErrorMessage?: string;

  getStatusInfo(): DataSourceInfo {
    return {
      id: this.id,
      name: this.name,
      category: this.category,
      status: this.status,
      lastAttemptAt: this.lastAttemptAt,
      lastSuccessAt: this.lastSuccessAt,
      errorMessage: this.lastErrorMessage,
      updateFrequencySeconds: this.updateFrequencySeconds,
    };
  }

  abstract fetchAndNormalize(): Promise<AdapterResult>;
}

