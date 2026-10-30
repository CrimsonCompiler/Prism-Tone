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
    shortTitle: 'Heat',
    accent: '#d98c5f',
    accentSoft: 'rgba(217,140,95,.16)',
    legend: {
      low: 'Cool',
      high: 'Warm',
      gradient: 'linear-gradient(90deg,#2f4b6e 0%,#4f7fb5 24%,#f3e6cd 52%,#d98c5f 78%,#b94f38 100%)',
    },
    headline: 'Air temperature at 2 metres',
    param: 'T2M',
    unit: '°C',
    decimals: 1,
    status: 'live',
    cadence: 'monthly',
    description:
      'Monthly mean near-surface air temperature from the MERRA-2 atmospheric reanalysis, sampled at division centroids.',
    mapping: {
      noticeable: 0.3,
      input: 'Monthly mean temperature (°C), validated against the 1981–2025 record',
      normalize:
        'Linear scale across the observed range of the loaded record at the current scope — the coldest month of 1981–2025 sounds the lowest note, the warmest the highest.',
      parameter: 'Pitch, harmony and tempo — an FM arpeggio over a sine pad, with the chord, root and tempo from the same plan',
      direction: 'Warmer month → higher note in a two-octave D scale. Dorian by default; more than 0.9 °C above normal turns it minor, more than 0.6 °C below turns it major. The value also moves the tempo between 52 and 96 bpm, where one month is two beats.',
      layers: [
        ['harmony pad', 'a three-note chord, held until the mode changes'],
        ['FM arpeggio', 'the mapped pitch plus up to two neighbouring notes from the surrounding months'],
        ['air texture', 'filtered noise whose brightness follows temperature'],
      ],
      missing: 'Missing months add no new note: the pad keeps its chord, and the caption says the value is unavailable rather than inventing one.',
    },
  },
  {
    id: 'PRECTOTCORR',
    index: '02',
    name: 'Rainfall',
    shortTitle: 'Rain',
    accent: '#4f86bd',
    accentSoft: 'rgba(79,134,189,.16)',
    legend: {
      low: 'Dry',
      high: 'Wet',
      gradient: 'linear-gradient(90deg,#b45f43 0%,#d9cbb1 50%,#3f75bb 100%)',
    },
    headline: 'Precipitation rate at surface',
    param: 'PRECTOTCORR',
    unit: 'mm/day',
    decimals: 2,
    status: 'live',
    cadence: 'monthly',
    description:
      'Monthly mean precipitation rate (bias-corrected MERRA-2), in millimetres per day, sampled at division centroids.',
    mapping: {
      noticeable: 0.3,
      input: 'Monthly mean precipitation rate (mm/day)',
      normalize:
        'The rate sets how many marimba notes sound inside the month — 1 to 5 — and how bright the rain wash is, scaled from the dry-season floor (≈0 mm/day) to the monsoon peak of the loaded record.',
      parameter: 'Rhythm — marimba note count and brightness, over a bass root and a shaker',
      direction: 'Heavier rain → denser, brighter marimba figure and a louder filtered wash. Dry month → a single sparse note and a quiet wash. Every month stays in G major pentatonic; one month is two beats and two months make a bar.',
      layers: [
        ['bass', 'a low root on each bar line — every two months'],
        ['marimba figure', '1–5 notes inside each month'],
        ['rain wash', 'band-passed noise and a shaker following the precipitation rate'],
      ],
      missing: 'Missing months produce a rest with no new note, never a fabricated value.',
    },
  },
  {
    id: 'WS10M',
    index: '03',
    name: 'Wind',
    shortTitle: 'Wind',
    accent: '#7f9f8b',
    accentSoft: 'rgba(127,159,139,.16)',
    legend: {
      low: 'Calm',
      high: 'Gusty',
      gradient: 'linear-gradient(90deg,#3e4b45 0%,#8aa294 55%,#e7e2d3 100%)',
    },
    headline: 'Wind speed at 10 metres',
    param: 'WS10M',
    unit: 'm/s',
    decimals: 1,
    status: 'live',
    cadence: 'monthly',
    description:
      'Monthly mean wind speed at 10 m above the surface (MERRA-2), sampled at division centroids.',
    mapping: {
      noticeable: 0.3,
      input: 'Monthly mean wind speed (m/s)',
      normalize:
        'Wind speed sets the weight and cutoff of a two-oscillator drone and the register of a ripple voice; it also moves the tempo between 52 and 96 bpm, where one month is two beats.',
      parameter: 'Timbre and tempo — drone weight, filter brightness and beat length',
      direction: 'Stronger wind → heavier drone, brighter filter and brisker months. Calm → a soft, dark drone. The lead stays in D minor pentatonic; two months make a bar.',
      layers: [
        ['drone', 'two sine oscillators a fifth apart, weighted by wind speed'],
        ['ripple voice', 'a mapped pitch over the drone, one per month'],
        ['wind texture', 'band-passed noise whose brightness and loudness follow speed'],
      ],
      missing: 'Missing months add no new note and say so.',
    },
  },
  {
    id: 'FIRE',
    index: '04',
    name: 'Fire activity',
    shortTitle: 'Fire',
    accent: '#c1573d',
    accentSoft: 'rgba(193,87,61,.18)',
    legend: {
      low: 'Quiet',
      high: 'Burning',
      gradient: 'linear-gradient(90deg,#f9eed8 0%,#e0a36f 55%,#b94f38 100%)',
    },
    headline: 'Active fire detections / fire radiative power',
    param: null,
    unit: null,
    decimals: 0,
    status: 'unavailable',
    cadence: null,
    unavailableReason:
      'NASA FIRMS requires a personal MAP_KEY. The project backend can hold that key and proxy FIRMS, but no key is configured in this build, and the cached hotspot file covers only 12 months of 2025 with no continent attribution. Showing a partial year as a global fire layer would mislead, so this category stays off until a complete, attributable series is available.',
    description:
      'Fire detections and fire radiative power (VIIRS / MODIS) would drive percussive events: each detection a strike, radiative power its intensity.',
  },
  {
    id: 'WATER',
    index: '05',
    name: 'Water storage',
    shortTitle: 'Water',
    accent: '#3f75bb',
    accentSoft: 'rgba(63,117,187,.18)',
    legend: {
      low: 'Dry',
      high: 'Wet',
      gradient: 'linear-gradient(90deg,#b45f43 0%,#d9cbb1 50%,#3f75bb 100%)',
    },
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
    shortTitle: 'Leaf',
    accent: '#739a69',
    accentSoft: 'rgba(115,154,105,.17)',
    legend: {
      low: 'Sparse',
      high: 'Lush',
      gradient: 'linear-gradient(90deg,#8b5b42 0%,#739a69 45%,#b7c498 78%,#f9eed8 100%)',
    },
    headline: 'Vegetation index (NDVI / EVI)',
    param: null,
    unit: null,
    decimals: 0,
    status: 'unavailable',
    cadence: null,
    unavailableReason:
      'MODIS NDVI/EVI products are served through NASA Earthdata, which requires OAuth login — there is no anonymous endpoint. The project backend does carry an NDVI dataset, but it covers Bangladesh divisions rather than the seven continental samples used here. Rather than pass a regional index off as a planetary one, this slot stays off.',
    description:
      'A vegetation index (MODIS NDVI/EVI) would drive harmonic texture: denser canopy → richer overtone stack; sparse or stressed vegetation → a thinner, reedier timbre.',
  },
]

export const VARIABLE_BY_ID = Object.fromEntries(VARIABLES.map((v) => [v.id, v]))
export const LIVE_VARIABLES = VARIABLES.filter((v) => v.status === 'live')
