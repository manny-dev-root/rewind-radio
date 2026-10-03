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

export function isUrlExpired(url: string | null): boolean {
  if (!url) return false;
  if (!url.includes('hdnea=')) return false;
  const match = url.match(/exp=(\d+)/);
  if (!match) return false;
  const expSec = parseInt(match[1], 10);
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec >= expSec - 30;
}

/**
 * Obtiene la playlist histórica curada para un país y año desde /api/tune.
 * Si el navegador devuelve una respuesta de caché con URLs expiradas, fuerza la renovación.
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
    let res = await fetch(`/api/tune?year=${year}&country=${code}${targetParams}`, { signal });
    if (res.ok) {
      let data = (await res.json()) as TuneResponse;
      // Si la respuesta vino de la caché del navegador con tokens de audio expirados, forzar recarga fresca
      if (data?.playlist?.some((t) => isUrlExpired(t.previewUrl))) {
        res = await fetch(`/api/tune?year=${year}&country=${code}${targetParams}&_t=${Date.now()}`, {
          signal,
          cache: 'no-store',
        });
        if (res.ok) {
          data = (await res.json()) as TuneResponse;
        }
      }
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
