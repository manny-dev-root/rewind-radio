import type { D1Database } from '@cloudflare/workers-types';

export interface TrackPlayRecord {
  id: string;
  artist: string;
  title: string;
  country: string;
  year: number;
  artwork_url?: string | null;
  play_count: number;
  updated_at: number;
}

// Semilla para entorno de desarrollo local antes de conectar D1
const localDevStore = new Map<string, TrackPlayRecord>([
  [
    'ar-soda-stereo-persiana-americana',
    {
      id: 'ar-soda-stereo-persiana-americana',
      artist: 'Soda Stereo',
      title: 'Persiana Americana',
      country: 'AR',
      year: 1986,
      artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/46/99/42/469942d2-3f7d-32cc-8d9f-f0ee7844cd7b/mzi.rpicvdyw.jpg/600x600bb.jpg',
      play_count: 142,
      updated_at: Date.now() - 3600000,
    },
  ],
  [
    'gb-queen-bohemian-rhapsody',
    {
      id: 'gb-queen-bohemian-rhapsody',
      artist: 'Queen',
      title: 'Bohemian Rhapsody',
      country: 'GB',
      year: 1975,
      artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/62/2e/97/622e97c4-d620-2ae1-2a47-a32e16a01492/602567988847.jpg/600x600bb.jpg',
      play_count: 128,
      updated_at: Date.now() - 7200000,
    },
  ],
  [
    'fr-daft-punk-around-the-world',
    {
      id: 'fr-daft-punk-around-the-world',
      artist: 'Daft Punk',
      title: 'Around the World',
      country: 'FR',
      year: 1997,
      artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Features115/v4/34/8d/c7/348dc71c-d75e-9baf-671a-994e9e74b018/dj.pimdxdmf.jpg/600x600bb.jpg',
      play_count: 115,
      updated_at: Date.now() - 10800000,
    },
  ],
  [
    'jp-mariya-takeuchi-plastic-love',
    {
      id: 'jp-mariya-takeuchi-plastic-love',
      artist: 'Mariya Takeuchi',
      title: 'Plastic Love',
      country: 'JP',
      year: 1984,
      artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/1b/bf/7d/1bbf7d0d-fe41-4e4b-29d0-7feb373a9e4c/190295078515.jpg/600x600bb.jpg',
      play_count: 98,
      updated_at: Date.now() - 14400000,
    },
  ],
  [
    'us-michael-jackson-billie-jean',
    {
      id: 'us-michael-jackson-billie-jean',
      artist: 'Michael Jackson',
      title: 'Billie Jean',
      country: 'US',
      year: 1982,
      artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/32/4f/fd/324ffda2-9e51-8f6a-0c2d-c6fd2b41ac55/074643811224.jpg/600x600bb.jpg',
      play_count: 94,
      updated_at: Date.now() - 18000000,
    },
  ],
  [
    'de-scorpions-wind-of-change',
    {
      id: 'de-scorpions-wind-of-change',
      artist: 'Scorpions',
      title: 'Wind of Change',
      country: 'DE',
      year: 1990,
      artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/82/91/8b/82918b5d-2388-d8ea-ae9e-45c8222baf25/06UMGIM03503.rgb.jpg/600x600bb.jpg',
      play_count: 89,
      updated_at: Date.now() - 21600000,
    },
  ],
  [
    'mx-luis-miguel-la-incondicional',
    {
      id: 'mx-luis-miguel-la-incondicional',
      artist: 'Luis Miguel',
      title: 'La Incondicional',
      country: 'MX',
      year: 1988,
      artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/27/56/16/275616ef-8e2f-4b5c-7c6f-87bbe5b81314/mzi.vdosoaak.jpg/600x600bb.jpg',
      play_count: 83,
      updated_at: Date.now() - 25200000,
    },
  ],
  [
    'br-legiao-urbana-sera',
    {
      id: 'br-legiao-urbana-sera',
      artist: 'Legião Urbana',
      title: 'Será',
      country: 'BR',
      year: 1984,
      artwork_url: 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/18/1b/03/181b0329-0b99-5349-da2f-564ab83dc10c/13UABIM70453.rgb.jpg/600x600bb.jpg',
      play_count: 76,
      updated_at: Date.now() - 28800000,
    },
  ],
]);

