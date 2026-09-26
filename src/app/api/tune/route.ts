import { YEAR_MIN, YEAR_MAX } from '@/lib/constants';
import { getSeedTracks } from '@/lib/seed-cache';
import type { TuneResponse, Track } from '@/types';

declare global {
  var __ERA_CACHE__: Map<string, unknown> | undefined;
}

const CACHE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
};

const MB_HEADERS = {
  'User-Agent': 'RewindRadio/1.0 (https://github.com/rewind-radio)',
  Accept: 'application/json',
};

function getCache(): Map<string, unknown> {
  if (!globalThis.__ERA_CACHE__) globalThis.__ERA_CACHE__ = new Map();
  return globalThis.__ERA_CACHE__;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// Artistas representativos por país y década para consultar en iTunes filtrando ESTRICTAMENTE por releaseDate === year
const COUNTRY_ERA_ARTISTS: Record<string, Record<string, string[]>> = {
  AR: {
    '1970': ['Sui Generis', 'Serú Girán', 'Pescado Rabioso', 'Charly García', 'Luis Alberto Spinetta', 'Vox Dei', 'Almendra', 'León Gieco', 'Pappo', 'Moris', 'Manal', 'Arco Iris'],
    '1980': ['Charly García', 'Soda Stereo', 'Virus', 'Sumo', 'Los Abuelos de la Nada', 'Miguel Mateos', 'Fito Páez', 'Enanitos Verdes', 'Patricio Rey y sus Redonditos de Ricota', 'Andrés Calamaro'],
    '1990': ['Soda Stereo', 'Fito Páez', 'Los Fabulosos Cadillacs', 'Andrés Calamaro', 'Babasónicos', 'Divididos', 'Los Auténticos Decadentes', 'La Renga', 'Illya Kuryaki and the Valderramas', 'Gustavo Cerati'],
    '2000': ['Gustavo Cerati', 'Miranda!', 'Babasónicos', 'Bersuit Vergarabat', 'Intoxicados', 'Los Piojos', 'Vicentico', 'Airbag', 'Callejeros', 'Catupecu Machu'],
    '2010': ['Tan Biónica', 'Gustavo Cerati', 'Abel Pintos', 'Ciro y los Persas', 'Las Pastillas del Abuelo', 'Eruca Sativa', 'Babasónicos', 'Lali', 'Duki', 'Paulo Londra'],
    '2020': ['Bizarrap', 'Trueno', 'Duki', 'Nicki Nicole', 'María Becerra', 'Tini', 'Wos', 'Emilia', 'Tiago PZK', 'Luck Ra'],
  },
  US: {
    '1970': ['Fleetwood Mac', 'Eagles', 'Stevie Wonder', 'Earth, Wind & Fire', 'Donna Summer', 'Blondie', 'Billy Joel', 'Creedence Clearwater Revival', 'Marvin Gaye'],
    '1980': ['Michael Jackson', 'Prince', 'Madonna', 'Whitney Houston', 'Guns N Roses', 'Bon Jovi', 'Cyndi Lauper', 'Toto', 'Bruce Springsteen', 'Talking Heads'],
    '1990': ['Nirvana', 'Pearl Jam', 'Red Hot Chili Peppers', 'Mariah Carey', 'Green Day', 'TLC', 'Backstreet Boys', 'R.E.M.', 'Britney Spears', 'Lauryn Hill'],
    '2000': ['Eminem', 'Beyoncé', 'Linkin Park', 'OutKast', 'The Strokes', 'Britney Spears', 'Kanye West', 'Lady Gaga', 'Alicia Keys', 'Usher'],
    '2010': ['Kendrick Lamar', 'Bruno Mars', 'Taylor Swift', 'Post Malone', 'Ariana Grande', 'Billie Eilish', 'Pharrell Williams', 'The Weeknd', 'Lana Del Rey'],
    '2020': ['The Weeknd', 'Olivia Rodrigo', 'Taylor Swift', 'SZA', 'Billie Eilish', 'Sabrina Carpenter', 'Kendrick Lamar', 'Bruno Mars', 'Post Malone'],
  },
  GB: {
    '1970': ['Queen', 'Pink Floyd', 'Led Zeppelin', 'David Bowie', 'Elton John', 'The Clash', 'Electric Light Orchestra', 'Bee Gees', 'Black Sabbath'],
    '1980': ['Queen', 'Depeche Mode', 'The Cure', 'New Order', 'Wham!', 'The Smiths', 'Duran Duran', 'Tears for Fears', 'Eurythmics', 'Pet Shop Boys'],
    '1990': ['Oasis', 'Blur', 'Radiohead', 'The Verve', 'Spice Girls', 'Pulp', 'Jamiroquai', 'Robbie Williams', 'Massive Attack', 'The Prodigy'],
    '2000': ['Coldplay', 'Amy Winehouse', 'Arctic Monkeys', 'Gorillaz', 'Muse', 'Franz Ferdinand', 'Keane', 'Adele', 'Lily Allen', 'Florence + The Machine'],
    '2010': ['Adele', 'Ed Sheeran', 'Calvin Harris', 'Arctic Monkeys', 'Sam Smith', 'Dua Lipa', 'Coldplay', 'Harry Styles', 'One Direction', 'Stormzy'],
    '2020': ['Dua Lipa', 'Harry Styles', 'Adele', 'Coldplay', 'Sam Smith', 'Charli XCX', 'Glass Animals', 'Ed Sheeran', 'Central Cee', 'RAYE'],
  },
  JP: {
    '1970': ['Mariya Takeuchi', 'Tatsuro Yamashita', 'Yellow Magic Orchestra', 'Happy End', 'Yumi Matsutoya', 'Taeko Onuki'],
    '1980': ['Mariya Takeuchi', 'Anri', 'Miki Matsubara', 'Tatsuro Yamashita', 'Akina Nakamori', 'Kyoko Koizumi', 'Toshiki Kadomatsu', 'Casiopea'],
    '1990': ['Hikaru Utada', 'Namie Amuro', 'Spitz', 'Mr.Children', 'B\'z', 'ZARD', 'GLAY', 'L\'Arc-en-Ciel', 'Chage and Aska', 'Dreams Come True'],
    '2000': ['Hikaru Utada', 'Ayumi Hamasaki', 'Perfume', 'Asian Kung-Fu Generation', 'Nujabes', '椎名林檎', 'Arashi', 'L\'Arc-en-Ciel'],
    '2010': ['Kenshi Yonezu', 'Official HIGE DANdism', 'RADWIMPS', 'Perfume', 'BABYMETAL', 'ONE OK ROCK', 'Gen Hoshino', 'LiSA'],
    '2020': ['YOASOBI', 'Ado', 'Fujii Kaze', 'Creepy Nuts', 'Kenshi Yonezu', 'Vaundy', 'Mrs. GREEN APPLE', 'Official HIGE DANdism'],
  },
  FR: {
    '1970': ['Joe Dassin', 'Michel Polnareff', 'Jean-Michel Jarre', 'Cerrone', 'Dalida', 'Serge Gainsbourg', 'Claude François', 'Véronique Sanson'],
    '1980': ['Indochine', 'Mylène Farmer', 'France Gall', 'Les Rita Mitsouko', 'Gipsy Kings', 'Téléphone', 'Vanessa Paradis', 'Jean-Jacques Goldman'],
    '1990': ['Daft Punk', 'Air', 'MC Solaar', 'Manu Chao', 'Cassius', 'Stardust', 'Modjo', 'Mylène Farmer', 'IAM'],
    '2000': ['Daft Punk', 'Justice', 'Phoenix', 'David Guetta', 'Bob Sinclar', 'Carla Bruni', 'Yann Tiersen', 'M83'],
    '2010': ['Daft Punk', 'Stromae', 'Indila', 'DJ Snake', 'Christine and the Queens', 'M83', 'Aya Nakamura', 'Orelsan'],
    '2020': ['Aya Nakamura', 'Stromae', 'Gims', 'Jul', 'Zaho de Sagazan', 'Santa', 'DJ Snake', 'Clara Luciani'],
  },
  BR: {
    '1970': ['Tim Maia', 'Milton Nascimento', 'Elis Regina', 'Chico Buarque', 'Rita Lee', 'Jorge Ben Jor', 'Caetano Veloso', 'Gilberto Gil', 'Raul Seixas'],
    '1980': ['Legião Urbana', 'Paralamas do Sucesso', 'Titãs', 'Cazuza', 'Barão Vermelho', 'Djavan', 'Lulu Santos', 'RPM', 'Kid Abelha'],
    '1990': ['Sepultura', 'Skank', 'Mamonas Assassinas', 'Chico Science', 'Daniela Mercury', 'Marisa Monte', 'Jota Quest', 'Raimundos'],
    '2000': ['Tribalistas', 'Charlie Brown Jr.', 'Seu Jorge', 'Ivete Sangalo', 'Marcelo D2', 'O Rappa', 'Pitty', 'Vanessa da Mata'],
    '2010': ['Anitta', 'Seu Jorge', 'Marília Mendonça', 'Gusttavo Lima', 'Alok', 'Jorge & Mateus', 'Criolo', 'IZA'],
    '2020': ['Anitta', 'Ludmilla', 'Pabllo Vittar', 'Alok', 'Pedro Sampaio', 'Ana Castela', 'Luísa Sonza', 'Liniker'],
  },
  DE: {
    '1970': ['Kraftwerk', 'Boney M.', 'Scorpions', 'Tangerine Dream', 'Can', 'Neu!', 'Nina Hagen'],
    '1980': ['Nena', 'Falco', 'Modern Talking', 'Scorpions', 'Alphaville', 'Sandra', 'Trio', 'Peter Schilling', 'Camouflage'],
    '1990': ['Rammstein', 'Scorpions', 'Snap!', 'Haddaway', 'La Bouche', 'ATB', 'Die Fantastischen Vier', 'Lou Bega'],
    '2000': ['Rammstein', 'Tokio Hotel', 'Paul van Dyk', 'Scooter', 'Wir sind Helden', 'Seeed', 'Sarah Connor'],
    '2010': ['Zedd', 'Robin Schulz', 'Milky Chance', 'Felix Jaehn', 'Purple Disco Machine', 'Cro', 'AnnenMayKantereit'],
    '2020': ['Purple Disco Machine', 'Kim Petras', 'Rammstein', 'Apache 207', 'Nina Chuba', 'Robin Schulz', 'Bennett'],
  },
  MX: {
    '1970': ['Juan Gabriel', 'José José', 'Vicente Fernández', 'Rigo Tovar', 'Los Ángeles Negros', 'Roberto Carlos'],
    '1980': ['Luis Miguel', 'Caifanes', 'El Tri', 'Juan Gabriel', 'Timbiriche', 'Flans', 'Emmanuel', 'Yuri', 'Mijares'],
    '1990': ['Maná', 'Café Tacvba', 'Selena', 'Molotov', 'Julieta Venegas', 'Luis Miguel', 'Fey', 'Cristian Castro', 'Thalía'],
    '2000': ['Natalia Lafourcade', 'Zoé', 'Julieta Venegas', 'Belanova', 'RBD', 'Maná', 'Camila', 'Reik', 'Pxndx'],
    '2010': ['Natalia Lafourcade', 'León Larregui', 'Carla Morrison', 'Christian Nodal', 'Reik', 'Zoé', 'Jesse & Joy', 'Los Ángeles Azules'],
    '2020': ['Peso Pluma', 'Christian Nodal', 'Grupo Frontera', 'Carin León', 'Kenia OS', 'Natalia Lafourcade', 'Junior H', 'Fuerza Regida'],
  },
};

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae el núcleo del título sin aclaraciones entre paréntesis o corchetes (ej. "Presente (El Momento en Que Estás)" -> "presente")
 * para evitar duplicados de la misma canción y comparar títulos con precisión.
 */
function normalizeTitleCore(s: string): string {
  const withoutParens = s
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .split(' - ')[0];
  return normalizeStr(withoutParens);
}

/**
 * Verifica que el artista en iTunes sea realmente el artista buscado (y no un colaborador secundario como "Tagne & Manal").
 */
function isExactOrPrimaryArtist(itunesArtist: string, targetArtist: string): boolean {
  const itemNorm = normalizeStr(itunesArtist);
  const targetNorm = normalizeStr(targetArtist);
  if (!itemNorm || !targetNorm) return false;
  if (itemNorm === targetNorm) return true;
  // Permite que el artista sea el autor principal al inicio (ej. "Pappo's Blues" para "Pappo")
  // pero rechaza cuando aparece después de "&", "feat", "with" (ej. "Tagne & Manal")
  return itemNorm.startsWith(`${targetNorm} `);
}

/**
 * Busca en iTunes una canción o lanzamiento específico verificado en MusicBrainz para obtener su previewUrl M4A.
 * REGLA ANTI-FALSOS POSITIVOS (Caso "MAAK" / "Tagne & Manal"):
 * - JAMÁS hace fallback a `resultsWithPreview[0]` si el título de la canción no coincide.
 * - Rechaza colaboraciones donde el artista buscado es secundario (ej. "Tagne & Manal").
 * - Si el álbum en MusicBrainz es homónimo al artista (ej. "Manal" de "Manal"), exige que el año en iTunes
 *   sea consistente con la década histórica (`<= targetYear + 3`) para no traer artistas homónimos modernos.
 */
async function resolveAudioOnITunes(
  artist: string,
  title: string,
  targetYear: number,
  countryCode: string
): Promise<Track | null> {
  const query = `${artist} ${title}`.trim();
  const term = encodeURIComponent(query);
  const url = `https://itunes.apple.com/search?term=${term}&country=${countryCode}&media=music&entity=song&limit=8`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RewindRadio/1.0)' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      resultCount?: number;
      results?: Array<{
        trackName?: string;
        artistName?: string;
        collectionName?: string;
        releaseDate?: string;
        previewUrl?: string;
        artworkUrl100?: string;
      }>;
    };

    const artistCore = normalizeTitleCore(artist);
    const rawParts = title
      .split('/')
      .map((p) => normalizeTitleCore(p))
      .filter((p) => p.length >= 3);
    const titleCore = normalizeTitleCore(title);
    const isSelfTitledRelease = titleCore === artistCore;

    const validMatch = (data.results || []).find((item) => {
      if (!item.previewUrl || !item.artistName || !item.trackName) return false;

      // 1. El artista debe coincidir exactamente o ser el artista principal al comienzo
      if (!isExactOrPrimaryArtist(item.artistName, artist)) return false;

      const itemTrackCore = normalizeTitleCore(item.trackName);
      const itemAlbumCore = normalizeTitleCore(item.collectionName || '');
      const itemYear = item.releaseDate ? Number(item.releaseDate.slice(0, 4)) : 0;

      // 2. Si el lanzamiento de MusicBrainz es homónimo (ej. álbum "Manal" de "Manal"),
      // un artista moderno homónimo (ej. cantante marroquí Manal en 2022) tendría itemYear > 2010.
      // Por eso para discos homónimos exigimos que el año de catálogo en iTunes sea cercano a targetYear.
      if (isSelfTitledRelease) {
        return (
          itemAlbumCore === artistCore &&
          itemYear > 0 &&
          Math.abs(itemYear - targetYear) <= 3
        );
      }

      // 3. Para lanzamientos con título propio (ej. "Presente", "Siempre fuimos compañeros", "Treinta minutos de vida"),
      // exigimos que el nombre de la pista o del álbum en iTunes coincida con el título histórico de MusicBrainz.
      // PROHIBIDO hacer fallback a resultsWithPreview[0] si el título no coincide.
      const matchesTrackTitle = rawParts.some(
        (part) => itemTrackCore === part || itemTrackCore.includes(part) || part.includes(itemTrackCore)
      );
      const matchesAlbumTitle =
        titleCore.length >= 4 &&
        (itemAlbumCore === titleCore || itemAlbumCore.includes(titleCore)) &&
        itemYear <= targetYear + 15;

      return matchesTrackTitle || matchesAlbumTitle;
    });

    const relYear = validMatch?.releaseDate ? validMatch.releaseDate.slice(0, 4) : null;

    if (!validMatch || !validMatch.previewUrl) {
      return null;
    }

    return {
      title: validMatch.trackName!,
      artist: validMatch.artistName!,
      previewUrl: validMatch.previewUrl,
      artworkUrl: validMatch.artworkUrl100?.replace('100x100', '600x600') ?? null,
      releaseYear: String(targetYear),
    };
  } catch {
    return null;
  }
}

