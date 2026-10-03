import { YEAR_MIN, YEAR_MAX } from '@/lib/constants';
import { getSeedTracks, SEED_TRACKS } from '@/lib/seed-cache';
import type { TuneResponse, Track } from '@/types';

import arSongs from '@/../public/data/songs/AR.json';
import brSongs from '@/../public/data/songs/BR.json';
import deSongs from '@/../public/data/songs/DE.json';
import frSongs from '@/../public/data/songs/FR.json';
import gbSongs from '@/../public/data/songs/GB.json';
import jpSongs from '@/../public/data/songs/JP.json';
import mxSongs from '@/../public/data/songs/MX.json';
import usSongs from '@/../public/data/songs/US.json';

const COUNTRY_CATALOGS: Record<string, Record<string, [string, string][]>> = {
  AR: arSongs as unknown as Record<string, [string, string][]>,
  BR: brSongs as unknown as Record<string, [string, string][]>,
  DE: deSongs as unknown as Record<string, [string, string][]>,
  FR: frSongs as unknown as Record<string, [string, string][]>,
  GB: gbSongs as unknown as Record<string, [string, string][]>,
  JP: jpSongs as unknown as Record<string, [string, string][]>,
  MX: mxSongs as unknown as Record<string, [string, string][]>,
  US: usSongs as unknown as Record<string, [string, string][]>,
};

// Runtime in-memory cache para evitar llamadas redundantes a APIs externas
const memoryCache = new Map<string, TuneResponse>();

function cleanSongTitle(title: string): string {
  return title
    .replace(/\s*[\(\[\{].*?[\)\]\}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadCountryRawData(countryCode: string): Record<string, [string, string][]> {
  const code = countryCode.toUpperCase();
  return COUNTRY_CATALOGS[code] || COUNTRY_CATALOGS['US'] || {};
}

async function searchTrackPreview(
  artist: string,
  title: string
): Promise<{ previewUrl: string; artworkUrl: string | null } | null> {
  const clean = cleanSongTitle(title);
  try {
    // 1. Intento principal: Artista + Título limpio
    let res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(`${artist} ${clean}`)}&limit=1`
    );
    let data = (await res.json()) as {
      data?: Array<{ preview?: string; album?: { cover_big?: string } }>;
    };
    let item = data.data?.[0];

    // 2. Fallback: solo título limpio si la primera búsqueda no trajo preview
    if (!item?.preview && clean.length > 2) {
      res = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(clean)}&limit=1`
      );
      data = (await res.json()) as {
        data?: Array<{ preview?: string; album?: { cover_big?: string } }>;
      };
      item = data.data?.[0];
    }

    if (item?.preview) {
      return {
        previewUrl: item.preview,
        artworkUrl: item.album?.cover_big || null,
      };
    }
  } catch {}
  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawYear = searchParams.get('year');
    const countryCode = searchParams.get('country')?.trim().toUpperCase() ?? '';
    const targetTitle = searchParams.get('targetTitle')?.trim().toLowerCase() ?? '';
    const targetArtist = searchParams.get('targetArtist')?.trim().toLowerCase() ?? '';
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

    const cacheKey = `${countryCode}-${yearNum}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      // Si se solicitó una canción objetivo del ranking, ubicarla en posición 0
      let responseData = cached;
      if (targetTitle && cached.playlist && cached.playlist.length > 0) {
        const playlist = cached.playlist;
        const foundIdx = playlist.findIndex((t) => {
          const tNorm = cleanSongTitle(t.title).toLowerCase();
          return tNorm.includes(targetTitle) || targetTitle.includes(tNorm);
        });
        if (foundIdx > 0) {
          const match = playlist[foundIdx];
          responseData = {
            ...cached,
            track: match,
            playlist: [match, ...playlist.filter((_, i) => i !== foundIdx)],
          };
        }
      }

      return Response.json(responseData, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      });
    }

    // 1. Cargar el JSON del país
    const countryData = await loadCountryRawData(countryCode);
    let hits = countryData[String(yearNum)] || [];

    if (hits.length === 0) {
      const availableYears = Object.keys(countryData)
        .map(Number)
        .filter((y) => !isNaN(y) && countryData[String(y)]?.length > 0);
      if (availableYears.length > 0) {
        availableYears.sort((a, b) => Math.abs(a - yearNum) - Math.abs(b - yearNum));
        hits = countryData[String(availableYears[0])] || [];
      }
    }

    // Si no hay datos en el JSON del país, recurrir a los seed tracks
    if (hits.length === 0) {
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
    }

    // 2. Tomar las 10 canciones del año
    const targetHits = hits.slice(0, 10);

    // 3. Resolver en paralelo en el servidor (sin problemas de CORS ni rate limits)
    const seenUrls = new Set<string>();
    const resolvedPromises = targetHits.map(async ([artist, title]) => {
      const res = await searchTrackPreview(artist, title);
      if (res?.previewUrl && !seenUrls.has(res.previewUrl)) {
        seenUrls.add(res.previewUrl);
        return {
          title,
          artist,
          previewUrl: res.previewUrl,
          artworkUrl: res.artworkUrl,
          releaseYear: String(yearNum),
        } as Track;
      }
      return null;
    });

    const settled = await Promise.all(resolvedPromises);
    const validPlaylist = settled.filter((t): t is Track => t !== null);

    // Si fallaran todas las búsquedas de red, usar seed cache
    const finalPlaylist = validPlaylist.length > 0 ? validPlaylist : (getSeedTracks(countryCode, yearNum) || []);

    const primaryTrack: Track = finalPlaylist[0] || {
      title: 'SIN DATOS PARA ESTE AÑO',
      artist: '',
      previewUrl: null,
      artworkUrl: null,
      releaseYear: String(yearNum),
    };

    const data: TuneResponse = {
      track: primaryTrack,
      playlist: finalPlaylist,
      source: 'api',
    };

    // Guardar en caché de memoria
    memoryCache.set(cacheKey, data);

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
