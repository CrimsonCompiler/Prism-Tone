/**
 * Bangladesh geographic reference data.
 *
 * Division boundaries are served from /data/bangladesh-divisions.json
 * (GADM 4.1, level 1, simplified with Ramer–Douglas–Peucker eps 0.004).
 *
 * Division centroids below are the administrative-centre coordinates used as
 * NASA POWER point-sampling locations. Values shown for a division are the
 * reanalysis values at that point — they are NOT areal averages.
 */

export const NATIONAL = {
  id: 'national',
  name: 'Bangladesh',
  kind: 'national',
  note: 'Derived — mean of the 8 division-centroid samples',
}

export const DIVISIONS = [
  { id: 'dhaka', name: 'Dhaka', gadm: 'Dhaka', lat: 23.8103, lon: 90.4125 },
  { id: 'chattogram', name: 'Chattogram', gadm: 'Chittagong', lat: 22.3569, lon: 91.7832 },
  { id: 'rajshahi', name: 'Rajshahi', gadm: 'Rajshahi', lat: 24.3745, lon: 88.6042 },
  { id: 'khulna', name: 'Khulna', gadm: 'Khulna', lat: 22.8456, lon: 89.5403 },
  { id: 'barishal', name: 'Barishal', gadm: 'Barisal', lat: 22.701, lon: 90.3535 },
  { id: 'sylhet', name: 'Sylhet', gadm: 'Sylhet', lat: 24.8949, lon: 91.8687 },
  { id: 'rangpur', name: 'Rangpur', gadm: 'Rangpur', lat: 25.7439, lon: 89.2752 },
  { id: 'mymensingh', name: 'Mymensingh', gadm: 'Mymensingh', lat: 24.7471, lon: 90.4203 },
]

export const DIVISION_BY_ID = Object.fromEntries(DIVISIONS.map((d) => [d.id, d]))

/* Display names follow current official Bangladeshi usage
   (Barishal, Chattogram); GADM 4.1 retains the older spellings
   (Barisal, Chittagong) — the gadm field bridges the two. */

export const GEOJSON_URL = '/data/bangladesh-divisions.json'

/* Geographic bounds of the simplified division geometry (lon/lat). */
export const BOUNDS = { minLon: 88.0106, minLat: 20.7411, maxLon: 92.6737, maxLat: 26.6341 }
