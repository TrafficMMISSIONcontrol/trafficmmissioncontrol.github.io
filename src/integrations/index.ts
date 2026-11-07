import { BaseAdapter } from './base';
import { ImgwAdapter } from './imgw';
import { ImgwHydroAdapter } from './imgw/hydro';
import { ImgwWarningsAdapter } from './imgw/warnings';
import { GiosAdapter } from './gios';
import { OsmCamerasAdapter } from './osm';
import { RoadWorksAdapter } from './roads/works';
import { GddkiaKpdAdapter } from './gddkia';
import { OpenMeteoAdapter } from './openmeteo';

export class AdapterRegistry {
  private static instance: AdapterRegistry;
  private adapters: Map<string, BaseAdapter> = new Map();

  private constructor() {
    this.register(new ImgwAdapter());
    this.register(new ImgwHydroAdapter());
    this.register(new ImgwWarningsAdapter());
    this.register(new GiosAdapter());
    this.register(new OsmCamerasAdapter());
    this.register(new RoadWorksAdapter());
    this.register(new OpenMeteoAdapter());
    this.register(new GddkiaKpdAdapter());
  }

  static getInstance(): AdapterRegistry {
    if (!AdapterRegistry.instance) {
      AdapterRegistry.instance = new AdapterRegistry();
    }
    return AdapterRegistry.instance;
  }

  register(adapter: BaseAdapter) {
    this.adapters.set(adapter.id, adapter);
  }

  getAdapter(id: string): BaseAdapter | undefined {
    return this.adapters.get(id);
  }

  getAllAdapters(): BaseAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const adapterRegistry = AdapterRegistry.getInstance();
