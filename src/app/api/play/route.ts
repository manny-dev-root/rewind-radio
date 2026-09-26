import { NextRequest, NextResponse } from 'next/server';
import { recordTrackPlay } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      artist?: string;
      title?: string;
      country?: string;
      year?: number;
      artworkUrl?: string;
    };

    if (!body.artist || !body.title || !body.country || !body.year) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios (artist, title, country, year)' },
        { status: 400 }
      );
    }

    const result = await recordTrackPlay({
      artist: body.artist,
      title: body.title,
      country: body.country,
      year: Number(body.year),
      artworkUrl: body.artworkUrl || null,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al registrar reproducción';
    return NextResponse.json({ error: message, success: false }, { status: 500 });
  }
}