/**
 * Fuente 1 (100% Gratuita): MusicBrainz Open API
 * Consulta lanzamientos oficiales (`release`) publicados en `year` y `countryCode`.
 */
async function fetchMusicBrainzYearCandidates(
  year: number,
  countryCode: string
): Promise<{
  candidates: Array<{ title: string; artist: string; releaseYear: number }>;
  requestUrl: string;
  status: number;
}> {
  const releaseQuery = `date:${year} AND country:${countryCode} AND status:official`;
  const releaseUrl = `https://musicbrainz.org/ws/2/release?query=${encodeURIComponent(releaseQuery)}&fmt=json&limit=25`;

  const candidates: Array<{ title: string; artist: string; releaseYear: number }> = [];
  const seen = new Set<string>();
  let status = 200;

  try {
    const res = await fetch(releaseUrl, {
      headers: MB_HEADERS,
      signal: AbortSignal.timeout(2500),
    });
    status = res.status;

    if (res.ok) {
      const data = (await res.json()) as {
        releases?: Array<{
          title?: string;
          date?: string;
          'artist-credit'?: Array<{ name?: string; artist?: { name?: string } }>;
        }>;
      };

      for (const rel of data.releases || []) {
        const title = rel.title?.trim();
        const artist =
          rel['artist-credit']?.[0]?.name?.trim() ||
          rel['artist-credit']?.[0]?.artist?.name?.trim();
        if (!title || !artist) continue;

        const artistNorm = normalizeStr(artist);
        if (
          artistNorm === 'various artists' ||
          artistNorm === 'varios artistas' ||
          artistNorm === 'unknown'
        ) {
          continue;
        }

        const key = `${artistNorm}-${normalizeTitleCore(title)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        candidates.push({ title, artist, releaseYear: year });
      }
    }
  } catch (err) {
    console.warn('[MusicBrainz Error]', err);
    status = 500;
  }

  return { candidates, requestUrl: releaseUrl, status };
}

/**
 * Fuente 2 (100% Gratuita): iTunes Search API filtrando ESTRICTAMENTE por `releaseDate.startsWith(String(year))`
 * Rota el orden de artistas según el año e intercala en Round-Robin para que distintos años no arranquen siempre con el mismo artista/tema en #1.
 */
async function fetchITunesExactYearSongs(
  year: number,
  countryCode: string
): Promise<Track[]> {
  const decadeKey = `${Math.floor(year / 10) * 10}`;
  const countryMap = COUNTRY_ERA_ARTISTS[countryCode] || COUNTRY_ERA_ARTISTS['US'];
  const baseArtists = countryMap[decadeKey] || countryMap['1980'] || [];

  // Rotar el arreglo de artistas de manera determinística según el año para que el puesto #1 varíe año a año
  const offset = baseArtists.length > 0 ? (year * 3) % baseArtists.length : 0;
  const rotatedArtists = [
    ...baseArtists.slice(offset),
    ...baseArtists.slice(0, offset),
  ].slice(0, 4); // Topamos en 4 consultas concurrentes para evitar 429 y límite de subrequests en Cloudflare Workers

  const promises = rotatedArtists.map(async (artistName) => {
    const term = encodeURIComponent(artistName);
    const url = `https://itunes.apple.com/search?term=${term}&country=${countryCode}&media=music&entity=song&attribute=artistTerm&limit=35`;
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RewindRadio/1.0)' },
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as {
        resultCount?: number;
        results?: Array<{
          trackName?: string;
          artistName?: string;
          releaseDate?: string;
          previewUrl?: string;
          artworkUrl100?: string;
        }>;
      };

      let exactYearItems = (data.results || []).filter((item) => {
        if (!item.previewUrl || !item.trackName || !item.artistName || !item.releaseDate) {
          return false;
        }
        if (!item.releaseDate.startsWith(String(year))) {
          return false;
        }
        return isExactOrPrimaryArtist(item.artistName, artistName);
      });

      // Si la fecha de catálogo en iTunes no empieza con el año exacto (por remasterizaciones/re-ediciones), relajar a la misma década
      if (exactYearItems.length === 0) {
        exactYearItems = (data.results || []).filter((item) => {
          if (!item.previewUrl || !item.trackName || !item.artistName || !item.releaseDate) {
            return false;
          }
          const itemYear = Number(item.releaseDate.slice(0, 4));
          return isExactOrPrimaryArtist(item.artistName, artistName) && itemYear > 0 && Math.abs(itemYear - year) <= 4;
        });
      }

      const firstMatch = exactYearItems[0];

      return exactYearItems.slice(0, 2).map((item) => ({
        title: item.trackName!,
        artist: item.artistName!,
        previewUrl: item.previewUrl!,
        artworkUrl: item.artworkUrl100?.replace('100x100', '600x600') ?? null,
        releaseYear: String(year),
      }));
    } catch {
      return [];
    }
  });

  const artistLists = await Promise.all(promises);

  // Intercalar en Round-Robin (primero la canción #1 de cada artista, luego la #2) para máxima variedad
  const exactTracks: Track[] = [];
  const seenTrackKeys = new Set<string>();
  const artistCount = new Map<string, number>();

  for (let pass = 0; pass < 2; pass++) {
    for (const list of artistLists) {
      const track = list[pass];
      if (!track || exactTracks.length >= 10) continue;

      const aNorm = normalizeStr(track.artist);
      const tCore = normalizeTitleCore(track.title);
      const key = `${aNorm}-${tCore}`;
      if (seenTrackKeys.has(key)) continue;

      const currentForArtist = artistCount.get(aNorm) || 0;
      if (currentForArtist >= 2) continue;

      seenTrackKeys.add(key);
      artistCount.set(aNorm, currentForArtist + 1);
      exactTracks.push(track);
    }
  }

  return exactTracks;
}

