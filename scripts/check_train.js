const path = require('path');
const data = require(path.join(__dirname, '../src/data/mumbai_local_train_tracking.json'));

const trains = new Map();
for (const e of data) {
  const k = e.train_number;
  if (!trains.has(k)) trains.set(k, []);
  trains.get(k).push(e);
}

const firstTrain = Array.from(trains.keys())[0];
const entries = trains.get(firstTrain) || [];
if (!entries.length) {
  console.log('No train entries found in dataset');
  process.exit(0);
}

const line = entries[0].train_line || 'unknown';
const order = [...new Set(data.filter(d => d.train_line === line).map(d => d.station_name))];

const explicitSource = entries[0].source_station || entries[0].station_name;
const explicitDest = entries[0].destination_station || entries[entries.length - 1].station_name;

let pathStations = null;
const srcIdx = order.indexOf(String(explicitSource));
const destIdx = order.indexOf(String(explicitDest));
if (srcIdx !== -1 && destIdx !== -1) {
  if (srcIdx <= destIdx) pathStations = order.slice(srcIdx, destIdx + 1);
  else pathStations = order.slice(destIdx, srcIdx + 1).reverse();
}
if (!pathStations) pathStations = entries.map(e => e.station_name);

console.log('Sample Train:', firstTrain);
console.log('Line:', line);
console.log('Source (explicit):', explicitSource);
console.log('Destination (explicit):', explicitDest);
console.log('Ordered path stations between source and destination:');
console.log(pathStations.join(' -> '));
console.log('\nObserved stations for this train:');
console.log(entries.map(e => e.station_name).join(' -> '));

console.log('\nGenerated locationHistory (station, lat, lng):');
const locationHistory = pathStations.map((stationName, i) => {
  const found = entries.find(x => x.station_name === stationName) || data.find(x => x.station_name === stationName);
  return {
    idx: i,
    station: stationName,
    latitude: found ? found.latitude : null,
    longitude: found ? found.longitude : null
  };
});
console.log(JSON.stringify(locationHistory, null, 2));
