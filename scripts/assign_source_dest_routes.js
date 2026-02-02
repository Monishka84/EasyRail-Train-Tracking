const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'data', 'mumbai_local_train_tracking.json');
const outputPath = path.join(__dirname, '..', 'data', 'mumbai_local_train_tracking_enriched.json');

function safeParse(jsonStr) {
  try { return JSON.parse(jsonStr); } catch (e) {
    const stripped = jsonStr.replace(/\/\*[\s\S]*?\*\//g, '').replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(stripped);
  }
}

const raw = fs.readFileSync(inputPath, 'utf8');
const data = safeParse(raw);

// Build station order per line (first-seen order)
const stationOrder = new Map();
for (const rec of data) {
  const line = rec.train_line || 'unknown';
  if (!stationOrder.has(line)) stationOrder.set(line, []);
  const arr = stationOrder.get(line);
  if (!arr.includes(rec.station_name)) arr.push(rec.station_name);
}

// Group entries by train_number and annotate source/destination
const groups = new Map();
for (const rec of data) {
  const key = rec.train_number;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(rec);
}

const endpoints = new Map();
for (const [train, entries] of groups.entries()) {
  // pick source as first entry's station_name (existing)
  const first = entries[0];
  const line = first.train_line || 'unknown';
  const order = stationOrder.get(line) || [];
  const src = first.station_name;
  // find next station in order (if exists), else pick a different station randomly
  let dest = null;
  const idx = order.indexOf(src);
  if (idx >= 0 && order.length > 1) {
    // choose a destination some stations ahead to make route realistic
    const ahead = (idx + Math.max(1, Math.floor(order.length / 3))) % order.length;
    dest = order[ahead] === src ? order[(idx + 1) % order.length] : order[ahead];
  } else {
    // fallback to any station with same line different from src
    dest = order.find(s => s !== src) || src;
  }
  endpoints.set(train, { source_station: src, destination_station: dest });
}

// Annotate each record
const enriched = data.map(rec => {
  const ep = endpoints.get(rec.train_number) || { source_station: rec.station_name, destination_station: rec.station_name };
  return { ...rec, source_station: ep.source_station, destination_station: ep.destination_station };
});

fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2), 'utf8');
console.log('Wrote enriched file to', outputPath);
