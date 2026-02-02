import { Train, Clock, MapPin } from 'lucide-react';
import { TrainWithDetails } from '../types/database';

interface SearchResultsProps {
  trains: TrainWithDetails[];
  onTrainSelect: (trainId: string) => void;
  isLoading: boolean;
}

export default function SearchResults({ trains, onTrainSelect, isLoading }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Searching for trains...</p>
      </div>
    );
  }

  if (trains.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Train className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">No trains found</h3>
        <p className="text-gray-500">Try adjusting your search criteria</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Search Results ({trains.length} {trains.length === 1 ? 'train' : 'trains'})
      </h2>
      <div className="space-y-3">
        {trains.map((train) => (
          <div
            key={train.id}
            onClick={() => onTrainSelect(train.id)}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Train className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {train.train_name}
                  </h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                    {train.train_number}
                  </span>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-gray-600 mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span>{train.source_station?.name || 'Unknown'}</span>
                  </div>
                  <span className="hidden md:inline">→</span>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <span>{train.destination_station?.name || 'Unknown'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {train.line} Line
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${
                      train.status === 'On Time'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {train.status}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <button
                  onClick={(e) => { e.stopPropagation(); onTrainSelect(train.train_number || train.id); }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Track Live
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
