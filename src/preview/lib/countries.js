/**
 * Countries geographic reference dataset & search helper.
 * Derived from Natural Earth 1:110m world countries dataset.
 */

import worldCountriesGeoJson from '../data/world-countries.json'

const CONTINENT_MAP = {
  'Asia': 'asia',
  'Africa': 'africa',
  'Europe': 'europe',
  'North America': 'north_america',
  'South America': 'south_america',
  'Oceania': 'oceania',
  'Antarctica': 'antarctica',
  'Seven seas (open ocean)': 'antarctica',
}

function getBBoxAndCenter(feature) {
  let minX = 180, minY = 90, maxX = -180, maxY = -90
  let totalX = 0, totalY = 0, count = 0

  function walk(coords) {
    if (typeof coords[0] === 'number') {
      const [x, y] = coords
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
      totalX += x
      totalY += y
      count++
    } else {
      coords.forEach(walk)
    }
  }
  walk(feature.geometry.coordinates)

  return {
    center: [+(totalX / count).toFixed(3), +(totalY / count).toFixed(3)],
    bounds: [[+minX.toFixed(3), +minY.toFixed(3)], [+maxX.toFixed(3), +maxY.toFixed(3)]],
  }
}

export const COUNTRIES = worldCountriesGeoJson.features.map((f) => {
  const p = f.properties
  const { center, bounds } = getBBoxAndCenter(f)
  return {
    name: p.name,
    nameLong: p.name_long || p.name,
    formal: p.formal_en || p.name,
    iso2: p.iso_a2 || '',
    iso3: p.iso_a3 || '',
    continent: p.continent || 'Asia',
    continentId: CONTINENT_MAP[p.continent] || 'asia',
    center,
    bounds,
  }
})

const ALIASES = {
  'usa': 'United States',
  'america': 'United States',
  'us': 'United States',
  'united states of america': 'United States',
  'uk': 'United Kingdom',
  'britain': 'United Kingdom',
  'great britain': 'United Kingdom',
  'england': 'United Kingdom',
  'uae': 'United Arab Emirates',
  'emirates': 'United Arab Emirates',
  'russia': 'Russia',
  'russian federation': 'Russia',
  'korea': 'South Korea',
  'south korea': 'South Korea',
  'north korea': 'North Korea',
  'prc': 'China',
  'china': 'China',
  'bd': 'Bangladesh',
  'holland': 'Netherlands',
  'drc': 'Dem. Rep. Congo',
  'congo': 'Dem. Rep. Congo',
}

/**
 * Searches for countries by text query (case-insensitive fuzzy matching).
 */
export function searchCountries(rawQuery, limit = 7) {
  if (!rawQuery || typeof rawQuery !== 'string') return []
  const q = rawQuery.trim().toLowerCase()
  if (!q) return []

  // Check aliases first
  const aliasTarget = ALIASES[q]
  if (aliasTarget) {
    const direct = COUNTRIES.find((c) => c.name.toLowerCase() === aliasTarget.toLowerCase())
    if (direct) {
      const rest = COUNTRIES.filter((c) => c.name !== direct.name && c.name.toLowerCase().includes(q))
      return [direct, ...rest].slice(0, limit)
    }
  }

  const exact = []
  const startsWith = []
  const contains = []

  for (const c of COUNTRIES) {
    const nameLow = c.name.toLowerCase()
    const longLow = (c.nameLong || '').toLowerCase()
    const iso2Low = (c.iso2 || '').toLowerCase()
    const iso3Low = (c.iso3 || '').toLowerCase()

    if (nameLow === q || iso2Low === q || iso3Low === q) {
      exact.push(c)
    } else if (nameLow.startsWith(q) || longLow.startsWith(q)) {
      startsWith.push(c)
    } else if (nameLow.includes(q) || longLow.includes(q)) {
      contains.push(c)
    }
  }

  return [...exact, ...startsWith, ...contains].slice(0, limit)
}

/**
 * Finds the single best country match for voice or direct search submit.
 */
export function findCountry(rawQuery) {
  if (!rawQuery) return null
  const results = searchCountries(rawQuery, 1)
  return results.length > 0 ? results[0] : null
}
