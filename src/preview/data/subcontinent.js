/**
 * South Asian Subcontinent geographic reference data.
 *
 * Country/region boundaries are served from /data/subcontinent-regions.json
 * (Natural Earth, 1:50m cultural admin-0 countries).
 *
 * Region centroids below are coordinates used as NASA POWER sampling locations.
 */

export const REGIONAL = {
  id: 'regional',
  name: 'South Asia',
  kind: 'regional',
  note: 'Derived — mean of the 7 subcontinent region samples',
}

export const REGIONS = [
  { id: 'bangladesh', name: 'Bangladesh', code: 'BGD', lat: 23.6850, lon: 90.3563, capital: 'Dhaka' },
  { id: 'india', name: 'India', code: 'IND', lat: 20.5937, lon: 78.9629, capital: 'New Delhi' },
  { id: 'pakistan', name: 'Pakistan', code: 'PAK', lat: 30.3753, lon: 69.3451, capital: 'Islamabad' },
  { id: 'nepal', name: 'Nepal', code: 'NPL', lat: 28.3949, lon: 84.1240, capital: 'Kathmandu' },
  { id: 'bhutan', name: 'Bhutan', code: 'BTN', lat: 27.5142, lon: 90.4336, capital: 'Thimphu' },
  { id: 'sri_lanka', name: 'Sri Lanka', code: 'LKA', lat: 7.8731, lon: 80.7718, capital: 'Colombo' },
  { id: 'maldives', name: 'Maldives', code: 'MDV', lat: 3.2028, lon: 73.2207, capital: 'Malé' },
]

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]))

// Backward compatibility alias for any component still importing DIVISIONS / DIVISION_BY_ID
export const DIVISIONS = REGIONS
export const DIVISION_BY_ID = REGION_BY_ID
export const NATIONAL = REGIONAL

export const GEOJSON_URL = '/data/subcontinent-regions.json'

/* Geographic bounds of the Subcontinent (lon/lat). */
export const BOUNDS = { minLon: 60.5, minLat: 1.5, maxLon: 98.0, maxLat: 37.5 }
