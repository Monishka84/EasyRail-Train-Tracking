import trainData from '../data/mumbai_local_train_tracking.json';

// Transform raw JSON data to match database schema
function transformTrainData(rawData) {
  // Build a map of train_number -> array of location entries (history)
  const historyMap = new Map();
  // Also build station order per line
  const stationOrder = new Map();

  // Quick lookup of station info by name (from raw dataset)
  const stationsByName = new Map();

  rawData.forEach((entry, index) => {
    const key = entry.train_number;
    if (!historyMap.has(key)) historyMap.set(key, []);
    historyMap.get(key).push({
      station_name: entry.station_name,
      latitude: entry.latitude,
      longitude: entry.longitude,
      platform_number: entry.platform_number,
      fast_slow: entry.fast_slow,
      train_line: entry.train_line,
      seq: index
    });

    const line = entry.train_line || 'unknown';
    if (!stationOrder.has(line)) stationOrder.set(line, []);
    const arr = stationOrder.get(line);
    if (!arr.includes(entry.station_name)) arr.push(entry.station_name);

    // collect station info
    if (!stationsByName.has(entry.station_name)) {
      stationsByName.set(entry.station_name, {
        latitude: entry.latitude,
        longitude: entry.longitude,
        platform_number: entry.platform_number,
        fast_slow: entry.fast_slow,
        line: entry.train_line
      });
    }
  });

  // Build train objects with location history
  const trains = [];
  for (const [train_number, entries] of historyMap.entries()) {
    const first = entries[0];
    const last = entries[entries.length - 1];

    // Build an ordered path of stations between source and destination (inclusive)
    const order = stationOrder.get(first.train_line) || [];

    // Map of available entries for this train by station name
    const entryMap = new Map(entries.map(e => [e.station_name, e]));

    // Determine initial candidate source/destination from entries
    let explicitSource = entries[0].source_station || entries[0].station_name;
    let explicitDest = entries[0].destination_station || entries[entries.length - 1].station_name;

    // If both source & dest exist in the master order, compute the slice between them
    let pathStations = null;
    const srcIdx = order.indexOf(String(explicitSource));
    const destIdx = order.indexOf(String(explicitDest));
    if (srcIdx !== -1 && destIdx !== -1) {
      if (srcIdx <= destIdx) {
        pathStations = order.slice(srcIdx, destIdx + 1);
      } else {
        // reverse direction
        pathStations = order.slice(destIdx, srcIdx + 1).reverse();
      }
    }

    // Fallback: use the train's observed entry order
    if (!pathStations) {
      pathStations = entries.map(e => e.station_name);
    }

    // If the ordered path contains only the source, try to pick a different destination
    if (pathStations && pathStations.length === 1) {
      const srcName = pathStations[0];
      // Prefer the next station in the master order for this line
      if (order && order.length > 1) {
        const idx = order.indexOf(srcName);
        let destName = null;
        if (idx !== -1) {
          destName = order[(idx + 1) % order.length];
        } else {
          destName = order.find(s => s !== srcName) || null;
        }
        if (destName && destName !== srcName) {
          pathStations = [srcName, destName];
        }
      }

      // Last resort: find any station in stationsByName that differs
      if (pathStations.length === 1) {
        const anyOther = Array.from(stationsByName.keys()).find(s => s !== srcName);
        if (anyOther) pathStations = [srcName, anyOther];
      }
    }

    // Build locationHistory using pathStations; fill missing station coords from stationsByName
    const locationHistory = pathStations.map((stationName, i) => {
      const e = entryMap.get(stationName) || stationsByName.get(stationName) || {};
      return {
        id: `loc-${train_number}-${i}`,
        train_id: `train-${train_number}`,
        latitude: e.latitude || 0,
        longitude: e.longitude || 0,
        platform_number: e.platform_number || null,
        station_name: stationName,
        fast_slow: e.fast_slow || null,
        eta_minutes: Math.max(0, Math.floor(Math.random() * 15) + 1),
        speed: Math.random() * 60 + 20,
        updated_at: new Date().toISOString()
      };
    });

    // Recompute explicit source/destination from the ordered path
    explicitSource = locationHistory[0]?.station_name || explicitSource;
    explicitDest = locationHistory[locationHistory.length - 1]?.station_name || explicitDest;

    // ensure destination station object is populated from ordered path
    const destIndex = locationHistory.length - 1;
    const destLoc = locationHistory[destIndex] || {};
    const destinationStationObj = {
      id: `station-${String(explicitDest).replace(/\s+/g, '-').toLowerCase()}`,
      name: explicitDest,
      code: String(explicitDest).substring(0, 3).toUpperCase(),
      latitude: destLoc.latitude || last.latitude,
      longitude: destLoc.longitude || last.longitude,
      line: last.train_line,
      sequence_order: destIndex
    };

    const sourceLoc = locationHistory[0] || {};
    const sourceStationObj = {
      id: `station-${String(explicitSource).replace(/\s+/g, '-').toLowerCase()}`,
      name: explicitSource,
      code: String(explicitSource).substring(0, 3).toUpperCase(),
      latitude: sourceLoc.latitude || first.latitude,
      longitude: sourceLoc.longitude || first.longitude,
      line: first.train_line,
      sequence_order: 0
    };

    trains.push({
      id: `train-${train_number}`,
      train_number,
      train_name: `${first.train_line} Line - ${train_number}`,
      line: first.train_line,
      platform_number: locationHistory[0].platform_number,
      fast_slow: locationHistory[0].fast_slow,
      source_station: sourceStationObj,
      destination_station: destinationStationObj,
      status: 'On Time',
      is_active: true,
      created_at: new Date().toISOString(),
      locationHistory,
      _currentIndex: 0,
      location: locationHistory[0]
    });
  }

  // Add a synthetic Central route from CSMT -> Thane if not present (useful for demos)
  const hasSynthetic = trains.some(t => t.train_number === 'SIM_CS_TH_1');
  try {
    if (!hasSynthetic && stationOrder.has('Central')) {
      const centralOrder = stationOrder.get('Central');
      const sIdx = centralOrder.indexOf('CSMT');
      const dIdx = centralOrder.indexOf('Thane');
      if (sIdx !== -1 && dIdx !== -1) {
        const path = sIdx <= dIdx ? centralOrder.slice(sIdx, dIdx + 1) : centralOrder.slice(dIdx, sIdx + 1).reverse();
        const locationHistory = path.map((stationName, i) => {
          const e = stationsByName.get(stationName) || {};
          return {
            id: `loc-SIM_CS_TH_1-${i}`,
            train_id: `train-SIM_CS_TH_1`,
            latitude: e.latitude || 0,
            longitude: e.longitude || 0,
            platform_number: e.platform_number || null,
            station_name: stationName,
            fast_slow: e.fast_slow || null,
            eta_minutes: Math.max(0, Math.floor(Math.random() * 15) + 1),
            speed: Math.random() * 60 + 20,
            updated_at: new Date().toISOString()
          };
        });

        trains.push({
          id: `train-SIM_CS_TH_1`,
          train_number: 'SIM_CS_TH_1',
          train_name: `Central Line - SIM_CS_TH_1`,
          line: 'Central',
          platform_number: locationHistory[0].platform_number,
          fast_slow: locationHistory[0].fast_slow,
          source_station: {
            id: `station-${String(locationHistory[0].station_name).replace(/\s+/g, '-').toLowerCase()}`,
            name: locationHistory[0].station_name,
            code: String(locationHistory[0].station_name).substring(0,3).toUpperCase(),
            latitude: locationHistory[0].latitude,
            longitude: locationHistory[0].longitude,
            line: 'Central',
            sequence_order: 0
          },
          destination_station: {
            id: `station-${String(locationHistory[locationHistory.length-1].station_name).replace(/\s+/g, '-').toLowerCase()}`,
            name: locationHistory[locationHistory.length-1].station_name,
            code: String(locationHistory[locationHistory.length-1].station_name).substring(0,3).toUpperCase(),
            latitude: locationHistory[locationHistory.length-1].latitude,
            longitude: locationHistory[locationHistory.length-1].longitude,
            line: 'Central',
            sequence_order: locationHistory.length - 1
          },
          status: 'On Time',
          is_active: true,
          created_at: new Date().toISOString(),
          locationHistory,
          _currentIndex: 0,
          location: locationHistory[0]
        });
      }
    }
  } catch (e) {
    // ignore synthetic creation errors
  }

  // Also ensure a synthetic CSMT->Titwala train exists for demos
  try {
    const hasTit = trains.some(t => t.train_number === 'SIM_CS_TIT_1');
    if (!hasTit && stationOrder.has('Central')) {
      const centralOrder = stationOrder.get('Central');
      const sIdx = centralOrder.indexOf('CSMT');
      const dIdx = centralOrder.indexOf('Titwala');
      if (sIdx !== -1 && dIdx !== -1) {
        const path = sIdx <= dIdx ? centralOrder.slice(sIdx, dIdx + 1) : centralOrder.slice(dIdx, sIdx + 1).reverse();
        const locationHistory = path.map((stationName, i) => {
          const e = stationsByName.get(stationName) || {};
          return {
            id: `loc-SIM_CS_TIT_1-${i}`,
            train_id: `train-SIM_CS_TIT_1`,
            latitude: e.latitude || 0,
            longitude: e.longitude || 0,
            platform_number: e.platform_number || null,
            station_name: stationName,
            fast_slow: e.fast_slow || null,
            eta_minutes: Math.max(0, Math.floor(Math.random() * 15) + 1),
            speed: Math.random() * 60 + 20,
            updated_at: new Date().toISOString()
          };
        });

        trains.push({
          id: `train-SIM_CS_TIT_1`,
          train_number: 'SIM_CS_TIT_1',
          train_name: `Central Line - SIM_CS_TIT_1`,
          line: 'Central',
          platform_number: locationHistory[0].platform_number,
          fast_slow: locationHistory[0].fast_slow,
          source_station: {
            id: `station-${String(locationHistory[0].station_name).replace(/\s+/g, '-').toLowerCase()}`,
            name: locationHistory[0].station_name,
            code: String(locationHistory[0].station_name).substring(0,3).toUpperCase(),
            latitude: locationHistory[0].latitude,
            longitude: locationHistory[0].longitude,
            line: 'Central',
            sequence_order: 0
          },
          destination_station: {
            id: `station-${String(locationHistory[locationHistory.length-1].station_name).replace(/\s+/g, '-').toLowerCase()}`,
            name: locationHistory[locationHistory.length-1].station_name,
            code: String(locationHistory[locationHistory.length-1].station_name).substring(0,3).toUpperCase(),
            latitude: locationHistory[locationHistory.length-1].latitude,
            longitude: locationHistory[locationHistory.length-1].longitude,
            line: 'Central',
            sequence_order: locationHistory.length - 1
          },
          status: 'On Time',
          is_active: true,
          created_at: new Date().toISOString(),
          locationHistory,
          _currentIndex: 0,
          location: locationHistory[0]
        });
      }
    }
  } catch (e) {
    // ignore
  }

  return trains;
}

