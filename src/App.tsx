import { useState } from 'react';
import HomePage from './components/HomePage';
import LiveTracking from './components/LiveTracking';

type View = 'home' | 'tracking';

function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedTrainId, setSelectedTrainId] = useState<string>('');

  const handleTrainSelect = (trainId: string) => {
    setSelectedTrainId(trainId);
    setCurrentView('tracking');
  };

  const handleBack = () => {
    setCurrentView('home');
    setSelectedTrainId('');
  };

  return (
    <>
      {currentView === 'home' && (
        <HomePage onTrainSelect={handleTrainSelect} />
      )}
      {currentView === 'tracking' && selectedTrainId && (
        <LiveTracking trainId={selectedTrainId} onBack={handleBack} />
      )}
    </>
  );
}

export default App;
