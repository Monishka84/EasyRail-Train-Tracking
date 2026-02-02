const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '../src/data/mumbai_local_train_tracking.json');
const backup = path.join(__dirname, '../src/data/mumbai_local_train_tracking.json.bak_chain');
const data = JSON.parse(fs.readFileSync(src, 'utf8'));

// Station records (approx coords from nearby existing stations or approximations)
const shahad = {
  train_number: 'STN_SHAHAD',
  station_name: 'Shahad',
  latitude: 19.2440,
  longitude: 73.1330,
  train_line: 'Central',
  platform_number: 8,
  fast_slow: 'slow'
};
const ambivli = {
  train_number: 'STN_AMBIVLI',
  station_name: 'Ambivli',
  latitude: 19.2200,
  longitude: 73.1200,
  train_line: 'Central',
  platform_number: 7,
  fast_slow: 'slow'
};
const titwala = {
  train_number: 'STN_TITWALA',
  station_name: 'Titwala',
  latitude: 19.2896,
  longitude: 73.2044,
  train_line: 'Central',
  platform_number: 8,
  fast_slow: 'slow'
};

const removeNames = new Set(['shahad','ambivli','titwala']);
const filtered = data.filter(e => !removeNames.has(String(e.station_name).toLowerCase()));

// find index of Kalyan
const kalyanIdx = filtered.findIndex(e => String(e.station_name).toLowerCase() === 'kalyan');
let work = filtered.slice();

if (kalyanIdx !== -1) {
  // insert Shahad after Kalyan
  work.splice(kalyanIdx + 1, 0, shahad);
  // find Shahad index
  const shahadIdx = work.findIndex(e => String(e.station_name).toLowerCase() === 'shahad');
  // insert Ambivli after Shahad
  work.splice(shahadIdx + 1, 0, ambivli);
  // insert Titwala after Ambivli
  const ambIdx = shahadIdx + 1; // ambivli index
  work.splice(ambIdx + 1, 0, titwala);
} else {
  // fallback: append in order
  work = work.concat([shahad, ambivli, titwala]);
}

// Backup and write
fs.copyFileSync(src, backup);
fs.writeFileSync(src, JSON.stringify(work, null, 2), 'utf8');
console.log('Inserted Shahad -> Ambivli -> Titwala (backup at', backup + ')');
