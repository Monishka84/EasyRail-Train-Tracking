const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '../src/data/mumbai_local_train_tracking.json');
const backup = path.join(__dirname, '../src/data/mumbai_local_train_tracking.json.bak_add_shahad_ambivli');
const data = JSON.parse(fs.readFileSync(src, 'utf8'));

// Check if stations already present
const exists = (name) => data.some(e => String(e.station_name).toLowerCase() === name.toLowerCase());
if (exists('Ambivli') && exists('Shahad')) {
  console.log('Both Ambivli and Shahad already present. No changes made.');
  process.exit(0);
}

// Station definitions (approximated coordinates)
const ambivli = {
  train_number: 'STN_AMBIVLI',
  station_name: 'Ambivli',
  latitude: 19.2290,
  longitude: 73.1000,
  train_line: 'Central',
  platform_number: 7,
  fast_slow: 'slow'
};
const shahad = {
  train_number: 'STN_SHAHAD',
  station_name: 'Shahad',
  latitude: 19.2600,
  longitude: 73.1600,
  train_line: 'Central',
  platform_number: 8,
  fast_slow: 'slow'
};

// Helper to insert after first occurrence of a station_name
function insertAfter(targetName, record) {
  const idx = data.findIndex(e => String(e.station_name).toLowerCase() === targetName.toLowerCase());
  if (idx === -1) return false;
  data.splice(idx + 1, 0, record);
  return true;
}

// Backup
fs.copyFileSync(src, backup);
console.log('Backup written to', backup);

let changed = false;
if (!exists('Ambivli')) {
  const inserted = insertAfter('Dombivli', ambivli);
  if (!inserted) {
    // fallback append
    data.push(ambivli);
  }
  console.log('Ambivli added.');
  changed = true;
}
if (!exists('Shahad')) {
  const inserted = insertAfter('Kalyan', shahad);
  if (!inserted) {
    data.push(shahad);
  }
  console.log('Shahad added.');
  changed = true;
}

if (changed) fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8');
console.log('Done.');
