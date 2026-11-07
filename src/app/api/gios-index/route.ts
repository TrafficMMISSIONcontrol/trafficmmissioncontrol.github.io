import { NextRequest, NextResponse } from 'next/server';
import { GiosAdapter } from '@/integrations/gios';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get('stationId');

  if (!stationId) {
    return NextResponse.json({ error: 'Wymagany parametr stationId' }, { status: 400 });
  }

  const gios = new GiosAdapter();
  const data = await gios.fetchStationIndex(parseInt(stationId, 10));

  return NextResponse.json({
    success: true,
    data
  });
}

