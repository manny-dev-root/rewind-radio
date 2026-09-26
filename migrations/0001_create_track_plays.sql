-- Migración inicial para el Ranking Global de canciones reproducidas
CREATE TABLE IF NOT EXISTS track_plays (
  id TEXT PRIMARY KEY,
  artist TEXT NOT NULL,
  title TEXT NOT NULL,
  country TEXT NOT NULL,
  year INTEGER NOT NULL,
  artwork_url TEXT,
  play_count INTEGER DEFAULT 1,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_track_plays_count ON track_plays(play_count DESC);
CREATE INDEX IF NOT EXISTS idx_track_plays_country ON track_plays(country, play_count DESC);
