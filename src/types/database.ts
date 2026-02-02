export interface Station {
  id: string;
  name: string;
  code: string;
  latitude: number;
  longitude: number;
  line: string;
  sequence_order: number;
  created_at: string;
}

export interface Train {
  id: string;
  train_number: string;
  train_name: string;
  line: string;
  source_station_id: string;
  destination_station_id: string;
  status: string;
  is_active: boolean;
  created_at: string;
}

export interface TrainLocation {
  id: string;
  train_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  current_station_id: string;
  next_station_id: string;
  eta_minutes: number;
  updated_at: string;
}

export interface TrainWithDetails extends Train {
  source_station?: Station;
  destination_station?: Station;
  location?: TrainLocation;
  current_station?: Station;
  next_station?: Station;
}
