/*
  # Train Tracking System Database Schema

  ## Overview
  This migration creates the complete database schema for a train tracking system
  with live location tracking, station management, and train schedules.

  ## New Tables
  
  ### 1. stations
  Stores all railway stations in the network
  - `id` (uuid, primary key) - Unique station identifier
  - `name` (text) - Station name
  - `code` (text) - Unique station code
  - `latitude` (numeric) - GPS latitude coordinate
  - `longitude` (numeric) - GPS longitude coordinate
  - `line` (text) - Railway line (Central, Western, Harbour)
  - `sequence_order` (integer) - Order of station on the line
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. trains
  Stores train information
  - `id` (uuid, primary key) - Unique train identifier
  - `train_number` (text) - Official train number
  - `train_name` (text) - Train name/designation
  - `line` (text) - Railway line the train operates on
  - `source_station_id` (uuid) - Starting station reference
  - `destination_station_id` (uuid) - Ending station reference
  - `status` (text) - Current status (On Time, Delayed, Cancelled)
  - `is_active` (boolean) - Whether train is currently running
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. train_locations
  Stores real-time train location data
  - `id` (uuid, primary key) - Unique location record identifier
  - `train_id` (uuid) - Reference to trains table
  - `latitude` (numeric) - Current GPS latitude
  - `longitude` (numeric) - Current GPS longitude
  - `speed` (numeric) - Current speed in km/h
  - `current_station_id` (uuid) - Current/last station
  - `next_station_id` (uuid) - Next station on route
  - `eta_minutes` (integer) - Estimated time to next station in minutes
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. train_schedules
  Stores scheduled stops for each train
  - `id` (uuid, primary key) - Unique schedule record identifier
  - `train_id` (uuid) - Reference to trains table
  - `station_id` (uuid) - Station on the route
  - `arrival_time` (time) - Scheduled arrival time
  - `departure_time` (time) - Scheduled departure time
  - `stop_sequence` (integer) - Order of stop on route
  - `platform_number` (text) - Platform number

  ## Security
  All tables have RLS enabled with policies for public read access.
  This is appropriate for a public train tracking system.

  ## Indexes
  Added indexes on frequently queried columns for performance:
  - train_number for quick train searches
  - station codes for station lookups
  - line filters for filtering by railway line
  - Foreign key relationships for joins
*/

-- Create stations table
CREATE TABLE IF NOT EXISTS stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  line text NOT NULL,
  sequence_order integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create trains table
CREATE TABLE IF NOT EXISTS trains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  train_number text UNIQUE NOT NULL,
  train_name text NOT NULL,
  line text NOT NULL,
  source_station_id uuid REFERENCES stations(id),
  destination_station_id uuid REFERENCES stations(id),
  status text DEFAULT 'On Time',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create train_locations table
CREATE TABLE IF NOT EXISTS train_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  train_id uuid REFERENCES trains(id) ON DELETE CASCADE,
  latitude numeric(10, 7) NOT NULL,
  longitude numeric(10, 7) NOT NULL,
  speed numeric(5, 2) DEFAULT 0,
  current_station_id uuid REFERENCES stations(id),
  next_station_id uuid REFERENCES stations(id),
  eta_minutes integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Create train_schedules table
CREATE TABLE IF NOT EXISTS train_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  train_id uuid REFERENCES trains(id) ON DELETE CASCADE,
  station_id uuid REFERENCES stations(id),
  arrival_time time NOT NULL,
  departure_time time NOT NULL,
  stop_sequence integer NOT NULL,
  platform_number text DEFAULT '1'
);

-- Enable RLS on all tables
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trains ENABLE ROW LEVEL SECURITY;
ALTER TABLE train_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE train_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (appropriate for public transit info)
CREATE POLICY "Public can view all stations"
  ON stations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can view all trains"
  ON trains FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can view train locations"
  ON train_locations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Public can view train schedules"
  ON train_schedules FOR SELECT
  TO anon
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trains_number ON trains(train_number);
CREATE INDEX IF NOT EXISTS idx_trains_line ON trains(line);
CREATE INDEX IF NOT EXISTS idx_stations_code ON stations(code);
CREATE INDEX IF NOT EXISTS idx_stations_line ON stations(line);
CREATE INDEX IF NOT EXISTS idx_train_locations_train_id ON train_locations(train_id);
CREATE INDEX IF NOT EXISTS idx_train_schedules_train_id ON train_schedules(train_id);