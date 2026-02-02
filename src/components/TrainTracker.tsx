import { useState } from 'react'
import './TrainTracker.css'

interface Train {
  id: string
  trainNumber: string
  route: string
  currentStation: string
  status: string
  expectedTime: string
}

function TrainTracker() {
  const [trains] = useState<Train[]>([
    {
      id: '1',
      trainNumber: 'WR-101',
      route: 'Churchgate - Virar',
      currentStation: 'Andheri',
      status: 'On Time',
      expectedTime: '14:30'
    },
    {
      id: '2',
      trainNumber: 'CR-205',
      route: 'CSMT - Kalyan',
      currentStation: 'Dadar',
      status: 'Delayed',
      expectedTime: '14:35'
    },
    {
      id: '3',
      trainNumber: 'WR-302',
      route: 'Bandra - Borivali',
      currentStation: 'Malad',
      status: 'On Time',
      expectedTime: '14:45'
    }
  ])

  return (
    <div className="train-tracker">
      <header className="header">
        <h1>EasyRail</h1>
        <p>Mumbai Local Train Tracking</p>
      </header>

      <main className="main-content">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search by train number or station..."
            className="search-input"
          />
        </div>

        <div className="trains-container">
          <h2>Live Train Status</h2>
          <div className="trains-grid">
            {trains.map(train => (
              <div key={train.id} className="train-card">
                <div className="train-header">
                  <span className="train-number">{train.trainNumber}</span>
                  <span className={`status ${train.status === 'On Time' ? 'on-time' : 'delayed'}`}>
                    {train.status}
                  </span>
                </div>
                <div className="train-details">
                  <div className="detail-row">
                    <span className="label">Route:</span>
                    <span className="value">{train.route}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Current Station:</span>
                    <span className="value">{train.currentStation}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Expected:</span>
                    <span className="value">{train.expectedTime}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export default TrainTracker
