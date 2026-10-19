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
  { id: 'asia', name: 'Asia', code: 'ASI', lat: 34.04, lon: 85.02, zoom: 2.7, sampleCity: 'Tokyo / Beijing / Delhi' },
  { id: 'africa', name: 'Africa', code: 'AFR', lat: 7.18, lon: 21.09, zoom: 2.8, sampleCity: 'Cairo / Nairobi' },
  { id: 'europe', name: 'Europe', code: 'EUR', lat: 50.85, lon: 15.25, zoom: 3.2, sampleCity: 'Geneva / Paris' },
  { id: 'north_america', name: 'North America', code: 'NAM', lat: 45.10, lon: -99.90, zoom: 2.6, sampleCity: 'New York / Toronto' },
  { id: 'south_america', name: 'South America', code: 'SAM', lat: -14.60, lon: -59.50, zoom: 2.8, sampleCity: 'São Paulo / Bogotá' },
  { id: 'oceania', name: 'Oceania', code: 'OCE', lat: -25.27, lon: 133.77, zoom: 3.0, sampleCity: 'Sydney / Auckland' },
  { id: 'antarctica', name: 'Antarctica', code: 'ATA', lat: -78.15, lon: 0.00, zoom: 2.2, sampleCity: 'Amundsen-Scott' },
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
