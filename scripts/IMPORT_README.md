# Train Data Import Script

This script imports train data from `mumbai_local_train_tracking.json` into the Supabase database.

## Prerequisites

1. **Supabase Service Role Key**: You need to set the `SUPABASE_SERVICE_ROLE_KEY` environment variable in your `.env` file. This key is different from the anon key and has full database access.

   To get your service role key:
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Copy the "service_role" key (NOT the anon key)

2. **Dependencies Installed**: Run `npm install` to ensure all dependencies are installed, including the new `dotenv` package.

## Setup Instructions

1. **Add Service Role Key to .env**:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run the Import Script**:
   ```bash
   npm run import-trains
   ```

## What the Script Does

The import script will:

1. **Read** the `mumbai_local_train_tracking.json` file
2. **Extract** unique stations from the data
3. **Clear** any existing data (stations, trains, locations, schedules)
4. **Insert** stations with their coordinates and line information
5. **Insert** trains with their metadata
6. **Insert** train locations with real-time position data

## Expected Output

After successful import, you should see output like:

```
Starting train data import...
Found 2700 trains in JSON file
Found 21 unique stations
Clearing existing data...
Inserting stations...
Inserted 21 unique stations
Inserting trains and locations...
Inserted 2700 trains
Inserted 2700 train locations

✅ Train data import completed successfully!
Summary:
  Stations: 21
  Trains: 2700
  Locations: 2700
  Train counts by line:
    Western: 900
    Central: 900
    Harbour: 900
```

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Ensure both `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env`
- The service role key must be the full key (long string starting with `eyJ...`)

### Error: "JSON file not found"
- Ensure the `mumbai_local_train_tracking.json` file exists in the project root

### Permission Denied Error
- Verify you're using the service role key, not the anon key
- The service role key has the required permissions to modify database tables

### Database Connection Issues
- Verify your Supabase project is running
- Check that `VITE_SUPABASE_URL` is the correct URL for your project
- Ensure you have internet connectivity

## Database Schema

The import script works with the following tables:

- **stations**: Railway stations with coordinates and line information
- **trains**: Train information with line and status
- **train_locations**: Real-time position data for trains
- **train_schedules**: (optional) Scheduled stops for trains

All data is cleared before import to avoid duplicates.
