import { BaseAdapter, AdapterResult } from '../base';

export class GddkiaKpdAdapter extends BaseAdapter {
  readonly id = 'gddkia_kpd';
  readonly name = 'Krajowy Punkt Dostępowy / GDDKiA (Datex II)';
  readonly category = 'roads' as const;
  readonly updateFrequencySeconds = 300;

  constructor() {
    super();
    this.status = 'NOT_CONFIGURED';
  }

  async fetchAndNormalize(): Promise<AdapterResult> {
    this.lastAttemptAt = new Date().toISOString();
    this.lastErrorMessage = 'Źródło wymaga rejestracji w Krajowym Punkcie Dostępowym (KPD) oraz dedykowanego klucza subskrypcji strumienia DATEX II.';

    return {
      sourceId: this.id,
      status: 'NOT_CONFIGURED',
      events: [],
      recordsCount: 0,
      responseTimeMs: 0,
      errorMessage: this.lastErrorMessage,
      metadata: {
        protocol: 'DATEX II / SOAP XML',
        kpdPortal: 'https://kpd.gddkia.gov.pl',
        documentation: 'https://kpd.gddkia.gov.pl/regulamin-kpd'
      }
    };
  }
}

