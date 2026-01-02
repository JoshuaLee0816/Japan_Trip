import { useState } from 'react';
import { createTrip, getTripByRoomCode } from '../lib/firestore';
import { isValidRoomCode } from '../utils/roomCode';

interface TripSetupProps {
  onTripJoined: (tripId: string) => void;
}

export default function TripSetup({ onTripJoined }: TripSetupProps) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [tripName, setTripName] = useState('日本旅行');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateTrip = async () => {
    if (!tripName.trim()) {
      setError('請輸入旅程名稱');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const trip = await createTrip(tripName.trim(), 4);
      localStorage.setItem('currentTripId', trip.id);
      onTripJoined(trip.id);
    } catch (err) {
      setError('建立旅程失敗，請重試');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTrip = async () => {
    if (!isValidRoomCode(roomCode)) {
      setError('請輸入有效的 6 位數房間代碼');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const trip = await getTripByRoomCode(roomCode);
      if (!trip) {
        setError('找不到此房間代碼的旅程');
        return;
      }

      localStorage.setItem('currentTripId', trip.id);
      onTripJoined(trip.id);
    } catch (err) {
      setError('加入旅程失敗，請重試');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'select') {
    return (
      <div className="setup-container">
        <h1>🗾 日本旅行記帳</h1>
        <div className="button-group">
          <button className="btn-primary" onClick={() => setMode('create')}>
            建立新旅程
          </button>
          <button className="btn-secondary" onClick={() => setMode('join')}>
            加入現有旅程
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="setup-container">
        <h2>建立新旅程</h2>
        <div className="form-group">
          <label>旅程名稱</label>
          <input
            type="text"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="例如：東京大阪 7 日遊"
            disabled={loading}
          />
        </div>
        {error && <div className="error">{error}</div>}
        <div className="button-group">
          <button className="btn-secondary" onClick={() => setMode('select')} disabled={loading}>
            返回
          </button>
          <button className="btn-primary" onClick={handleCreateTrip} disabled={loading}>
            {loading ? '建立中...' : '建立旅程'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-container">
      <h2>加入旅程</h2>
      <div className="form-group">
        <label>房間代碼</label>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          placeholder="請輸入 6 位數字"
          maxLength={6}
          disabled={loading}
        />
      </div>
      {error && <div className="error">{error}</div>}
      <div className="button-group">
        <button className="btn-secondary" onClick={() => setMode('select')} disabled={loading}>
          返回
        </button>
        <button className="btn-primary" onClick={handleJoinTrip} disabled={loading}>
          {loading ? '加入中...' : '加入旅程'}
        </button>
      </div>
    </div>
  );
}
