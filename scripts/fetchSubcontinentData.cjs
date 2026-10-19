const fs = require('fs');

const REGIONS = [
  { id: 'bangladesh', name: 'Bangladesh', lat: 23.6850, lon: 90.3563 },
  { id: 'india', name: 'India', lat: 20.5937, lon: 78.9629 },
  { id: 'pakistan', name: 'Pakistan', lat: 30.3753, lon: 69.3451 },
  { id: 'nepal', name: 'Nepal', lat: 28.3949, lon: 84.1240 },
  { id: 'bhutan', name: 'Bhutan', lat: 27.5142, lon: 90.4336 },
  { id: 'sri_lanka', name: 'Sri Lanka', lat: 7.8731, lon: 80.7718 },
  { id: 'maldives', name: 'Maldives', lat: 3.2028, lon: 73.2207 }
];

async function fetchRegionWithRetry(region, maxRetries = 3) {
  const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M,PRECTOTCORR,WS10M&community=AG&longitude=${region.lon}&latitude=${region.lat}&format=JSON&start=1981&end=2025`;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching NASA POWER for ${region.name} (attempt ${attempt})...`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const params = json.properties.parameter;

      const cleaned = { T2M: {}, PRECTOTCORR: {}, WS10M: {} };
      for (const p of ['T2M', 'PRECTOTCORR', 'WS10M']) {
        if (!params[p]) continue;
        for (const [k, v] of Object.entries(params[p])) {
          if (k.endsWith('13')) continue; // Skip annual summary
          cleaned[p][k] = v === -999 ? null : v;
        }
      }
      return { id: region.id, data: cleaned };
    } catch (e) {
      console.warn(`Attempt ${attempt} for ${region.name} failed: ${e.message}`);
      if (attempt === maxRetries) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function main() {
  let existing = { series: {}, outcomes: {} };
  try {
    if (fs.existsSync('src/preview/data/subcontinentPowerBaseline.json')) {
      existing = JSON.parse(fs.readFileSync('src/preview/data/subcontinentPowerBaseline.json', 'utf8'));
    }
  } catch { }

  const series = existing.series || {};
  const outcomes = existing.outcomes || {};

  for (const reg of REGIONS) {
    if (series[reg.id] && outcomes[reg.id] && outcomes[reg.id].ok) {
      console.log(`✓ ${reg.name} already cached`);
      continue;
    }
    try {
      const res = await fetchRegionWithRetry(reg);
      series[reg.id] = res.data;
      outcomes[reg.id] = { ok: true, status: 200, points: Object.keys(res.data.T2M).length };
      console.log(`✓ ${reg.name} saved successfully`);
    } catch (e) {
      console.error(`✗ ${reg.name} error:`, e.message);
      outcomes[reg.id] = { ok: false, error: { kind: 'fetch_error', message: e.message } };
    }
  }

  const payload = {
    series,
    outcomes,
    meta: {
      fetchedAt: new Date().toISOString(),
      apiVersion: 'NASA POWER v2.5.2 MERRA-2',
      scope: 'South Asian Subcontinent'
    }
  };

  fs.writeFileSync('src/preview/data/subcontinentPowerBaseline.json', JSON.stringify(payload));
  console.log('All available regions written to subcontinentPowerBaseline.json');
}

main().catch(console.error);
