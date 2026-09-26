import { NextRequest, NextResponse } from 'next/server';
import { getTopRankedTracks } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const country = searchParams.get('country') || undefined;
    const limit = Number(searchParams.get('limit')) || 10;

    const ranking = await getTopRankedTracks(country, limit);

    return NextResponse.json(
      { ranking },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al obtener ranking';
    return NextResponse.json({ error: message, ranking: [] }, { status: 500 });
  }
}
