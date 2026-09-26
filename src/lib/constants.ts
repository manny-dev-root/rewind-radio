export const COUNTRIES = [
  { code: 'US', name: 'Estados Unidos', locale: 'en-US' },
  { code: 'GB', name: 'Reino Unido', locale: 'en-GB' },
  { code: 'AR', name: 'Argentina', locale: 'es-AR' },
  { code: 'JP', name: 'Japón', locale: 'ja-JP' },
  { code: 'FR', name: 'Francia', locale: 'fr-FR' },
  { code: 'BR', name: 'Brasil', locale: 'pt-BR' },
  { code: 'DE', name: 'Alemania', locale: 'de-DE' },
  { code: 'MX', name: 'México', locale: 'es-MX' },
] as const;

export type CountryCode = typeof COUNTRIES[number]['code'];

export const YEAR_MIN = 1970;
export const YEAR_MAX = new Date().getFullYear();
export const DEBOUNCE_MS = 800;
