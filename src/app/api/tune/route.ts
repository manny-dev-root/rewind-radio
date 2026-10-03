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

function isUrlExpired(url: string | null): boolean {
  if (!url) return false;
  if (!url.includes('hdnea=')) return false; // Las URLs de iTunes son permanentes y nunca expiran
  const match = url.match(/exp=(\d+)/);
  if (!match) return false;
  const expSec = parseInt(match[1], 10);
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec >= expSec - 90; // Expira en menos de 90 segundos o ya expiró
}

function getCacheControlHeader(_playlist?: Track[]): string {
  return 'no-cache, no-store, must-revalidate';
}

function loadCountryRawData(countryCode: string): Record<string, [string, string][]> {
  const code = countryCode.toUpperCase();
  return COUNTRY_CATALOGS[code] || COUNTRY_CATALOGS['US'] || {};
}

async function searchTrackPreview(
  artist: string,
  title: string
): Promise<{
  previewUrl: string;
  artworkUrl: string | null;
  title?: string;
  artist?: string;
} | null> {
  const clean = cleanSongTitle(title);

  // 1. Intento principal: iTunes Search API (Devuelve URLs permanentes de Apple CDN que NUNCA expiran y con soporte CORS total)
  try {
    const itunesRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${clean}`)}&media=music&entity=song&limit=1`,
      { headers: { 'User-Agent': 'EraTuner/1.0' } }
    );
    if (itunesRes.ok) {
      const itunesData = (await itunesRes.json()) as {
        results?: Array<{
          trackName?: string;
          artistName?: string;
          previewUrl?: string;
          artworkUrl100?: string;
        }>;
      };
      const item = itunesData.results?.[0];
      if (item?.previewUrl) {
        return {
          previewUrl: item.previewUrl,
          artworkUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100', '600x600') : null,
          title: item.trackName || title,
          artist: item.artistName || artist,
        };
      }
    }
  } catch {}

  // 2. Fallback: Deezer (en caso de que iTunes no tenga el tema)
  try {
    let res = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(`${artist} ${clean}`)}&limit=1`
    );
    let data = (await res.json()) as {
      data?: Array<{
        title?: string;
        artist?: { name?: string };
        preview?: string;
        album?: { cover_big?: string };
      }>;
    };
    let item = data.data?.[0];

    // Fallback: solo título limpio si la primera búsqueda no trajo preview
    if (!item?.preview && clean.length > 2) {
      res = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(clean)}&limit=1`
      );
      data = (await res.json()) as {
        data?: Array<{
          title?: string;
          artist?: { name?: string };
          preview?: string;
          album?: { cover_big?: string };
        }>;
      };
      item = data.data?.[0];
    }

    if (item?.preview) {
      return {
        previewUrl: item.preview,
        artworkUrl: item.album?.cover_big || null,
        title: item.title,
        artist: item.artist?.name,
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
    const rawTargetTitle = searchParams.get('targetTitle')?.trim() ?? '';
    const rawTargetArtist = searchParams.get('targetArtist')?.trim() ?? '';
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
    let cached = memoryCache.get(cacheKey);

    // Si algún tema en caché tiene una URL con token expirado (ej. token temporal de Deezer de 15m), invalidar caché para renovarlo
    if (cached?.playlist && cached.playlist.some((t) => isUrlExpired(t.previewUrl))) {
      memoryCache.delete(cacheKey);
      cached = undefined;
    }

    if (!cached) {
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

        cached = {
          track: primaryTrack,
          playlist: seedTracks,
          source: 'seed-cache',
        };
      } else {
        // 2. Tomar las 10 canciones del año
        const targetHits = hits.slice(0, 10);

        // 3. Resolver en paralelo en el servidor (sin problemas de CORS ni rate limits)
        const seenUrls = new Set<string>();
        const resolvedPromises = targetHits.map(async ([artist, title]) => {
          const res = await searchTrackPreview(artist, title);
          if (res?.previewUrl && !seenUrls.has(res.previewUrl)) {
            seenUrls.add(res.previewUrl);
            return {
              title: res.title || title,
              artist: res.artist || artist,
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
        const finalPlaylist =
          validPlaylist.length > 0 ? validPlaylist : (getSeedTracks(countryCode, yearNum) || []);

        const primaryTrack: Track = finalPlaylist[0] || {
          title: 'SIN DATOS PARA ESTE AÑO',
          artist: '',
          previewUrl: null,
          artworkUrl: null,
          releaseYear: String(yearNum),
        };

        cached = {
          track: primaryTrack,
          playlist: finalPlaylist,
          source: 'api',
        };
      }

      // Guardar en caché de memoria la lista canónica
      memoryCache.set(cacheKey, cached);
    }

    // Si se solicitó una canción objetivo (por ejemplo al hacer click en el ranking):
    if (rawTargetTitle && cached.playlist && cached.playlist.length > 0) {
      const playlist = cached.playlist;
      const targetTitleClean = cleanSongTitle(rawTargetTitle).toLowerCase();
      const targetArtistClean = rawTargetArtist.toLowerCase();

      // 1. Buscar si la canción ya existe dentro de la playlist
      const foundIdx = playlist.findIndex((t) => {
        const tTitle = cleanSongTitle(t.title).toLowerCase();
        const tArtist = t.artist.toLowerCase();
        const titleMatch =
          tTitle === targetTitleClean ||
          tTitle.includes(targetTitleClean) ||
          targetTitleClean.includes(tTitle);
        const artistMatch =
          !targetArtistClean ||
          tArtist.includes(targetArtistClean) ||
          targetArtistClean.includes(tArtist);
        return titleMatch && (artistMatch || targetTitleClean.length > 5);
      });

      if (foundIdx === 0) {
        return Response.json(cached, {
          headers: {
            'Cache-Control': getCacheControlHeader(cached.playlist),
          },
        });
      }

      if (foundIdx > 0) {
        const match = playlist[foundIdx];
        const reordered = [match, ...playlist.filter((_, i) => i !== foundIdx)];
        return Response.json(
          {
            ...cached,
            track: match,
            playlist: reordered,
          },
          {
            headers: {
              'Cache-Control': getCacheControlHeader(reordered),
            },
          }
        );
      }

      // 2. Si NO está en la playlist del año (ej. Sweet Child O' Mine en 1987),
      // resolver la canción objetivo al instante (iTunes -> Deezer):
      const targetPreview = await searchTrackPreview(rawTargetArtist, rawTargetTitle);
      const injectedTrack: Track = {
        title: targetPreview?.title || rawTargetTitle,
        artist: targetPreview?.artist || rawTargetArtist,
        previewUrl: targetPreview?.previewUrl ?? null,
        artworkUrl: targetPreview?.artworkUrl ?? null,
        releaseYear: String(yearNum),
      };

      const customPlaylist = [
        injectedTrack,
        ...playlist
          .filter((t) => cleanSongTitle(t.title).toLowerCase() !== targetTitleClean)
          .slice(0, 9),
      ];

      return Response.json(
        {
          ...cached,
          track: injectedTrack,
          playlist: customPlaylist,
        },
        {
          headers: {
            'Cache-Control': getCacheControlHeader(customPlaylist),
          },
        }
      );
    }

    return Response.json(cached, {
      headers: {
        'Cache-Control': getCacheControlHeader(cached.playlist),
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
