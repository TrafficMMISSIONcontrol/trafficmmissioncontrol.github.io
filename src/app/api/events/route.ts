import { NextRequest, NextResponse } from 'next/server';
import { adapterRegistry } from '@/integrations';
import { GeoEvent } from '@/types';
import { analyzeCorrelations } from '@/lib/analytics/correlation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryFilter = searchParams.get('category'); // np. roads, weather, environment
    const includeInferred = searchParams.get('inferred') !== 'false';

    const adapters = adapterRegistry.getAllAdapters();
    const results = await Promise.allSettled(adapters.map(a => a.fetchAndNormalize()));

    let allEvents: GeoEvent[] = [];

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value.status === 'ACTIVE') {
        allEvents.push(...res.value.events);
      }
    }

    if (categoryFilter) {
      allEvents = allEvents.filter(e => e.category === categoryFilter);
    }

    // Dodaj wnioski systemu z korelacji jeśli wybrano
    let inferred: any[] = [];
    if (includeInferred) {
      inferred = analyzeCorrelations(allEvents);
    }

    return NextResponse.json({
      success: true,
      totalCount: allEvents.length,
      inferredCount: inferred.length,
      events: allEvents,
      inferredThreats: inferred,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Błąd serwera agregacji danych' },
      { status: 500 }
    );
  }
}

