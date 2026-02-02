import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon, DivIcon } from 'leaflet';
import { ArrowLeft, Clock, MapPin, Gauge } from 'lucide-react';
import * as trainService from '../services/trainService';
import { TrainWithDetails, Station } from '../types/database';
import 'leaflet/dist/leaflet.css';

interface LiveTrackingProps {
  trainId: string;
  onBack: () => void;
}

const createTrainIcon = (rotation: number = 0) => new DivIcon({
  html: `
    <div style="
      transform: rotate(${rotation}deg);
      transition: transform 0.5s ease-in-out;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40" fill="none">
        <!-- Railway tracks -->
        <line x1="8" y1="20" x2="32" y2="20" stroke="#8B7355" stroke-width="2" stroke-dasharray="4,3"/>
        <line x1="8" y1="24" x2="32" y2="24" stroke="#8B7355" stroke-width="2" stroke-dasharray="4,3"/>
        <line x1="10" y1="18" x2="10" y2="26" stroke="#A0826D" stroke-width="1" opacity="0.6"/>
        <line x1="16" y1="18" x2="16" y2="26" stroke="#A0826D" stroke-width="1" opacity="0.6"/>
        <line x1="22" y1="18" x2="22" y2="26" stroke="#A0826D" stroke-width="1" opacity="0.6"/>
        <line x1="28" y1="18" x2="28" y2="26" stroke="#A0826D" stroke-width="1" opacity="0.6"/>

        <!-- Train body -->
        <rect x="12" y="8" width="16" height="10" fill="#1E40AF" stroke="#1E3A8A" stroke-width="1" rx="2"/>

        <!-- Windows -->
        <rect x="14" y="10" width="3" height="3" fill="#93C5FD" opacity="0.8"/>
        <rect x="19" y="10" width="3" height="3" fill="#93C5FD" opacity="0.8"/>
        <rect x="24" y="10" width="3" height="3" fill="#93C5FD" opacity="0.8"/>

        <!-- Wheels -->
        <circle cx="14" cy="22" r="3" fill="#374151" stroke="#1F2937" stroke-width="1"/>
        <circle cx="26" cy="22" r="3" fill="#374151" stroke="#1F2937" stroke-width="1"/>

        <!-- Motion indicator (arrow) -->
        <path d="M20 6 L24 4 L22 8 Z" fill="#EF4444" opacity="0.8"/>
      </svg>
    </div>
  `,
  className: 'train-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const stationIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjRUY0NDQ0IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iOCIvPjwvc3ZnPg==',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

export default function LiveTracking({ trainId, onBack }: LiveTrackingProps) {
  const [train, setTrain] = useState<TrainWithDetails | null>(null);
  const [routeStations, setRouteStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [trainRotation, setTrainRotation] = useState(0);
  const prevLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const [animatedPos, setAnimatedPos] = useState<{ lat: number; lng: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const animationStartRef = useRef<number | null>(null);
  const animationDurationRef = useRef<number>(8600); // ms (slightly less than interval)
  const startPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const endPosRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    // initial fetch
    fetchTrainDetails();
    // then advance location every 9 seconds to simulate real-time movement
    const interval = setInterval(async () => {
      try {
        const prev = prevLocationRef.current;
        const updated = await trainService.advanceTrainLocation(trainId);
        if (mounted) {
          // determine start position for interpolation
          const start = prev ?? (updated.location ? { lat: updated.location.latitude, lng: updated.location.longitude } : null);
          const end = updated.location ? { lat: updated.location.latitude, lng: updated.location.longitude } : null;

          // compute rotation based on start->end if available
          if (start && end) {
            const rotation = calculateRotation(start.lat, start.lng, end.lat, end.lng);
            setTrainRotation(rotation);
          }

          // start interpolation between start and end
          if (start && end) {
            startPosRef.current = start;
            endPosRef.current = end;
            animationStartRef.current = null;
            // cancel any existing frame
            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
            }

            const step = (timestamp: number) => {
              if (!animationStartRef.current) animationStartRef.current = timestamp;
              const elapsed = timestamp - (animationStartRef.current as number);
              const duration = animationDurationRef.current;
              let t = Math.min(1, elapsed / duration);
              // easeInOutQuad
              t = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

              const sx = (startPosRef.current as any).lat;
              const sy = (startPosRef.current as any).lng;
              const ex = (endPosRef.current as any).lat;
              const ey = (endPosRef.current as any).lng;

              const lat = sx + (ex - sx) * t;
              const lng = sy + (ey - sy) * t;
              setAnimatedPos({ lat, lng });

              if (t < 1) {
                animationFrameRef.current = requestAnimationFrame(step);
              } else {
                // ensure final position set
                setAnimatedPos(end);
                animationFrameRef.current = null;
              }
            };

            animationFrameRef.current = requestAnimationFrame(step);
          }

          // update prevLocationRef to new location
          if (updated.location) {
            prevLocationRef.current = { lat: updated.location.latitude, lng: updated.location.longitude };
          }

          setTrain(updated as TrainWithDetails);
        }
      } catch (err) {
        // ignore
      }
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [trainId]);

  const calculateRotation = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const dLat = lat2 - lat1;
    const dLng = lng2 - lng1;
    const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);
    return angle;
  };

  const fetchTrainDetails = async () => {
    try {
      const train = (await trainService.getTrainByNumber(trainId)) as TrainWithDetails;

      if (train) {
        if (train.location && prevLocationRef.current) {
          const rotation = calculateRotation(
            prevLocationRef.current.lat,
            prevLocationRef.current.lng,
            train.location.latitude,
            train.location.longitude
          );
          setTrainRotation(rotation);
        }

        if (train.location) {
          prevLocationRef.current = {
            lat: train.location.latitude,
            lng: train.location.longitude,
          };
          // initialize animated position to current train location
          setAnimatedPos({ lat: train.location.latitude, lng: train.location.longitude });
        }

        setTrain(train);

        // Get all stations for the train's line
        const allStations = (await trainService.getAllStations()) as Station[];
        const lineStations = allStations.filter(s => s.line === train.line);
        setRouteStations(lineStations);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching train details:', error);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading train details...</p>
        </div>
      </div>
    );
  }

  if (!train || !train.location) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Train details not available</p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const mapCenter: [number, number] = animatedPos ? [animatedPos.lat, animatedPos.lng] : [train.location.latitude, train.location.longitude];
  const routeCoordinates: [number, number][] = routeStations.map(s => [s.latitude, s.longitude]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Search
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="h-[500px] relative">
                  <MapContainer
                    center={mapCenter}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {routeCoordinates.length > 0 && (
                      <Polyline
                        positions={routeCoordinates}
                        color="#3B82F6"
                        weight={3}
                        opacity={0.5}
                      />
                    )}

                    {routeStations.map((station) => (
                      <Marker
                        key={station.id}
                        position={[station.latitude, station.longitude]}
                        icon={stationIcon}
                      >
                        <Popup>
                          <div className="text-sm">
                            <strong>{station.name}</strong>
                            <br />
                            <span className="text-gray-600">{station.code}</span>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    <Marker position={mapCenter} icon={createTrainIcon(trainRotation)}>
                      <Popup>
                        <div className="text-sm">
                          <strong>{train.train_name}</strong>
                          <br />
                          Train #{train.train_number}
                          <br />
                          <span className="text-gray-600">
                            Speed: {train.location.speed.toFixed(0)} km/h
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                  {train.train_name}
                </h2>
                <p className="text-gray-600 mb-4">Train #{train.train_number}</p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-xs text-gray-600 mb-1">Current Station</p>
                        <p className="font-semibold text-gray-800">
                          {train.current_station?.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-600">
                          Platform: {train.current_station?.platform_number ?? train.location?.platform_number ?? 'N/A'}
                          {train.current_station?.fast_slow ? ` • ${train.current_station.fast_slow}` : ''}
                        </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-1">Next Station</p>
                      <p className="font-semibold text-gray-800">
                        {train.next_station?.name || 'Unknown'}
                      </p>
                      <p className="text-sm text-gray-600">
                        ETA: {train.next_station?.eta_minutes ?? train.location?.eta_minutes ?? 'N/A'} minutes • Platform: {train.next_station?.platform_number ?? 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-1">ETA</p>
                      <p className="font-semibold text-gray-800">
                        {train.location.eta_minutes} minutes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <Gauge className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-1">Current Speed</p>
                      <p className="font-semibold text-gray-800">
                        {train.location.speed.toFixed(0)} km/h
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-800 mb-3">Route Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">From:</span>
                    <span className="font-medium text-gray-800">
                      {train.source_station?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">To:</span>
                    <span className="font-medium text-gray-800">
                      {train.destination_station?.name}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Line:</span>
                    <span className="font-medium text-gray-800">{train.line}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <span
                      className={`font-medium ${
                        train.status === 'On Time' ? 'text-green-600' : 'text-orange-600'
                      }`}
                    >
                      {train.status}
                    </span>
                  </div>
                </div>
              </div>

                              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <p className="text-sm text-blue-800">
                                  <strong>Live Tracking:</strong> Location updates every 9 seconds
                                </p>
                              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