const allTrains = transformTrainData(trainData);

export async function getTrainsByLine(line) {
  return new Promise((resolve) => {
    const filtered = allTrains.filter(train => train.line === line);
    setTimeout(() => resolve(filtered), 100);
  });
}

export async function getTrainByNumber(trainNumber) {
  return new Promise((resolve, reject) => {
    const train = allTrains.find(t => t.train_number === trainNumber || t.id === trainNumber);
    setTimeout(() => {
      if (train) {
        resolve(train);
      } else {
        reject(new Error('Train not found'));
      }
    }, 100);
  });
}

// Advance the train's location along its history (cyclic) and return updated train
export async function advanceTrainLocation(trainId) {
  return new Promise((resolve, reject) => {
    const train = allTrains.find(t => t.id === trainId || t.train_number === trainId);
    if (!train) return reject(new Error('Train not found'));
    const len = train.locationHistory.length || 0;

    if (len === 0) {
      // no history; nothing to advance
      train._currentIndex = 0;
      train.location = null;
      train.current_station = null;
      train.next_station = null;
      setTimeout(() => resolve(train), 100);
      return;
    }

    train._currentIndex = (train._currentIndex + 1) % len;
    train.location = train.locationHistory[train._currentIndex];

    // update current station
    train.current_station = {
      id: train.location.id,
      name: train.location.station_name,
      latitude: train.location.latitude,
      longitude: train.location.longitude,
      platform_number: train.location.platform_number,
      fast_slow: train.location.fast_slow
    };

    // determine a next station that is not the same as current (if possible)
    let next = null;
    if (len > 1) {
      for (let i = 1; i < len; i++) {
        const idx = (train._currentIndex + i) % len;
        const cand = train.locationHistory[idx];
        if (cand && cand.station_name !== train.location.station_name) {
          next = cand;
          break;
        }
      }
      // if still null, fallback to destination_station if it's different
      if (!next && train.destination_station && train.destination_station.name !== train.current_station.name) {
        next = {
          id: train.destination_station.id,
          station_name: train.destination_station.name,
          latitude: train.destination_station.latitude,
          longitude: train.destination_station.longitude,
          platform_number: train.destination_station.platform_number,
          eta_minutes: train.location.eta_minutes
        };
      }
      // as last resort pick the immediate next index (may be same)
      if (!next) {
        const fallbackIdx = (train._currentIndex + 1) % len;
        next = train.locationHistory[fallbackIdx];
      }
    } else {
      // single-entry history: use destination_station if different
      if (train.destination_station && train.destination_station.name !== train.current_station.name) {
        next = {
          id: train.destination_station.id,
          station_name: train.destination_station.name,
          latitude: train.destination_station.latitude,
          longitude: train.destination_station.longitude,
          platform_number: train.destination_station.platform_number,
          eta_minutes: train.location.eta_minutes
        };
      }
    }

    if (next) {
      train.next_station = {
        id: next.id || `station-${String(next.station_name).replace(/\s+/g, '-').toLowerCase()}`,
        name: next.station_name || next.station_name === undefined ? next.station_name : next.name,
        latitude: next.latitude,
        longitude: next.longitude,
        platform_number: next.platform_number
      };
      if (next.eta_minutes !== undefined) train.next_station.eta_minutes = next.eta_minutes;
    } else {
      train.next_station = null;
    }

    // compute train-level status from eta (simple rule)
    const eta = Number(train.next_station?.eta_minutes) || 0;
    train.status = eta > 8 ? 'Delayed' : 'On Time';

    setTimeout(() => resolve(train), 100);
  });
}

