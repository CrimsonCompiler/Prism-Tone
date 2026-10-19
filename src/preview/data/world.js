/**
 * Global World Continents geographic reference data.
 *
 * Continent boundaries are served from /data/world-regions.json
 * (Natural Earth 1:110m cultural continent vectors).
 *
 * Coordinates below are representative continental centroids used for
 * genuine NASA POWER climatological observations (1981–2025).
 */

export const GLOBAL = {
  id: 'global',
  name: 'World (Global Earth)',
  kind: 'global',
  note: 'Derived — area-weighted planetary mean of all 7 continents',
}

export const CONTINENTS = [
  {
    id: 'asia',
    name: 'Asia',
    code: 'ASI',
    lat: 34.04,
    lon: 85.02,
    zoom: 2.7,
    sampleCity: 'Tokyo / Beijing / Delhi',
    color: '#c97a8e',
    border: '#e8a5b5',
    glow: 'rgba(201, 122, 142, 0.45)',
  },
  {
    id: 'africa',
    name: 'Africa',
    code: 'AFR',
    lat: 7.18,
    lon: 21.09,
    zoom: 2.8,
    sampleCity: 'Cairo / Nairobi',
    color: '#d4a259',
    border: '#f0c78a',
    glow: 'rgba(212, 162, 89, 0.45)',
  },
  {
    id: 'europe',
    name: 'Europe',
    code: 'EUR',
    lat: 50.85,
    lon: 15.25,
    zoom: 3.2,
    sampleCity: 'Geneva / Paris',
    color: '#7b8ec8',
    border: '#a5b5e8',
    glow: 'rgba(123, 142, 200, 0.45)',
  },
  {
    id: 'north_america',
    name: 'North America',
    code: 'NAM',
    lat: 45.10,
    lon: -99.90,
    zoom: 2.6,
    sampleCity: 'New York / Toronto',
    color: '#6aa382',
    border: '#93cca9',
    glow: 'rgba(106, 163, 130, 0.45)',
  },
  {
    id: 'south_america',
    name: 'South America',
    code: 'SAM',
    lat: -14.60,
    lon: -59.50,
    zoom: 2.8,
    sampleCity: 'São Paulo / Bogotá',
    color: '#d67c65',
    border: '#f5a490',
    glow: 'rgba(214, 124, 101, 0.45)',
  },
  {
    id: 'oceania',
    name: 'Oceania',
    code: 'OCE',
    lat: -25.27,
    lon: 133.77,
    zoom: 3.0,
    sampleCity: 'Sydney / Auckland',
    color: '#4fa89e',
    border: '#78ceca',
    glow: 'rgba(79, 168, 158, 0.45)',
  },
  {
    id: 'antarctica',
    name: 'Antarctica',
    code: 'ATA',
    lat: -78.15,
    lon: 0.00,
    zoom: 2.2,
    sampleCity: 'Amundsen-Scott',
    color: '#7baecc',
    border: '#a9d4ee',
    glow: 'rgba(123, 174, 204, 0.45)',
  },
]

export const CONTINENT_BY_ID = Object.fromEntries(CONTINENTS.map((c) => [c.id, c]))

// Backward compatibility aliases
export const REGIONS = CONTINENTS
export const REGION_BY_ID = CONTINENT_BY_ID
export const DIVISIONS = CONTINENTS
export const DIVISION_BY_ID = CONTINENT_BY_ID
export const REGIONAL = GLOBAL
export const NATIONAL = GLOBAL

export const GEOJSON_URL = '/data/world-regions.json'

/* Full-World Geographic Bounding Box [west, south, east, north] */
export const BOUNDS = { minLon: -175.0, minLat: -82.0, maxLon: 175.0, maxLat: 82.0 }

export const WORLD_BOUNDS = [
  [-170.0, -65.0],
  [175.0, 75.0],
]
