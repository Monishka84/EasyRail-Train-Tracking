const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '../src/data/mumbai_local_train_tracking.json');
const backup = path.join(__dirname, '../src/data/mumbai_local_train_tracking.json.multisynth.bak');
const data = JSON.parse(fs.readFileSync(src, 'utf8'));

// Build station order per line
const stationOrder = new Map();
for (const entry of data) {
  const line = entry.train_line || 'unknown';
  if (!stationOrder.has(line)) stationOrder.set(line, []);
  const arr = stationOrder.get(line);
  if (!arr.includes(entry.station_name)) arr.push(entry.station_name);
}

// Station lookup
const stationMap = new Map();
for (const e of data) {
  if (!stationMap.has(e.station_name)) stationMap.set(e.station_name, e);
}

// Define synthetic trains to create (line -> id -> slice length)
const specs = [
  { train_number: 'SIM_WEST_1', line: 'Western', take: 8 },
  { train_number: 'SIM_CENTRAL_2', line: 'Central', take: 10 },
  { train_number: 'SIM_HBR_1', line: 'Harbour', take: 6 }
];

const toAdd = [];
for (const spec of specs) {
  if (!stationOrder.has(spec.line)) continue;
  // skip if already exists
  if (data.some(d => d.train_number === spec.train_number)) continue;

  const order = stationOrder.get(spec.line);
  const take = Math.min(spec.take, order.length);
  // pick a contiguous slice starting at index 0 for simplicity
  const path = order.slice(0, take);

  for (const stationName of path) {
    const s = stationMap.get(stationName) || {};
    toAdd.push({
      train_number: spec.train_number,
      station_name: stationName,
      latitude: s.latitude || 0,
      longitude: s.longitude || 0,
      train_line: spec.line,
      platform_number: s.platform_number || null,
      fast_slow: s.fast_slow || null
    });
  }
}

if (toAdd.length === 0) {
  console.log('No synthetic trains to add (maybe already present or no lines found).');
  process.exit(0);
}

fs.copyFileSync(src, backup);
console.log('Backup written to', backup);

const newData = toAdd.concat(data);
fs.writeFileSync(src, JSON.stringify(newData, null, 2), 'utf8');
console.log('Added synthetic trains:', Array.from(new Set(toAdd.map(t => t.train_number))).join(', '));
