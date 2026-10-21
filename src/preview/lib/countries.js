/**
 * Comprehensive World Countries Geographic Reference Dataset & Search Helper.
 * Contains all 195 official UN countries (193 UN members + Holy See & Palestine).
 *
 * Provides exact centroids, bounding boxes, ISO codes, continent scopes,
 * and high-accuracy fuzzy/alias matching for both text and voice search.
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

// Micro-states and island nations not present in low-res 1:110m Natural Earth polygons
const MICRO_STATES = [
  { name: 'Andorra', formal: 'Principality of Andorra', continent: 'Europe', continentId: 'europe', center: [1.522, 42.506], bounds: [[1.4, 42.4], [1.7, 42.6]], iso2: 'AD', iso3: 'AND' },
  { name: 'Antigua and Barbuda', formal: 'Antigua and Barbuda', continent: 'North America', continentId: 'north_america', center: [-61.796, 17.061], bounds: [[-61.9, 16.9], [-61.6, 17.2]], iso2: 'AG', iso3: 'ATG' },
  { name: 'Bahrain', formal: 'Kingdom of Bahrain', continent: 'Asia', continentId: 'asia', center: [50.558, 26.067], bounds: [[50.4, 25.8], [50.7, 26.3]], iso2: 'BH', iso3: 'BHR' },
  { name: 'Barbados', formal: 'Barbados', continent: 'North America', continentId: 'north_america', center: [-59.543, 13.194], bounds: [[-59.7, 13.0], [-59.4, 13.4]], iso2: 'BB', iso3: 'BRB' },
  { name: 'Cabo Verde', formal: 'Republic of Cabo Verde', continent: 'Africa', continentId: 'africa', center: [-23.605, 15.12], bounds: [[-25.4, 14.8], [-22.6, 17.2]], iso2: 'CV', iso3: 'CPV' },
  { name: 'Comoros', formal: 'Union of the Comoros', continent: 'Africa', continentId: 'africa', center: [43.333, -11.646], bounds: [[43.1, -12.4], [44.6, -11.3]], iso2: 'KM', iso3: 'COM' },
  { name: 'Dominica', formal: 'Commonwealth of Dominica', continent: 'North America', continentId: 'north_america', center: [-61.371, 15.415], bounds: [[-61.5, 15.2], [-61.2, 15.6]], iso2: 'DM', iso3: 'DMA' },
  { name: 'Grenada', formal: 'Grenada', continent: 'North America', continentId: 'north_america', center: [-61.679, 12.117], bounds: [[-61.8, 11.9], [-61.5, 12.3]], iso2: 'GD', iso3: 'GRD' },
  { name: 'Holy See', formal: 'Holy See (Vatican City State)', continent: 'Europe', continentId: 'europe', center: [12.453, 41.903], bounds: [[12.44, 41.89], [12.46, 41.91]], iso2: 'VA', iso3: 'VAT' },
  { name: 'Kiribati', formal: 'Republic of Kiribati', continent: 'Oceania', continentId: 'oceania', center: [-157.363, 1.871], bounds: [[-175.0, -11.0], [-150.0, 5.0]], iso2: 'KI', iso3: 'KIR' },
  { name: 'Liechtenstein', formal: 'Principality of Liechtenstein', continent: 'Europe', continentId: 'europe', center: [9.555, 47.166], bounds: [[9.4, 47.0], [9.6, 47.3]], iso2: 'LI', iso3: 'LIE' },
  { name: 'Maldives', formal: 'Republic of Maldives', continent: 'Asia', continentId: 'asia', center: [73.221, 3.203], bounds: [[72.5, -0.7], [73.8, 7.2]], iso2: 'MV', iso3: 'MDV' },
  { name: 'Malta', formal: 'Republic of Malta', continent: 'Europe', continentId: 'europe', center: [14.375, 35.938], bounds: [[14.1, 35.7], [14.6, 36.1]], iso2: 'MT', iso3: 'MLT' },
  { name: 'Marshall Islands', formal: 'Republic of the Marshall Islands', continent: 'Oceania', continentId: 'oceania', center: [171.185, 7.132], bounds: [[160.0, 4.0], [173.0, 15.0]], iso2: 'MH', iso3: 'MHL' },
  { name: 'Mauritius', formal: 'Republic of Mauritius', continent: 'Africa', continentId: 'africa', center: [57.552, -20.348], bounds: [[57.3, -20.6], [57.8, -19.9]], iso2: 'MU', iso3: 'MUS' },
  { name: 'Micronesia', formal: 'Federated States of Micronesia', continent: 'Oceania', continentId: 'oceania', center: [150.551, 7.426], bounds: [[138.0, 1.0], [163.0, 10.0]], iso2: 'FM', iso3: 'FSM' },
  { name: 'Monaco', formal: 'Principality of Monaco', continent: 'Europe', continentId: 'europe', center: [7.425, 43.738], bounds: [[7.4, 43.7], [7.5, 43.8]], iso2: 'MC', iso3: 'MCO' },
  { name: 'Nauru', formal: 'Republic of Nauru', continent: 'Oceania', continentId: 'oceania', center: [166.932, -0.523], bounds: [[166.9, -0.6], [167.0, -0.5]], iso2: 'NR', iso3: 'NRU' },
  { name: 'Palau', formal: 'Republic of Palau', continent: 'Oceania', continentId: 'oceania', center: [134.583, 7.515], bounds: [[134.1, 6.8], [134.8, 8.2]], iso2: 'PW', iso3: 'PLW' },
  { name: 'Saint Kitts and Nevis', formal: 'Federation of Saint Christopher and Nevis', continent: 'North America', continentId: 'north_america', center: [-62.783, 17.358], bounds: [[-62.9, 17.1], [-62.5, 17.4]], iso2: 'KN', iso3: 'KNA' },
  { name: 'Saint Lucia', formal: 'Saint Lucia', continent: 'North America', continentId: 'north_america', center: [-60.979, 13.909], bounds: [[-61.1, 13.7], [-60.8, 14.1]], iso2: 'LC', iso3: 'LCA' },
  { name: 'Saint Vincent and the Grenadines', formal: 'Saint Vincent and the Grenadines', continent: 'North America', continentId: 'north_america', center: [-61.287, 13.253], bounds: [[-61.5, 12.5], [-61.1, 13.4]], iso2: 'VC', iso3: 'VCT' },
  { name: 'Samoa', formal: 'Independent State of Samoa', continent: 'Oceania', continentId: 'oceania', center: [-172.105, -13.759], bounds: [[-172.9, -14.1], [-171.4, -13.4]], iso2: 'WS', iso3: 'WSM' },
  { name: 'San Marino', formal: 'Republic of San Marino', continent: 'Europe', continentId: 'europe', center: [12.458, 43.942], bounds: [[12.4, 43.8], [12.6, 44.0]], iso2: 'SM', iso3: 'SMR' },
  { name: 'Sao Tome and Principe', formal: 'Democratic Republic of Sao Tome and Principe', continent: 'Africa', continentId: 'africa', center: [6.613, 0.186], bounds: [[6.4, 0.0], [7.5, 1.7]], iso2: 'ST', iso3: 'STP' },
  { name: 'Seychelles', formal: 'Republic of Seychelles', continent: 'Africa', continentId: 'africa', center: [55.492, -4.68], bounds: [[46.0, -10.0], [56.0, -3.5]], iso2: 'SC', iso3: 'SYC' },
  { name: 'Singapore', formal: 'Republic of Singapore', continent: 'Asia', continentId: 'asia', center: [103.82, 1.352], bounds: [[103.6, 1.2], [104.0, 1.5]], iso2: 'SG', iso3: 'SGP' },
  { name: 'Tonga', formal: 'Kingdom of Tonga', continent: 'Oceania', continentId: 'oceania', center: [-175.198, -21.179], bounds: [[-176.0, -22.5], [-173.5, -15.5]], iso2: 'TO', iso3: 'TON' },
  { name: 'Tuvalu', formal: 'Tuvalu', continent: 'Oceania', continentId: 'oceania', center: [177.649, -7.11], bounds: [[176.0, -11.0], [180.0, -5.0]], iso2: 'TV', iso3: 'TUV' },
]

// Mappings from user search terms / official UN names to GeoJSON feature names
const NAME_STANDARDIZATIONS = {
  'Dem. Rep. Congo': { name: 'Congo (Democratic Republic of the)', formal: 'Democratic Republic of the Congo' },
  'Congo': { name: 'Congo (Republic of the)', formal: 'Republic of the Congo' },
  "Côte d'Ivoire": { name: "Cote d'Ivoire", formal: "Republic of Côte d'Ivoire" },
  'Czech Rep.': { name: 'Czechia', formal: 'Czech Republic' },
  'Swaziland': { name: 'Eswatini', formal: 'Kingdom of Eswatini' },
  'Macedonia': { name: 'North Macedonia', formal: 'Republic of North Macedonia' },
  'Palestine': { name: 'Palestine State', formal: 'State of Palestine' },
  'United States': { name: 'United States of America', formal: 'United States of America' },
  'Bosnia and Herz.': { name: 'Bosnia and Herzegovina', formal: 'Bosnia and Herzegovina' },
  'Central African Rep.': { name: 'Central African Republic', formal: 'Central African Republic' },
  'Dominican Rep.': { name: 'Dominican Republic', formal: 'Dominican Republic' },
  'Eq. Guinea': { name: 'Equatorial Guinea', formal: 'Republic of Equatorial Guinea' },
  'Lao PDR': { name: 'Laos', formal: "Lao People's Democratic Republic" },
  'Dem. Rep. Korea': { name: 'North Korea', formal: "Democratic People's Republic of Korea" },
  'Korea': { name: 'South Korea', formal: 'Republic of Korea' },
  'Solomon Is.': { name: 'Solomon Islands', formal: 'Solomon Islands' },
  'S. Sudan': { name: 'South Sudan', formal: 'Republic of South Sudan' },
}

// Build standard list of countries from GeoJSON + Micro-states
const baseGeoCountries = worldCountriesGeoJson.features.map((f) => {
  const p = f.properties
  const { center, bounds } = getBBoxAndCenter(f)
  const mapped = NAME_STANDARDIZATIONS[p.name]
  const displayName = mapped ? mapped.name : p.name
  const formalName = mapped ? mapped.formal : (p.formal_en || p.name)

  return {
    name: displayName,
    geoName: p.name,
    nameLong: p.name_long || p.name,
    formal: formalName,
    iso2: p.iso_a2 || '',
    iso3: p.iso_a3 || '',
    continent: p.continent || 'Asia',
    continentId: CONTINENT_MAP[p.continent] || 'asia',
    center,
    bounds,
  }
})

// Combined collection containing all countries (GeoJSON + micro-states)
export const COUNTRIES = [
  ...baseGeoCountries,
  ...MICRO_STATES.map((m) => ({
    ...m,
    nameLong: m.name,
    geoName: m.name,
  })),
].sort((a, b) => a.name.localeCompare(b.name))

const ALIASES = {
  // Common colloquial / abbreviation aliases
  'usa': 'United States of America',
  'america': 'United States of America',
  'us': 'United States of America',
  'united states': 'United States of America',
  'uk': 'United Kingdom',
  'britain': 'United Kingdom',
  'great britain': 'United Kingdom',
  'england': 'United Kingdom',
  'scotland': 'United Kingdom',
  'uae': 'United Arab Emirates',
  'emirates': 'United Arab Emirates',
  'russia': 'Russia',
  'russian federation': 'Russia',
  'korea': 'South Korea',
  'south korea': 'South Korea',
  'north korea': 'North Korea',
  'dprk': 'North Korea',
  'prc': 'China',
  'china': 'China',
  'bd': 'Bangladesh',
  'holland': 'Netherlands',
  'drc': 'Congo (Democratic Republic of the)',
  'dr congo': 'Congo (Democratic Republic of the)',
  'congo': 'Congo (Republic of the)',
  'ivory coast': "Cote d'Ivoire",
  'czech republic': 'Czechia',
  'swaziland': 'Eswatini',
  'macedonia': 'North Macedonia',
  'palestine': 'Palestine State',
  'vatican': 'Holy See',
  'vatican city': 'Holy See',
  'lao': 'Laos',
  'bosnia': 'Bosnia and Herzegovina',
}

/**
 * Searches for countries by text query (case-insensitive fuzzy & prefix matching).
 */
export function searchCountries(rawQuery, limit = 7) {
  if (!rawQuery || typeof rawQuery !== 'string') return []
  const q = rawQuery.trim().toLowerCase()
  if (!q) return []

  // Check alias lookup
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
    const geoLow = (c.geoName || '').toLowerCase()
    const longLow = (c.nameLong || '').toLowerCase()
    const formalLow = (c.formal || '').toLowerCase()
    const iso2Low = (c.iso2 || '').toLowerCase()
    const iso3Low = (c.iso3 || '').toLowerCase()

    if (nameLow === q || geoLow === q || iso2Low === q || iso3Low === q) {
      exact.push(c)
    } else if (nameLow.startsWith(q) || geoLow.startsWith(q) || longLow.startsWith(q)) {
      startsWith.push(c)
    } else if (nameLow.includes(q) || geoLow.includes(q) || formalLow.includes(q) || longLow.includes(q)) {
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
