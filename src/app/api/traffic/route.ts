import { NextResponse } from 'next/server';
import { TrafficService } from '@/lib/traffic/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = TrafficService.getTrafficGeoJSON();
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Błąd pobierania natężenia ruchu:', error);
    return NextResponse.json(
      { success: false, error: 'Nie udało się pobrać danych o ruchu' },
      { status: 500 }
    );
  }
}

