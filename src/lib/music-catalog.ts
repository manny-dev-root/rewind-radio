import type { Track, TuneResponse, EraHit } from '@/types';
import { getSeedTracks } from '@/lib/seed-cache';

// Cache en memoria para archivos JSON de países (evita descargar el archivo más de una vez)
const countryDataCache = new Map<string, Record<string, [string, string][]>>();

// Cache en memoria para canciones resueltas (evita llamadas de red redundantes)
const trackPreviewCache = new Map<string, Track>();

/**
 * Carga de forma diferida el archivo JSON del país desde /data/songs/[country].json
 */
async function loadCountrySongs(
  countryCode: string,
  signal?: AbortSignal
): Promise<Record<string, [string, string][]>> {
  const code = countryCode.toUpperCase();
  const cached = countryDataCache.get(code);
  if (cached) return cached;

  try {
    const res = await fetch(`/data/songs/${code}.json`, { signal });
    if (!res.ok) {
      // Fallback a US si el país no existe aún
      if (code !== 'US') return loadCountrySongs('US', signal);
      return {};
    }
    const data = (await res.json()) as Record<string, [string, string][]>;
    countryDataCache.set(code, data);
    return data;
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') throw err;
    return {};
  }
}

/**
 * Obtiene las canciones para un año específico. Si un año puntual aún no está cargado
 * en el archivo del país, busca automáticamente el año disponible más cercano.
 */
function getSongsForYear(
  countryData: Record<string, [string, string][]>,
  targetYear: number
): EraHit[] {
  const exact = countryData[String(targetYear)];
  if (exact && exact.length > 0) {
    return exact.map(([artist, title]) => ({ artist, title, year: targetYear }));
  }

  const availableYears = Object.keys(countryData)
    .map(Number)
    .filter((y) => !isNaN(y) && countryData[String(y)]?.length > 0);

  if (availableYears.length === 0) return [];

  // Ordenar por cercanía matemática al año sintonizado
  availableYears.sort((a, b) => Math.abs(a - targetYear) - Math.abs(b - targetYear));
  const closestYear = availableYears[0];
  const list = countryData[String(closestYear)] || [];

  return list.map(([artist, title]) => ({ artist, title, year: closestYear }));
}

/**
 * Limpia el título quitando aclaraciones entre paréntesis o corchetes
 * para maximizar la tasa de coincidencia en el buscador de Apple Music.
 */
function cleanSongTitle(title: string): string {
  return title
    .replace(/\s*[\(\[\{].*?[\)\]\}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Consulta a la API de iTunes para un término específico.
 */
async function queryItunes(
  query: string,
  countryCode?: string,
  signal?: AbortSignal
): Promise<{ previewUrl?: string; artworkUrl100?: string; trackName?: string; artistName?: string } | null> {
  const countryParam = countryCode ? `&country=${countryCode}` : '';
  const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}${countryParam}&media=music&entity=song&limit=1`;

  try {
    const res = await fetch(itunesUrl, { signal });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      results?: Array<{
        previewUrl?: string;
        artworkUrl100?: string;
        trackName?: string;
        artistName?: string;
      }>;
    };

    const item = data.results?.[0];
    return item?.previewUrl ? item : null;
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') {
      throw err;
    }
    return null;
  }
}

/**
 * Resuelve una canción histórica específica consultando iTunes directamente
 * desde el navegador (CORS libre, IP residencial sin bloqueos 429).
 */
async function resolveEraTrack(
  hit: EraHit,
  countryCode: string,
  signal?: AbortSignal
): Promise<Track | null> {
  const cacheKey = `${countryCode}:${hit.artist.toLowerCase()}:::${hit.title.toLowerCase()}`;
  const cached = trackPreviewCache.get(cacheKey);
  if (cached) return cached;

  // 1. Intento principal: Artista + Título exacto en el catálogo del país
  let item = await queryItunes(`${hit.artist} ${hit.title}`, countryCode, signal);

  // 2. Si falló (común con paréntesis como "(El momento en que estás)"), probar con título limpio
  const cleanedTitle = cleanSongTitle(hit.title);
  if (!item && cleanedTitle !== hit.title) {
    item = await queryItunes(`${hit.artist} ${cleanedTitle}`, countryCode, signal);
  }

  // 3. Si aún no aparece, buscar en el catálogo global de Apple Music (sin restricción de país)
  if (!item) {
    item = await queryItunes(`${hit.artist} ${cleanedTitle}`, undefined, signal);
  }

  if (!item || !item.previewUrl) return null;

  const track: Track = {
    title: hit.title,
    artist: hit.artist,
    previewUrl: item.previewUrl,
    artworkUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100', '600x600') : null,
    releaseYear: String(hit.year),
  };

  trackPreviewCache.set(cacheKey, track);
  return track;
}

/**
 * Obtiene la playlist histórica curada para un país y año.
 * Carga el JSON del país (ej: /data/songs/AR.json) y resuelve hasta 15 canciones en paralelo.
 */
export async function fetchCuratedTracks(
  countryCode: string,
  year: number,
  signal?: AbortSignal
): Promise<TuneResponse> {
  const countryData = await loadCountrySongs(countryCode, signal);
  const hits = getSongsForYear(countryData, year);

  if (hits.length === 0) {
    const seed = getSeedTracks(countryCode, year) || [];
    return {
      track: seed[0] || {
        title: 'SIN DATOS PARA ESTE AÑO',
        artist: '',
        previewUrl: null,
        artworkUrl: null,
        releaseYear: String(year),
      },
      playlist: seed,
      source: 'seed-cache',
    };
  }

  // Tomamos hasta 15 canciones del año
  const targetHits = hits.slice(0, 15);

  // Consultar en paralelo
  const settled = await Promise.allSettled(
    targetHits.map((hit) => resolveEraTrack(hit, countryCode, signal))
  );

  const playlist: Track[] = [];
  for (const item of settled) {
    if (item.status === 'fulfilled' && item.value && item.value.previewUrl) {
      playlist.push(item.value);
    }
  }

  // Si todas fallan o el usuario está offline, usar Seed Cache
  if (playlist.length === 0) {
    const seed = getSeedTracks(countryCode, year) || [];
    if (seed.length > 0) {
      return {
        track: seed[0],
        playlist: seed,
        source: 'seed-cache',
      };
    }
  }

  const primaryTrack: Track = playlist[0] || {
    title: 'SIN DATOS PARA ESTE AÑO',
    artist: '',
    previewUrl: null,
    artworkUrl: null,
    releaseYear: String(year),
  };

  return {
    track: primaryTrack,
    playlist,
    source: 'api',
  };
}
