import { getTrainsByLine } from '../src/services/trainService.js';

async function run() {
  try {
    const trains = await getTrainsByLine('Central');
    const matches = trains.filter(t => (t.source_station && t.source_station.name && t.source_station.name.toLowerCase() === 'csmt') || (t.destination_station && t.destination_station.name && t.destination_station.name.toLowerCase() === 'thane'));

    console.log('Total Central trains:', trains.length);
    if (!matches.length) {
      console.log('No trains with source CSMT or destination Thane found. Listing sample trains:');
      console.log(trains.slice(0,5).map(t => ({train_number:t.train_number, source: t.source_station?.name, dest: t.destination_station?.name})));
      return;
    }

    for (const t of matches) {
      console.log('---');
      console.log('Train:', t.train_number);
      console.log('Source:', t.source_station?.name);
      console.log('Destination:', t.destination_station?.name);
      console.log('locationHistory length:', t.locationHistory?.length);
      console.log('Path:', (t.locationHistory || []).map(l => l.station_name).join(' -> '));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
