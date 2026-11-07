import { NextRequest, NextResponse } from 'next/server';
import { saveGeoDataSnapshot, getLatestGeoDataSnapshot } from '@/lib/storage/blob';
import { adapterRegistry } from '@/integrations';
import { GeoEvent } from '@/types';

export const dynamic = 'force-dynamic';

// GET: pobiera ostatni snapshot z Vercel Blob
export async function GET() {
  const snapshot = await getLatestGeoDataSnapshot();
  if (!snapshot) {
    return NextResponse.json({
      success: false,
      message: 'Brak zapisanego snapshotu lub brak skonfigurowanego Vercel Blob (BLOB_READ_WRITE_TOKEN)',
    });
  }

  return NextResponse.json({
    success: true,
    count: snapshot.length,
    events: snapshot,
  });
}

// POST: wymusza agregację ze wszystkich adapterów i zapisuje stan do Vercel Blob
export async function POST() {
  const adapters = adapterRegistry.getAllAdapters();
  const results = await Promise.allSettled(adapters.map((a) => a.fetchAndNormalize()));

  const allEvents: GeoEvent[] = [];
  for (const res of results) {
    if (res.status === 'fulfilled' && res.value.status === 'ACTIVE') {
      allEvents.push(...res.value.events);
    }
  }

  const blobUrl = await saveGeoDataSnapshot(allEvents);

  return NextResponse.json({
    success: true,
    recordsSaved: allEvents.length,
    blobUrl,
    timestamp: new Date().toISOString(),
  });
}

