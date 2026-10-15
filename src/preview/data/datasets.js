/**
 * Environmental variable registry for the Preview experience.
 *
 * LIVE datasets are retrieved at runtime from the NASA POWER API
 * (https://power.larc.nasa.gov) — keyless, CORS-enabled — and are only
 * presented once a real response has been validated.
 *
 * The remaining categories are declared UNAVAILABLE with the specific
 * technical reason. They are never simulated.
 */

export const YEAR_MIN = 1981
export const YEAR_MAX = 2025
/* POWER monthly is complete through 2025; 2026 (Jan–Aug) exists at the
   source but is excluded here so yearly comparisons stay complete. */

export const BASELINE = { start: 1991, end: 2020 }
/* WMO standard climate-normal period, used for derived comparisons. */

export const SOURCE = {
  name: 'NASA POWER',
  full: 'NASA Prediction Of Worldwide Energy Resources',
  dataset: 'MERRA-2 reanalysis, monthly (source native resolution)',
  url: 'https://power.larc.nasa.gov',
  apiVersion: null, // filled from the live response header at load time
}

export const VARIABLES = [
  {
    id: 'T2M',
    index: '01',
    name: 'Temperature',
    headline: 'Air temperature at 2 metres',
    param: 'T2M',
    unit: '°C',
    decimals: 1,
    status: 'live',
    cadence: 'monthly',
    description:
      'Monthly mean near-surface air temperature from the MERRA-2 atmospheric reanalysis, sampled at division centroids.',
    mapping: {
      input: 'Monthly mean temperature (°C), validated against the 1981–2025 record',
      normalize:
        'Linear scale across the observed range of the loaded record at the current scope — the coldest month of 1981–2025 sounds the lowest note, the warmest the highest.',
      parameter: 'Pitch of a warm triangle-oscillator voice',
      direction: 'Warmer month → higher pitch. Cooler month → lower pitch.',
      layers: [
        ['data voice', 'the mapped pitch, one note per month'],
        ['time pulse', 'a soft tick marking each month as it plays'],
      ],
      missing: 'Missing months are silent: the pulse still marks the step and the caption says the value is unavailable.',
    },
  },
  {
    id: 'PRECTOTCORR',
    index: '02',
    name: 'Rainfall',
    headline: 'Precipitation rate at surface',
    param: 'PRECTOTCORR',
    unit: 'mm/day',
    decimals: 2,
    status: 'live',
    cadence: 'monthly',
    description:
      'Monthly mean precipitation rate (bias-corrected MERRA-2), in millimetres per day, sampled at division centroids.',
    mapping: {
      input: 'Monthly mean precipitation rate (mm/day)',
      normalize:
        'The rate drives note density: a fixed pentatonic figure is repeated from 1 to 8 times, scaled from the dry-season floor (≈0 mm/day) to the monsoon peak of the loaded record.',
      parameter: 'Rhythm — number and brightness of notes in each month event',
      direction: 'Heavier rain → denser, brighter rhythmic figure. Dry month → a single sparse note.',
      layers: [
        ['data voice', 'the rain figure, one bar per month'],
        ['time pulse', 'a soft tick marking each month as it plays'],
      ],
      missing: 'Missing months produce a rest with a tick, never a fabricated note.',
    },
  },
  {
    id: 'WS10M',
    index: '03',
    name: 'Wind',
    headline: 'Wind speed at 10 metres',
    param: 'WS10M',
    unit: 'm/s',
    decimals: 1,
    status: 'live',
    cadence: 'monthly',
    description:
      'Monthly mean wind speed at 10 m above the surface (MERRA-2), sampled at division centroids.',
    mapping: {
      input: 'Monthly mean wind speed (m/s)',
      normalize:
        'Wind speed sets the colour of a filtered-noise layer — its cutoff frequency and loudness rise with speed — and slightly shortens each month step at higher speeds.',
      parameter: 'Timbre + tempo — band-passed noise brightness and playback rate',
      direction: 'Stronger wind → brighter, louder noise and a slightly faster walk through the months. Calm → soft, dark wash.',
      layers: [
        ['data voice', 'the wind layer for each month'],
        ['time pulse', 'a soft tick marking each month as it plays'],
      ],
      missing: 'Missing months drop the wind layer for that step and say so.',
    },
  },
  {
    id: 'FIRE',
    index: '04',
    name: 'Fire activity',
    headline: 'Active fire detections / fire radiative power',
    param: null,
    unit: null,
    decimals: 0,
    status: 'unavailable',
    cadence: null,
    unavailableReason:
      'NASA FIRMS requires a personal MAP_KEY for API access, and we do not embed private credentials in client-side code. Without a key every value would be fabricated — so this category stays off until a backend proxy can hold the key securely.',
    description:
      'Fire detections and fire radiative power (VIIRS / MODIS) would drive percussive events: each detection a strike, radiative power its intensity.',
  },
  {
    id: 'WATER',
    index: '05',
    name: 'Water storage',
    headline: 'Terrestrial water storage anomaly',
    param: null,
    unit: null,
    decimals: 0,
    status: 'unavailable',
    cadence: null,
    unavailableReason:
      'GRACE / GRACE-FO mascon data has no keyless public API endpoint suitable for direct browser use. Bangladesh has no local ice measurements — polar ice variables are scientifically meaningless here — so this slot remains a clearly-labelled gap rather than a disguised substitute.',
    description:
      'Terrestrial water storage anomaly (GRACE-FO) would drive a low-frequency layer: deeper negative anomaly → lower, quieter bass; positive → fuller low end.',
  },
  {
    id: 'VEG',
    index: '06',
    name: 'Vegetation',
    headline: 'Vegetation index (NDVI / EVI)',
    param: null,
    unit: null,
    decimals: 0,
    status: 'unavailable',
    cadence: null,
    unavailableReason:
      'MODIS NDVI/EVI products are served through NASA Earthdata, which requires OAuth login — there is no anonymous endpoint. Until an authenticated backend exists, no vegetation values are shown, because invented greenness would be worse than none.',
    description:
      'A vegetation index (MODIS NDVI/EVI) would drive harmonic texture: denser canopy → richer overtone stack; sparse or stressed vegetation → a thinner, reedier timbre.',
  },
]

export const VARIABLE_BY_ID = Object.fromEntries(VARIABLES.map((v) => [v.id, v]))
export const LIVE_VARIABLES = VARIABLES.filter((v) => v.status === 'live')