export async function GET(request: Request) {
  let yearNum = 0;
  let countryCode = '';

  try {
    const { searchParams } = new URL(request.url);
    const rawYear = searchParams.get('year');
    countryCode = searchParams.get('country')?.trim().toUpperCase() ?? '';
    yearNum = Number(rawYear);

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

    const cacheKey = `v8-roundrobin-${yearNum}-${countryCode}`;
    const cache = getCache();
    if (cache.has(cacheKey)) {
      return Response.json(cache.get(cacheKey), { headers: CACHE_HEADERS });
    }

    const [itunesExactTracks, mbResult] = await Promise.all([
      fetchITunesExactYearSongs(yearNum, countryCode),
      fetchMusicBrainzYearCandidates(yearNum, countryCode),
    ]);

    const finalPlaylist: Track[] = [...itunesExactTracks];
    const seenKeys = new Set(
      finalPlaylist.map((t) => `${normalizeStr(t.artist)}-${normalizeTitleCore(t.title)}`)
    );
    const artistCounts = new Map<string, number>();
    for (const t of finalPlaylist) {
      const aNorm = normalizeStr(t.artist);
      artistCounts.set(aNorm, (artistCounts.get(aNorm) || 0) + 1);
    }

    // Limitamos el lote de consultas secundarias a iTunes a máximo 6 para evitar HTTP 429 Too Many Requests
    if (finalPlaylist.length < 10 && mbResult.candidates.length > 0) {
      const needed = 10 - finalPlaylist.length;
      const mbSlice = mbResult.candidates.slice(0, Math.min(6, needed + 2));
      const resolvedMb = await Promise.all(
        mbSlice.map((cand) =>
          resolveAudioOnITunes(cand.artist, cand.title, yearNum, countryCode)
        )
      );

      for (const track of resolvedMb) {
        if (!track || !track.previewUrl || finalPlaylist.length >= 10) continue;
        const aNorm = normalizeStr(track.artist);
        const tCore = normalizeTitleCore(track.title);
        const key = `${aNorm}-${tCore}`;
        if (seenKeys.has(key)) continue;

        const countForArtist = artistCounts.get(aNorm) || 0;
        if (countForArtist >= 2) continue;

        seenKeys.add(key);
        artistCounts.set(aNorm, countForArtist + 1);
        finalPlaylist.push(track);
      }
    }

    //let verifiedTracks = finalPlaylist.slice(0, 10);
    let verifiedTracks: Track[] = []; // <--- FORZAR FALLBACK

    let responseSource: 'api' | 'seed-cache' = 'api';

    // Fallback garantizado a Seed Cache si las APIs externas no devolvieron canciones
    if (verifiedTracks.length === 0) {
      const seedFallback = getSeedTracks(countryCode, yearNum);
      if (seedFallback && seedFallback.length > 0) {
        verifiedTracks = [...seedFallback];
        responseSource = 'seed-cache';
      }
    }

    // Búsqueda directa en iTunes por país y año si el sintonizador de artistas no arrojó resultados
    if (verifiedTracks.length === 0) {
      try {
        const directUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(countryCode + ' ' + yearNum)}&country=${countryCode}&media=music&entity=song&limit=10`;
        const resDirect = await fetch(directUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RewindRadio/1.0)' },
          signal: AbortSignal.timeout(3500),
        });
        if (resDirect.ok) {
          const dataDirect = (await resDirect.json()) as {
            results?: Array<{
              trackName?: string;
              artistName?: string;
              previewUrl?: string;
              artworkUrl100?: string;
            }>;
          };
          const directTracks: Track[] = (dataDirect.results || [])
            .filter((r) => Boolean(r.previewUrl && r.trackName && r.artistName))
            .slice(0, 10)
            .map((r) => ({
              title: r.trackName!,
              artist: r.artistName!,
              previewUrl: r.previewUrl!,
              artworkUrl: r.artworkUrl100 ? r.artworkUrl100.replace('100x100', '600x600') : null,
              releaseYear: String(yearNum),
            }));
          if (directTracks.length > 0) {
            verifiedTracks = directTracks;
            responseSource = 'api';
          }
        }
      } catch {}
    }

    // Log conciso para la consola de runtime de Webflow Cloud
    console.log(`[Rewind Radio Server] ${countryCode} ${yearNum} -> ${verifiedTracks.length} canciones (${responseSource})`);

    // Evitar que el puesto #1 repita el mismo título base que el #1 del año adyacente (ej. "Oncemil" en 2016 y "Oncemil (feat. Malú)" en 2017)
    if (verifiedTracks.length > 1) {
      const prevYearCached = cache.get(`v8-roundrobin-${yearNum - 1}-${countryCode}`) as TuneResponse | undefined;
      const nextYearCached = cache.get(`v8-roundrobin-${yearNum + 1}-${countryCode}`) as TuneResponse | undefined;
      const forbiddenTopCores = new Set<string>();

      if (prevYearCached?.track?.title) {
        forbiddenTopCores.add(normalizeTitleCore(prevYearCached.track.title));
      }
      if (nextYearCached?.track?.title) {
        forbiddenTopCores.add(normalizeTitleCore(nextYearCached.track.title));
      }

      if (forbiddenTopCores.has(normalizeTitleCore(verifiedTracks[0].title))) {
        const altIdx = verifiedTracks.findIndex(
          (t) => !forbiddenTopCores.has(normalizeTitleCore(t.title))
        );
        if (altIdx > 0) {
          const [altTrack] = verifiedTracks.splice(altIdx, 1);
          verifiedTracks.unshift(altTrack);
        }
      }
    }

    const primaryTrack: Track = verifiedTracks[0] || {
      title: 'SIN DATOS PARA ESTE AÑO',
      artist: '',
      previewUrl: null,
      artworkUrl: null,
      releaseYear: String(yearNum),
    };

    const data: TuneResponse = {
      track: primaryTrack,
      playlist: verifiedTracks,
      source: responseSource,
    };

    // Solo guardar en caché si obtuvimos canciones reales (evita cachear respuestas vacías)
    if (verifiedTracks.length > 0 && verifiedTracks[0].previewUrl) {
      cache.set(cacheKey, data);
    }
    return Response.json(data, { headers: CACHE_HEADERS });
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
