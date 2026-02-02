import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function importTrainData() {
  try {
    const filePath = path.join(process.cwd(), 'mumbai_trains.json');
    const trains = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log(`Importing ${trains.length} train records...`);

    const { data, error } = await supabase
      .from('trains')
      .insert(trains);

    if (error) throw error;

    console.log(`Successfully imported ${trains.length} trains!`);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

importTrainData();