// Fix OSRM geometry for roads with interpolated coordinates
// Run with: node scripts/fix_osrm_roads.mjs (requires network - BypassSandbox)

import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '..', 'src', 'data', 'traffic_roads.json');
const OSRM_BASE = 'https://routing.openstreetmap.de/routed-car/route/v1/driving/';
const DELAY_MS = 600;

// Waypoints for each bad road (lon, lat)
const ROAD_WAYPOINTS = {
  // Autostrady
  'A8':   [[16.9336, 51.0929], [17.0516, 51.1082], [17.3614, 51.1286], [17.6194, 51.1540]], // A8 Wrocław obwodnica
  'A18':  [[15.0014, 51.9490], [15.5000, 51.7000], [15.7230, 51.5900], [16.0300, 51.4900]], // A18 Legnica-Olszyna

  // Drogi ekspresowe
  'S2':   [[20.9700, 52.1600], [21.0300, 52.1300], [21.1500, 52.1000], [21.3000, 52.0700]], // S2 Warszawa południe
  'S14':  [[19.3800, 51.7700], [19.5300, 51.7300], [19.7000, 51.7500], [19.8800, 51.7900]], // S14 Łódź obwodnica zachodnia
  'S16':  [[19.5500, 53.7800], [20.0000, 53.8000], [20.4000, 53.9000], [21.0000, 54.0300]], // S16 Olsztyn-Ełk

  // Drogi krajowe
  'DK35': [[16.9400, 51.0700], [16.8000, 50.9000], [16.5500, 50.6700], [16.3000, 50.4400]], // DK35 Wrocław-Kudowa
  'DK75': [[20.5100, 49.9500], [20.4000, 49.7500], [20.2800, 49.5700], [20.0800, 49.4000]], // DK75 Bochnia-Nowy Sącz

  // Drogi miejskie / arterie
  'GDA_Slow':     [[18.6080, 54.3550], [18.5790, 54.3760], [18.5450, 54.3980]], // Gdańsk - Słowackiego
  'SZCZ_Struga':  [[14.5450, 53.4350], [14.5250, 53.4250], [14.5050, 53.4150]], // Szczecin - Struga
  'BYD_Forda':    [[18.0100, 53.1350], [18.0300, 53.1180], [18.0500, 53.1050]], // Bydgoszcz - Fordońska
  'TOR_Lubicka':  [[18.5700, 53.0150], [18.6050, 53.0070], [18.6350, 52.9980]], // Toruń - Lubicka
  'LUB_Tysiac':   [[22.5700, 51.2650], [22.5950, 51.2500], [22.6200, 51.2350]], // Lublin - Tysiąclecia
  'BIA_Pilsud':   [[23.1600, 53.1350], [23.1750, 53.1250], [23.1900, 53.1100]], // Białystok - Piłsudskiego
  'RZE_Powst':    [[22.0000, 50.0450], [22.0200, 50.0300], [22.0400, 50.0150], [22.0600, 50.0000]], // Rzeszów - Powstańców
  'KIE_Solid':    [[20.6450, 50.8750], [20.6650, 50.8620], [20.6850, 50.8500]], // Kielce - Solidarności
  'CZE_WP':       [[19.1000, 50.8120], [19.1200, 50.8020], [19.1400, 50.7920]], // Częstochowa - Wolności Polskiej
  'RAD_Kielecka': [[21.1400, 51.4050], [21.1600, 51.3950], [21.1800, 51.3800]], // Radom - Kielecka
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchOSRM(waypoints) {
  const coords = waypoints.map(([lon, lat]) => `${lon},${lat}`).join(';');
  const url = `${OSRM_BASE}${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.code !== 'Ok') throw new Error(`OSRM: ${data.code}`);
  return data.routes[0].geometry.coordinates; // [[lon,lat], ...]
}

function limitPoints(coords, max = 300) {
  if (coords.length <= max) return coords;
  const step = Math.ceil(coords.length / max);
  const result = [];
  for (let i = 0; i < coords.length; i += step) result.push(coords[i]);
  if (result[result.length - 1] !== coords[coords.length - 1]) {
    result.push(coords[coords.length - 1]);
  }
  return result;
}

async function main() {
  const roads = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const roadMap = new Map(roads.map(r => [r.id, r]));
  
  const badIds = Object.keys(ROAD_WAYPOINTS);
  console.log(`\nFetching OSRM geometry for ${badIds.length} roads...\n`);
  
  let fixed = 0, failed = 0;
  
  for (const id of badIds) {
    const waypoints = ROAD_WAYPOINTS[id];
    const road = roadMap.get(id);
    if (!road) {
      console.log(`⚠️  ${id} - not found in JSON, skipping`);
      continue;
    }
    
    try {
      await sleep(DELAY_MS);
      const coords = await fetchOSRM(waypoints);
      const limited = limitPoints(coords);
      road.coordinates = limited;
      console.log(`✅ ${id} - ${limited.length} pts`);
      fixed++;
    } catch (err) {
      console.log(`❌ ${id} - OSRM failed: ${err.message} (keeping original)`);
      failed++;
    }
  }
  
  const result = Array.from(roadMap.values());
  fs.writeFileSync(DATA_PATH, JSON.stringify(result, null, 2));
  console.log(`\nDone: ${fixed} fixed, ${failed} failed. Total roads: ${result.length}`);
}

main().catch(console.error);

