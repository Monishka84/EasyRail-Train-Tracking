const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/mumbai_local_train_tracking.json'), 'utf8'));

// Build station order per line preserving first seen order
const stationOrder = new Map();
for (const entry of data) {
  const line = entry.train_line || 'unknown';
  if (!stationOrder.has(line)) stationOrder.set(line, []);
  const arr = stationOrder.get(line);
  if (!arr.includes(entry.station_name)) arr.push(entry.station_name);
}

const centralOrder = stationOrder.get('Central') || [];
console.log('Central order count:', centralOrder.length);

// Find path from CSMT to Thane
const src = 'CSMT';
const dest = 'Thane';
const srcIdx = centralOrder.indexOf(src);
const destIdx = centralOrder.indexOf(dest);
if (srcIdx === -1 || destIdx === -1) {
  console.log('Source or destination not found in Central order');
  process.exit(0);
}

let path = null;
if (srcIdx <= destIdx) path = centralOrder.slice(srcIdx, destIdx + 1);
else path = centralOrder.slice(destIdx, srcIdx + 1).reverse();

console.log('Path CSMT -> Thane:', path.join(' -> '));

// Print station lat/lng for the path
const stationMap = new Map();
for (const e of data) {
  if (!stationMap.has(e.station_name)) stationMap.set(e.station_name, e);
}

console.log('Coordinates:');
for (const s of path) {
  const info = stationMap.get(s);
  console.log(s, info ? `${info.latitude}, ${info.longitude}` : 'missing');
}

// Also show a sample train that has source CSMT or destination Thane
const trainsMap = new Map();
for (const e of data) {
  const k = e.train_number;
  if (!trainsMap.has(k)) trainsMap.set(k, []);
  trainsMap.get(k).push(e);
}

for (const [tn, entries] of trainsMap.entries()) {
  const srcName = entries[0].source_station || entries[0].station_name;
  const destName = entries[0].destination_station || entries[entries.length - 1].station_name;
  if (String(srcName).toLowerCase() === src.toLowerCase() || String(destName).toLowerCase() === dest.toLowerCase()) {
    console.log('Train', tn, 'observed stations:', entries.map(e => e.station_name).join(' -> '));
  }
}