export async function searchTrains(query, searchType = 'number') {
  return new Promise((resolve) => {
    let results = [];
    
    if (searchType === 'number') {
      results = allTrains.filter(train => 
        train.train_number.toLowerCase().includes(query.toLowerCase()) ||
        train.train_name.toLowerCase().includes(query.toLowerCase())
      );
    } else if (searchType === 'line') {
      results = allTrains.filter(train => 
        train.line.toLowerCase() === query.toLowerCase()
      );
    } else if (searchType === 'station') {
      results = allTrains.filter(train => 
        train.source_station.name.toLowerCase().includes(query.toLowerCase()) ||
        train.destination_station.name.toLowerCase().includes(query.toLowerCase())
      );
    }
    
    setTimeout(() => resolve(results), 100);
  });
}

export async function getAllStations() {
  return new Promise((resolve) => {
    const stationsMap = new Map();
    
    trainData.forEach(entry => {
      const key = entry.station_name;
      if (!stationsMap.has(key)) {
        stationsMap.set(key, {
          id: `station-${entry.station_name.replace(/\s+/g, '-').toLowerCase()}`,
          name: entry.station_name,
          code: entry.station_name.substring(0, 3).toUpperCase(),
          latitude: entry.latitude,
          longitude: entry.longitude,
          line: entry.train_line,
          sequence_order: 0
        });
      }
    });
    
    setTimeout(() => resolve(Array.from(stationsMap.values())), 100);
  });
}