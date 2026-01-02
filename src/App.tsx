import { useState, useEffect } from 'react';
import type { Trip, Expense } from './types';
import {
  subscribeTripChanges,
  subscribeExpenses,
  updateTrip,
} from './lib/firestore';
import TripSetup from './components/TripSetup';
import ExpenseList from './components/ExpenseList';
import Settlement from './components/Settlement';
import Itinerary from './components/Itinerary';
import './App.css';

type Tab = 'expenses' | 'settlement' | 'itinerary';

function App() {
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [showSettings, setShowSettings] = useState(false);

  // 載入已儲存的旅程
  useEffect(() => {
    const savedTripId = localStorage.getItem('currentTripId');
    if (savedTripId) {
      setCurrentTripId(savedTripId);
    }
  }, []);

  // 訂閱旅程變更
  useEffect(() => {
    if (!currentTripId) return;

    const unsubscribeTrip = subscribeTripChanges(currentTripId, (updatedTrip) => {
      setTrip(updatedTrip);
    });

    const unsubscribeExpenses = subscribeExpenses(currentTripId, (updatedExpenses) => {
      setExpenses(updatedExpenses);
    });

    return () => {
      unsubscribeTrip();
      unsubscribeExpenses();
    };
  }, [currentTripId]);

  const handleTripJoined = (tripId: string) => {
    setCurrentTripId(tripId);
    localStorage.setItem('currentTripId', tripId);
  };

  const handleLeaveTrip = () => {
    if (confirm('確定要離開此旅程？')) {
      localStorage.removeItem('currentTripId');
      setCurrentTripId(null);
      setTrip(null);
      setExpenses([]);
    }
  };

  const handleUpdateParticipantName = async (participantId: string, newName: string) => {
    if (!trip) return;

    const updatedParticipants = trip.participants.map(p =>
      p.id === participantId ? { ...p, name: newName.trim() || p.name } : p
    );

    await updateTrip(trip.id, { participants: updatedParticipants });
  };

  const handleUpdateExchangeRate = async (newRate: number) => {
    if (!trip) return;
    await updateTrip(trip.id, { exchangeRate: newRate });
  };

  const handleToggleCurrency = async () => {
    if (!trip) return;
    const newCurrency = trip.displayCurrency === 'JPY' ? 'TWD' : 'JPY';
    await updateTrip(trip.id, { displayCurrency: newCurrency });
  };

  // 如果尚未加入旅程，顯示設定頁面
  if (!currentTripId || !trip) {
    return <TripSetup onTripJoined={handleTripJoined} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>{trip.name}</h1>
          <div className="header-actions">
            <button className="btn-icon" onClick={() => setShowSettings(!showSettings)} title="設定">
              ⚙️
            </button>
            <button className="btn-icon" onClick={handleLeaveTrip} title="離開旅程">
              🚪
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="settings-panel">
            <div className="settings-row">
              <div className="setting-item">
                <label>房間代碼</label>
                <div className="room-code">{trip.roomCode}</div>
              </div>
              <div className="setting-item">
                <label>匯率 (JPY → TWD)</label>
                <input
                  type="number"
                  value={trip.exchangeRate}
                  onChange={(e) => handleUpdateExchangeRate(parseFloat(e.target.value) || 0.22)}
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="setting-item">
                <label>顯示貨幣</label>
                <button className="btn-toggle" onClick={handleToggleCurrency}>
                  {trip.displayCurrency}
                </button>
              </div>
            </div>

            <div className="participants-settings">
              <label>參與者名稱</label>
              <div className="participants-grid">
                {trip.participants.map((p) => (
                  <input
                    key={p.id}
                    type="text"
                    value={p.name}
                    onChange={(e) => handleUpdateParticipantName(p.id, e.target.value)}
                    placeholder={`參與者 ${p.id}`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <nav className="tab-nav">
          <button
            className={`tab-button ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            💰 費用
          </button>
          <button
            className={`tab-button ${activeTab === 'settlement' ? 'active' : ''}`}
            onClick={() => setActiveTab('settlement')}
          >
            🧮 結算
          </button>
          <button
            className={`tab-button ${activeTab === 'itinerary' ? 'active' : ''}`}
            onClick={() => setActiveTab('itinerary')}
          >
            📅 行程
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'expenses' && (
          <div className="tab-content">
            <ExpenseList
              tripId={trip.id}
              expenses={expenses}
              participants={trip.participants}
              displayCurrency={trip.displayCurrency}
              exchangeRate={trip.exchangeRate}
              onRefresh={() => {}}
            />
          </div>
        )}

        {activeTab === 'settlement' && (
          <div className="tab-content">
            <h2>結算</h2>
            <Settlement
              expenses={expenses}
              participants={trip.participants}
              displayCurrency={trip.displayCurrency}
              exchangeRate={trip.exchangeRate}
            />
          </div>
        )}

        {activeTab === 'itinerary' && (
          <div className="tab-content">
            <Itinerary tripId={trip.id} />
          </div>
        )}
      </main>

    </div>
  );
}

export default App;
