const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '../src/data/mumbai_local_train_tracking.json');
const backup = path.join(__dirname, '../src/data/mumbai_local_train_tracking.json.bak');

const data = JSON.parse(fs.readFileSync(src, 'utf8'));

// Build station lookup (first occurrence)
const stationMap = new Map();
for (const e of data) {
  if (!stationMap.has(e.station_name)) stationMap.set(e.station_name, e);
}

// Define desired route for ML30000 (Western line example)
const route = [
  'Churchgate',
  'Marine Lines',
  'Grant Road',
  'Mumbai Central',
  'Dadar',
  'Bandra',
  'Andheri',
  'Borivali'
];

// Synthesize entries for ML30000
const trainNumber = 'ML30000';
const synthesized = route.map((stationName, idx) => {
  const s = stationMap.get(stationName) || {};
  return {
    train_number: trainNumber,
    station_name: stationName,
    latitude: s.latitude || 0,
    longitude: s.longitude || 0,
    train_line: s.train_line || 'Western',
    platform_number: s.platform_number || null,
    fast_slow: s.fast_slow || null
  };
});

// Backup original file
fs.copyFileSync(src, backup);
console.log('Backup written to', backup);

// Remove existing entries for this train and insert synthesized ones at front
const filtered = data.filter(e => e.train_number !== trainNumber);
const newData = synthesized.concat(filtered);

fs.writeFileSync(src, JSON.stringify(newData, null, 2), 'utf8');
console.log('Wrote synthesized route for', trainNumber, 'to', src);
