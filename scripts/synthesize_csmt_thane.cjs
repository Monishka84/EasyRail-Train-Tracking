const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '../src/data/mumbai_local_train_tracking.json');
const backup = path.join(__dirname, '../src/data/mumbai_local_train_tracking.json.bak2');
const data = JSON.parse(fs.readFileSync(src, 'utf8'));

// Build station order per line
const stationOrder = new Map();
for (const entry of data) {
  const line = entry.train_line || 'unknown';
  if (!stationOrder.has(line)) stationOrder.set(line, []);
  const arr = stationOrder.get(line);
  if (!arr.includes(entry.station_name)) arr.push(entry.station_name);
}

const order = stationOrder.get('Central') || [];
const srcName = 'CSMT';
const destName = 'Thane';
const srcIdx = order.indexOf(srcName);
const destIdx = order.indexOf(destName);
if (srcIdx === -1 || destIdx === -1) {
  console.error('Could not find source/destination in Central order');
  process.exit(1);
}
let pathStations = null;
if (srcIdx <= destIdx) pathStations = order.slice(srcIdx, destIdx + 1);
else pathStations = order.slice(destIdx, srcIdx + 1).reverse();

// Build stationMap for coords
const stationMap = new Map();
for (const e of data) {
  if (!stationMap.has(e.station_name)) stationMap.set(e.station_name, e);
}

const trainNumber = 'SIM_CS_TH_1';
const synthesized = pathStations.map((stationName) => {
  const s = stationMap.get(stationName) || {};
  return {
    train_number: trainNumber,
    station_name: stationName,
    latitude: s.latitude || 0,
    longitude: s.longitude || 0,
    train_line: s.train_line || 'Central',
    platform_number: s.platform_number || null,
    fast_slow: s.fast_slow || null
  };
});

fs.copyFileSync(src, backup);
const newData = synthesized.concat(data);
fs.writeFileSync(src, JSON.stringify(newData, null, 2), 'utf8');
console.log('Added synthetic train', trainNumber, 'with path:', pathStations.join(' -> '));
