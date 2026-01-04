import { useState, useEffect } from 'react';
import { createTrip, getTripByRoomCode, getRecentTrips, deleteTrip } from '../lib/firestore';
import { isValidRoomCode } from '../utils/roomCode';
import type { Trip } from '../types';

interface TripSetupProps {
  onTripJoined: (tripId: string) => void;
}

export default function TripSetup({ onTripJoined }: TripSetupProps) {
  const [mode, setMode] = useState<'list' | 'create' | 'join'>('list');
  const [tripName, setTripName] = useState('日本旅行');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // 載入最近的旅程
  useEffect(() => {
    loadRecentTrips();
  }, []);

  const loadRecentTrips = async () => {
    setLoadingTrips(true);
    try {
      const trips = await getRecentTrips(20); // 抓取最近 20 個旅程
      setRecentTrips(trips);
    } catch (err) {
      console.error('載入旅程列表失敗:', err);
    } finally {
      setLoadingTrips(false);
    }
  };

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

  const handleJoinTrip = async (tripId?: string, inputRoomCode?: string) => {
    const codeToUse = inputRoomCode || roomCode;

    if (!tripId && !isValidRoomCode(codeToUse)) {
      setError('請輸入有效的 6 位數房間代碼');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let trip: Trip | null = null;

      if (tripId) {
        // 直接使用 tripId 加入
        localStorage.setItem('currentTripId', tripId);
        onTripJoined(tripId);
        return;
      } else {
        // 使用房間代碼加入
        trip = await getTripByRoomCode(codeToUse);
        if (!trip) {
          setError('找不到此房間代碼的旅程');
          return;
        }
        localStorage.setItem('currentTripId', trip.id);
        onTripJoined(trip.id);
      }
    } catch (err) {
      setError('加入旅程失敗，請重試');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days} 天前`;
    if (days < 30) return `${Math.floor(days / 7)} 週前`;
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  };

  const handleDeleteTrip = async () => {
    if (!deletingTripId) return;

    if (deleteConfirmText !== 'Delete this trip') {
      setError('請輸入 "Delete this trip" 來確認刪除');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await deleteTrip(deletingTripId);
      // 重新載入旅程列表
      await loadRecentTrips();
      // 關閉對話框
      setDeletingTripId(null);
      setDeleteConfirmText('');
    } catch (err) {
      setError('刪除失敗，請重試');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
          <button className="btn-secondary" onClick={() => setMode('list')} disabled={loading}>
            返回
          </button>
          <button className="btn-primary" onClick={handleCreateTrip} disabled={loading}>
            {loading ? '建立中...' : '建立旅程'}
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="setup-container">
        <h2>輸入房間代碼</h2>
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
          <button className="btn-secondary" onClick={() => setMode('list')} disabled={loading}>
            返回
          </button>
          <button className="btn-primary" onClick={() => handleJoinTrip()} disabled={loading}>
            {loading ? '加入中...' : '加入旅程'}
          </button>
        </div>
      </div>
    );
  }

  // 主畫面：顯示旅程列表
  return (
    <div className="setup-container">
      <h1>🗾 日本旅行記帳</h1>

      {/* 操作按鈕 */}
      <div className="trip-setup-actions">
        <button className="btn-primary" onClick={() => setMode('create')}>
          建立新旅程
        </button>
        <button className="btn-secondary" onClick={() => setMode('join')}>
          輸入房間代碼
        </button>
      </div>

      {/* 最近的旅程列表 */}
      <div className="recent-trips-section">
        <h2>最近的旅程</h2>
        {loadingTrips ? (
          <div className="loading-trips">載入中...</div>
        ) : recentTrips.length === 0 ? (
          <div className="empty-state">
            <p>還沒有任何旅程</p>
            <p>建立第一個旅程開始使用吧！</p>
          </div>
        ) : (
          <div className="trips-list">
            {recentTrips.map((trip) => (
              <div key={trip.id} className="trip-card">
                <div onClick={() => handleJoinTrip(trip.id)} className="trip-card-clickable">
                  <div className="trip-card-header">
                    <h3>{trip.name}</h3>
                    <span className="trip-date">{formatDate(trip.createdAt)}</span>
                  </div>
                  <div className="trip-card-info">
                    <span className="trip-room-code">代碼: {trip.roomCode}</span>
                    <span className="trip-participants">👥 {trip.participants.length} 人</span>
                  </div>
                </div>
                <button
                  className="btn-delete-trip"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingTripId(trip.id);
                    setDeleteConfirmText('');
                    setError('');
                  }}
                  title="刪除旅程"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 刪除確認對話框 */}
      {deletingTripId && (
        <div className="modal-overlay" onClick={() => setDeletingTripId(null)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <h2>刪除旅程</h2>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              此操作將永久刪除此旅程及所有相關資料（費用、行程、購物清單等）。
            </p>
            <p style={{ marginBottom: '1rem', fontWeight: '600' }}>
              請輸入 <code style={{
                backgroundColor: 'var(--bg-color)',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontFamily: 'monospace'
              }}>Delete this trip</code> 來確認刪除：
            </p>
            <div className="form-group">
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Delete this trip"
                disabled={loading}
                autoFocus
              />
            </div>
            {error && <div className="error">{error}</div>}
            <div className="button-group">
              <button
                className="btn-secondary"
                onClick={() => {
                  setDeletingTripId(null);
                  setDeleteConfirmText('');
                  setError('');
                }}
                disabled={loading}
              >
                取消
              </button>
              <button
                className="btn-primary btn-danger"
                onClick={handleDeleteTrip}
                disabled={loading || deleteConfirmText !== 'Delete this trip'}
              >
                {loading ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