function createTrackId(country: string, artist: string, title: string): string {
  const norm = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return `${norm(country)}-${norm(artist)}-${norm(title)}`;
}

/**
 * Obtiene el enlace de la base de datos D1 en Webflow Cloud de forma segura
 */
export async function getDatabase(): Promise<D1Database | null> {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    const envObj = ctx?.env as unknown as Record<string, unknown> | undefined;
    if (envObj?.DATABASE) {
      return envObj.DATABASE as D1Database;
    }
  } catch {}

  const gEnv = (process.env as unknown as Record<string, unknown>)?.DATABASE ||
    (globalThis as unknown as Record<string, unknown>)?.DATABASE;
  if (gEnv) return gEnv as D1Database;

  return null;
}

/**
 * Registra o incrementa atómicamente la reproducción de una canción
 */
export async function recordTrackPlay(params: {
  artist: string;
  title: string;
  country: string;
  year: number;
  artworkUrl?: string | null;
}): Promise<{ success: boolean; playCount: number }> {
  const { artist, title, country, year, artworkUrl } = params;
  const id = createTrackId(country, artist, title);
  const now = Date.now();

  const db = await getDatabase();

  if (db) {
    try {
      const stmt = db.prepare(`
        INSERT INTO track_plays (id, artist, title, country, year, artwork_url, play_count, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?)
        ON CONFLICT(id) DO UPDATE SET
          play_count = play_count + 1,
          updated_at = excluded.updated_at,
          artwork_url = COALESCE(excluded.artwork_url, track_plays.artwork_url)
        RETURNING play_count;
      `);

      const res = await stmt.bind(id, artist, title, country.toUpperCase(), year, artworkUrl || null, now).first<{ play_count: number }>();
      return { success: true, playCount: res?.play_count || 1 };
    } catch (err) {
      console.error('[Rewind Radio DB Error]', err);
    }
  }

  // Fallback para desarrollo local
  const current = localDevStore.get(id);
  const newCount = (current?.play_count || 0) + 1;
  localDevStore.set(id, {
    id,
    artist,
    title,
    country: country.toUpperCase(),
    year,
    artwork_url: artworkUrl || current?.artwork_url || null,
    play_count: newCount,
    updated_at: now,
  });

  return { success: true, playCount: newCount };
}

/**
 * Obtiene el ranking de las canciones más reproducidas
 */
export async function getTopRankedTracks(
  country?: string,
  limit = 10
): Promise<TrackPlayRecord[]> {
  const cleanLimit = Math.max(1, Math.min(50, limit));
  const db = await getDatabase();

  if (db) {
    try {
      if (country && country.trim().length > 0) {
        const { results } = await db
          .prepare(
            `SELECT id, artist, title, country, year, artwork_url, play_count, updated_at
             FROM track_plays
             WHERE country = ?
             ORDER BY play_count DESC, updated_at DESC
             LIMIT ?`
          )
          .bind(country.toUpperCase(), cleanLimit)
          .all<TrackPlayRecord>();
        return results || [];
      } else {
        const { results } = await db
          .prepare(
            `SELECT id, artist, title, country, year, artwork_url, play_count, updated_at
             FROM track_plays
             ORDER BY play_count DESC, updated_at DESC
             LIMIT ?`
          )
          .bind(cleanLimit)
          .all<TrackPlayRecord>();
        return results || [];
      }
    } catch (err) {
      console.error('[Rewind Radio DB Query Error]', err);
    }
  }

  // Fallback para desarrollo local
  let list = Array.from(localDevStore.values());
  if (country && country.trim().length > 0) {
    list = list.filter((item) => item.country === country.toUpperCase());
  }
  list.sort((a, b) => b.play_count - a.play_count);
  return list.slice(0, cleanLimit);
}
