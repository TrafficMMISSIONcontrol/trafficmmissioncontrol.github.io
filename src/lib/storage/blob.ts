import { put, list } from '@vercel/blob';
import { GeoEvent } from '@/types';

const SNAPSHOT_KEY = 'geodata/latest_snapshot.json';

/**
 * Zapisuje aktualny snapshot zagregowanych danych do Vercel Blob
 */
export async function saveGeoDataSnapshot(events: GeoEvent[]): Promise<string | null> {
  // Sprawdź czy token Vercel Blob jest skonfigurowany
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.log('[Vercel Blob] Brak BLOB_READ_WRITE_TOKEN - pomijam trwały zapis do Blob.');
    return null;
  }

  try {
    const payload = JSON.stringify({
      updatedAt: new Date().toISOString(),
      count: events.length,
      events,
    });

    const blob = await put(SNAPSHOT_KEY, payload, {
      access: 'public',
      addRandomSuffix: false, // Zawsze nadpisuje ten sam klucz, oszczędzając storage
    });

    return blob.url;
  } catch (error) {
    console.error('[Vercel Blob] Błąd zapisu do Blob Storage:', error);
    return null;
  }
}

/**
 * Pobiera ostatni zapisany snapshot danych z Vercel Blob
 */
export async function getLatestGeoDataSnapshot(): Promise<GeoEvent[] | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return null;
  }

  try {
    const { blobs } = await list({ prefix: 'geodata/' });
    const latest = blobs.find((b) => b.pathname === SNAPSHOT_KEY);

    if (!latest) return null;

    const res = await fetch(latest.url, { next: { revalidate: 300 } });
    if (!res.ok) return null;

    const data = await res.json();
    return data.events || null;
  } catch (error) {
    console.error('[Vercel Blob] Błąd odczytu z Blob Storage:', error);
    return null;
  }
}

