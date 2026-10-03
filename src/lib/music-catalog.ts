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

function shuffleList<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Obtiene las canciones para un año específico. Si un año puntual aún no está cargado
 * en el archivo del país, busca automáticamente el año disponible más cercano.
 * El orden se aleatoriza para una experiencia fresca en cada sintonización.
 */
function getSongsForYear(
  countryData: Record<string, [string, string][]>,
  targetYear: number
): EraHit[] {
  let list: [string, string][] = [];
  let yearUsed = targetYear;

  const exact = countryData[String(targetYear)];
  if (exact && exact.length > 0) {
    list = exact;
  } else {
    const availableYears = Object.keys(countryData)
      .map(Number)
      .filter((y) => !isNaN(y) && countryData[String(y)]?.length > 0);

    if (availableYears.length === 0) return [];

    // Ordenar por cercanía matemática al año sintonizado
    availableYears.sort((a, b) => Math.abs(a - targetYear) - Math.abs(b - targetYear));
    yearUsed = availableYears[0];
    list = countryData[String(yearUsed)] || [];
  }

  // Mantener el orden canónico del ranking del año (top 10)
  return list.map(([artist, title]) => ({ artist, title, year: yearUsed }));
}

/**
 * Limpia el título quitando aclaraciones entre paréntesis o corchetes
 * para maximizar la tasa de coincidencia en el buscador de Apple Music.
 */
export function cleanSongTitle(title: string): string {
  return title
    .replace(/\s*[\(\[\{].*?[\)\]\}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Consulta a la API de iTunes para un término específico buscando hasta 5 resultados
 * para maximizar la probabilidad de encontrar uno con previewUrl funcional.
 */
async function queryItunes(
  query: string,
  countryCode?: string,
  signal?: AbortSignal
): Promise<{
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
  trackName?: string;
  artistName?: string;
} | null> {
  const countryParam = countryCode ? `&country=${countryCode}` : '';
  const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}${countryParam}&media=music&entity=song&limit=5`;

  try {
    const res = await fetch(itunesUrl, { signal });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      results?: Array<{
        previewUrl?: string;
        artworkUrl100?: string;
        trackViewUrl?: string;
        trackName?: string;
        artistName?: string;
      }>;
    };

    const items = data.results || [];
    const item = items.find((it) => Boolean(it.previewUrl));
    return item?.previewUrl ? item : null;
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') {
      throw err;
    }
    return null;
  }
}

/**
 * Resuelve una canción histórica consultando iTunes con múltiples niveles de búsqueda.
 */
async function resolveEraTrack(
  hit: EraHit,
  countryCode: string,
  signal?: AbortSignal
): Promise<Track | null> {
  const cacheKey = `${countryCode}:${hit.artist.toLowerCase()}:::${hit.title.toLowerCase()}`;
  const cached = trackPreviewCache.get(cacheKey);
  if (cached) return cached;

  const cleanedTitle = cleanSongTitle(hit.title);

  // 1. Intento principal: Artista + Título limpio en el catálogo global de Apple Music
  let item = await queryItunes(`${hit.artist} ${cleanedTitle}`, undefined, signal);

  // 2. Si no apareció, intentar con el título original completo en catálogo global
  if (!item && cleanedTitle !== hit.title) {
    item = await queryItunes(`${hit.artist} ${hit.title}`, undefined, signal);
  }

  // 3. Si no apareció, probar en el catálogo específico del país
  if (!item) {
    item = await queryItunes(`${hit.artist} ${cleanedTitle}`, countryCode, signal);
  }

  // 4. Último intento: solo título limpio global (si el artista tenía ortografía diferente)
  if (!item) {
    item = await queryItunes(cleanedTitle, undefined, signal);
  }

  if (!item || !item.previewUrl) return null;

  const track: Track = {
    title: hit.title,
    artist: hit.artist,
    previewUrl: item.previewUrl,
    artworkUrl: item.artworkUrl100 ? item.artworkUrl100.replace('100x100', '600x600') : null,
    releaseYear: String(hit.year),
    trackViewUrl: item.trackViewUrl || null,
  };

  trackPreviewCache.set(cacheKey, track);
  return track;
}

/**
 * Obtiene la playlist histórica curada para un país y año.
 * Garantiza que cada canción tenga su propio audio único y nunca se repita la misma canción.
 */
export async function fetchCuratedTracks(
  countryCode: string,
  year: number,
  signal?: AbortSignal,
  target?: { title: string; artist: string } | null
): Promise<TuneResponse> {
  const code = countryCode.toUpperCase();
  try {
    const targetParams = target
      ? `&targetTitle=${encodeURIComponent(target.title)}&targetArtist=${encodeURIComponent(target.artist)}`
      : '';
    const res = await fetch(`/api/tune?year=${year}&country=${code}${targetParams}`, { signal });
    if (res.ok) {
      const data = (await res.json()) as TuneResponse;
      if (data && Array.isArray(data.playlist) && data.playlist.length > 0) {
        return data;
      }
    }
  } catch (err: unknown) {
    if ((err as { name?: string })?.name === 'AbortError') {
      throw err;
    }
  }

  // Fallback seguro a canciones pre-calculadas en seed-cache
  const seed = getSeedTracks(code, year) || [];
  const primaryTrack: Track = seed[0] || {
    title: 'SIN DATOS PARA ESTE AÑO',
    artist: '',
    previewUrl: null,
    artworkUrl: null,
    releaseYear: String(year),
  };

  return {
    track: primaryTrack,
    playlist: seed,
    source: 'seed-cache',
  };
}
