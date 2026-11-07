import { NextResponse } from 'next/server';
import { adapterRegistry } from '@/integrations';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adapters = adapterRegistry.getAllAdapters();
  const sourcesInfo = adapters.map(a => a.getStatusInfo());

  return NextResponse.json({
    success: true,
    sources: sourcesInfo,
    timestamp: new Date().toISOString()
  });
}

