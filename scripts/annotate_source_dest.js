const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'data', 'mumbai_local_train_tracking.json');
const outputPath = path.join(__dirname, '..', 'data', 'mumbai_local_train_tracking_enriched.json');

function safeParse(jsonStr) {
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // try to strip comments (/* ... */) and trailing commas
    const stripped = jsonStr
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(stripped);
  }
}

const raw = fs.readFileSync(inputPath, 'utf8');
const data = safeParse(raw);

const groups = new Map();
for (const entry of data) {
  const key = entry.train_number;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(entry);
}

// Determine source (first) and destination (last) per train
const trainEndpoints = new Map();
for (const [train, entries] of groups.entries()) {
  const first = entries[0];
  const last = entries[entries.length - 1];
  trainEndpoints.set(train, {
    source_station: first.station_name,
    destination_station: last.station_name
  });
}

// Annotate each record
const enriched = data.map(entry => {
  const endpoints = trainEndpoints.get(entry.train_number) || { source_station: null, destination_station: null };
  return {
    ...entry,
    source_station: endpoints.source_station,
    destination_station: endpoints.destination_station
  };
});

fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2), 'utf8');
console.log('Wrote enriched file to', outputPath);
