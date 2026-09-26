import { YEAR_MIN, YEAR_MAX } from '@/lib/constants';
import { getSeedTracks } from '@/lib/seed-cache';
import type { TuneResponse, Track } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawYear = searchParams.get('year');
    const countryCode = searchParams.get('country')?.trim().toUpperCase() ?? '';
    const yearNum = Number(rawYear);

    if (!rawYear || isNaN(yearNum) || yearNum < YEAR_MIN || yearNum > YEAR_MAX) {
      return Response.json(
        { error: `El año debe estar entre ${YEAR_MIN} y ${YEAR_MAX}` },
        { status: 400 }
      );
    }
    if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
      return Response.json(
        { error: 'El país debe ser un código ISO de 2 letras' },
        { status: 400 }
      );
    }

    const seedTracks = getSeedTracks(countryCode, yearNum) || [];
    const primaryTrack: Track = seedTracks[0] || {
      title: 'SIN DATOS PARA ESTE AÑO',
      artist: '',
      previewUrl: null,
      artworkUrl: null,
      releaseYear: String(yearNum),
    };

    const data: TuneResponse = {
      track: primaryTrack,
      playlist: seedTracks,
      source: 'seed-cache',
    };

    return Response.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error de sintonización';
    return Response.json(
      {
        error: message,
        track: {
          title: 'SIN DATOS PARA ESTE AÑO',
          artist: '',
          previewUrl: null,
          artworkUrl: null,
        },
        playlist: [],
      },
      { status: 500 }
    );
  }
}
