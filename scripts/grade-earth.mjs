/* Offline cinematic regrade of the Earth textures.
 * Produces *-graded.* files alongside the originals (originals untouched).
 * Run: node scripts/grade-earth.mjs
 */
import Jimp from 'jimp'

const DIR = 'public/textures'
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

function lumOf(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/* Filmic S-curve: gentle pivot contrast, soft highlight shoulder, lifted toe. */
function gradeCurve(x) {
  let y = 0.5 + (x - 0.5) * 1.14 // pivot contrast
  const over = Math.max(0, y - 0.72) // soft highlight rolloff
  y = Math.min(y, 0.72 + over / (1 + over * 2.2))
  y = y + 0.028 * (1 - y) * (1 - y) * (1 - y) // subtle toe lift
  return clamp01(y)
}

function sampleGray(img, lon, lat) {
  const w = img.bitmap.width
  const h = img.bitmap.height
  const x = Math.min(w - 1, Math.floor(((lon + 180) / 360) * w))
  const y = Math.min(h - 1, Math.floor(((90 - lat) / 180) * h))
  const i = (y * w + x) * 4
  const d = img.bitmap.data
  return (d[i] + d[i + 1] + d[i + 2]) / 3 / 255
}

/* ---------------- DAY MAP ---------------- */
async function gradeDay() {
  const day = await Jimp.read(`${DIR}/earth-day.jpg`)
  const water = await Jimp.read(`${DIR}/earth-water.png`)
  console.log('day:', day.bitmap.width, 'x', day.bitmap.height)

  // Determine water-mask polarity from two reference points.
  const pacific = sampleGray(water, -150, 0) // open ocean
  const sahara = sampleGray(water, 12, 22) // land
  const whiteIsOcean = pacific > sahara
  console.log('water mask — pacific:', pacific.toFixed(2), 'sahara:', sahara.toFixed(2), '→ whiteIsOcean =', whiteIsOcean)

  const W = day.bitmap.width
  const H = day.bitmap.height
  const d = day.bitmap.data
  const mw = water.bitmap.width
  const mh = water.bitmap.height
  const md = water.bitmap.data

  for (let y = 0; y < H; y++) {
    const wy = Math.min(mh - 1, Math.floor((y / H) * mh))
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4
      const wx = Math.min(mw - 1, Math.floor((x / W) * mw))
      const wi = (wy * mw + wx) * 4
      const m = (md[wi] + md[wi + 1] + md[wi + 2]) / 3 / 255
      const ocean = whiteIsOcean ? m > 0.5 : m < 0.5

      let r = d[i] / 255
      let g = d[i + 1] / 255
      let b = d[i + 2] / 255

      // Warm white balance (film print feel)
      r *= 1.045
      b *= 0.93

      let lum = lumOf(r, g, b)
      const mx = Math.max(r, g, b)
      const mn = Math.min(r, g, b)
      const sat = mx > 0 ? (mx - mn) / mx : 0

      if (ocean) {
        // Deep ocean blue with a subtle teal bias, slightly deepened
        r = lum + (r - lum) * 0.96
        g = lum + (g - lum) * 1.04 + 0.012
        b = lum + (b - lum) * 1.08
        const nl = Math.pow(lumOf(r, g, b), 1.16) * 0.95
        const k = nl / (lumOf(r, g, b) || 1)
        r *= k
        g *= k
        b *= k
      } else if (lum > 0.78 && sat < 0.28) {
        // Snow / ice → soft ivory, never harsh pure white
        r = Math.min(r * 1.005 + 0.018, 0.955)
        g = Math.min(g * 0.99 + 0.012, 0.945)
        b = Math.min(b * 0.955 + 0.006, 0.885)
      } else {
        // Land → warm muted brown / olive / sand / earthy beige
        r = lum + (r - lum) * 0.94 + 0.014
        g = lum + (g - lum) * 0.9
        b = lum + (b - lum) * 0.8 - 0.006
      }

      // Global film-like mute
      lum = lumOf(r, g, b)
      const ds = 0.93
      r = lum + (r - lum) * ds
      g = lum + (g - lum) * ds
      b = lum + (b - lum) * ds

      // Filmic curve
      r = gradeCurve(r)
      g = gradeCurve(g)
      b = gradeCurve(b)

      d[i] = Math.round(clamp01(r) * 255)
      d[i + 1] = Math.round(clamp01(g) * 255)
      d[i + 2] = Math.round(clamp01(b) * 255)
    }
  }

  await day.quality(90).writeAsync(`${DIR}/earth-day-graded.jpg`)
  await day.clone().resize(768, Jimp.AUTO).quality(88).writeAsync(`${DIR}/preview-day-graded.jpg`)
  console.log('wrote earth-day-graded.jpg')
}

/* ---------------- NIGHT MAP ---------------- */
async function gradeNight() {
  const night = await Jimp.read(`${DIR}/earth-night.jpg`)
  console.log('night:', night.bitmap.width, 'x', night.bitmap.height)
  const W = night.bitmap.width
  const H = night.bitmap.height
  const d = night.bitmap.data

  for (let i = 0; i < W * H * 4; i += 4) {
    let r = d[i] / 255
    let g = d[i + 1] / 255
    let b = d[i + 2] / 255
    const lum = lumOf(r, g, b)

    // Deep, dark night side
    const nl = Math.pow(lum, 1.5) * 0.82
    const k = nl / (lum || 1)
    r *= k
    g *= k
    b *= k

    // City lights glow warm amber, not blue-white
    const w = clamp01(nl * 3.2)
    r = r * (1 + w * 0.22) + w * 0.012
    g = g * (1 + w * 0.04)
    b = b * (1 - w * 0.38)

    d[i] = Math.round(clamp01(r) * 255)
    d[i + 1] = Math.round(clamp01(g) * 255)
    d[i + 2] = Math.round(clamp01(b) * 255)
  }

  await night.quality(90).writeAsync(`${DIR}/earth-night-graded.jpg`)
  await night.clone().resize(768, Jimp.AUTO).quality(88).writeAsync(`${DIR}/preview-night-graded.jpg`)
  console.log('wrote earth-night-graded.jpg')
}

/* ---------------- CLOUDS (barely-there warm grade) ---------------- */
async function gradeClouds() {
  const c = await Jimp.read(`${DIR}/earth-clouds.png`)
  const W = c.bitmap.width
  const H = c.bitmap.height
  const d = c.bitmap.data

  for (let i = 0; i < W * H * 4; i += 4) {
    let r = d[i] / 255
    let g = d[i + 1] / 255
    let b = d[i + 2] / 255
    r = r * 1.012 + 0.004
    b = b * 0.976
    d[i] = Math.round(clamp01(r) * 255)
    d[i + 1] = Math.round(clamp01(g) * 255)
    d[i + 2] = Math.round(clamp01(b) * 255)
  }

  await c.writeAsync(`${DIR}/earth-clouds-graded.png`)
  console.log('wrote earth-clouds-graded.png')
}

await gradeDay()
await gradeNight()
await gradeClouds()
console.log('done')
