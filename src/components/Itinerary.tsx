import { useState, useEffect } from 'react';
import type { ItineraryDay, ItineraryItem } from '../types';
import {
  addItineraryDay,
  addItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  deleteItineraryDay,
  subscribeItineraryDays,
  subscribeItineraryItems,
} from '../lib/firestore';

interface ItineraryProps {
  tripId: string;
}

export default function Itinerary({ tripId }: ItineraryProps) {
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [showDayForm, setShowDayForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItineraryItem | null>(null);

  useEffect(() => {
    const unsubDays = subscribeItineraryDays(tripId, setDays);
    const unsubItems = subscribeItineraryItems(tripId, setItems);

    return () => {
      unsubDays();
      unsubItems();
    };
  }, [tripId]);

  useEffect(() => {
    if (days.length > 0 && !selectedDayId) {
      setSelectedDayId(days[0].id);
    }
  }, [days, selectedDayId]);

  const handleAddDay = async (date: string) => {
    const dayNumber = days.length + 1;
    await addItineraryDay({
      tripId,
      date,
      dayNumber,
    });
    setShowDayForm(false);
  };

  const handleDeleteDay = async (dayId: string) => {
    if (!confirm('確定要刪除這一天的行程？相關的所有項目也會被刪除。')) return;
    await deleteItineraryDay(dayId);
    if (selectedDayId === dayId) {
      setSelectedDayId(days[0]?.id || null);
    }
  };

  const selectedDay = days.find(d => d.id === selectedDayId);
  const dayItems = items.filter(item => item.dayId === selectedDayId);

  return (
    <div className="itinerary-container">
      <div className="day-tabs">
        {days.map(day => (
          <button
            key={day.id}
            className={`day-tab ${selectedDayId === day.id ? 'active' : ''}`}
            onClick={() => setSelectedDayId(day.id)}
          >
            Day {day.dayNumber}
            <span className="day-date">{new Date(day.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</span>
          </button>
        ))}
        <button className="day-tab day-tab-add" onClick={() => setShowDayForm(true)}>
          + 新增天數
        </button>
      </div>

      {showDayForm && <DayForm onSubmit={handleAddDay} onClose={() => setShowDayForm(false)} />}

      {selectedDay ? (
        <div className="itinerary-content">
          <div className="itinerary-header">
            <h3>
              Day {selectedDay.dayNumber} - {new Date(selectedDay.date).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </h3>
            <button className="btn-small btn-danger" onClick={() => handleDeleteDay(selectedDay.id)}>
              刪除此天
            </button>
          </div>

          <button className="btn-primary" onClick={() => setShowItemForm(true)}>
            + 新增項目
          </button>

          {dayItems.length === 0 ? (
            <div className="empty-state">
              <p>尚無行程項目</p>
            </div>
          ) : (
            <div className="itinerary-items">
              {dayItems.map(item => (
                <ItineraryItemCard
                  key={item.id}
                  item={item}
                  onEdit={() => { setEditingItem(item); setShowItemForm(true); }}
                  onDelete={() => deleteItineraryItem(item.id)}
                />
              ))}
            </div>
          )}

          {showItemForm && (
            <ItemForm
              tripId={tripId}
              dayId={selectedDay.id}
              item={editingItem || undefined}
              nextOrder={dayItems.length}
              onClose={() => { setShowItemForm(false); setEditingItem(null); }}
            />
          )}
        </div>
      ) : (
        <div className="empty-state">
          <p>請先新增天數</p>
        </div>
      )}
    </div>
  );
}

// 子元件：Day Form
function DayForm({ onSubmit, onClose }: { onSubmit: (date: string) => void; onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
        <h3>新增天數</h3>
        <div className="form-group">
          <label>日期</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="button-group">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={() => onSubmit(date)}>確認</button>
        </div>
      </div>
    </div>
  );
}

// 子元件：Item Form
function ItemForm({
  tripId,
  dayId,
  item,
  nextOrder,
  onClose,
}: {
  tripId: string;
  dayId: string;
  item?: ItineraryItem;
  nextOrder: number;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item?.title || '');
  const [timeRange, setTimeRange] = useState(item?.timeRange || '');
  const [location, setLocation] = useState(item?.location || '');
  const [note, setNote] = useState(item?.note || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (item) {
      await updateItineraryItem(item.id, { title, timeRange, location, note });
    } else {
      await addItineraryItem({
        tripId,
        dayId,
        title,
        timeRange,
        location,
        note,
        order: nextOrder,
      });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{item ? '編輯項目' : '新增項目'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>項目名稱 *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：淺草寺參觀" />
          </div>
          <div className="form-group">
            <label>時間範圍</label>
            <input type="text" value={timeRange} onChange={(e) => setTimeRange(e.target.value)} placeholder="例如：09:00-10:30" />
          </div>
          <div className="form-group">
            <label>地點</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例如：淺草寺" />
          </div>
          <div className="form-group">
            <label>備註</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <div className="button-group">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary">儲存</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 子元件：Item Card
function ItineraryItemCard({
  item,
  onEdit,
  onDelete,
}: {
  item: ItineraryItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const handleDelete = () => {
    if (confirm('確定要刪除此項目？')) onDelete();
  };

  return (
    <div className="itinerary-item">
      <div className="itinerary-item-header">
        {item.timeRange && <span className="time-badge">{item.timeRange}</span>}
        <strong>{item.title}</strong>
      </div>
      {item.location && <div className="itinerary-location">📍 {item.location}</div>}
      {item.note && <div className="itinerary-note">{item.note}</div>}
      <div className="itinerary-actions">
        <button className="btn-small" onClick={onEdit}>編輯</button>
        <button className="btn-small btn-danger" onClick={handleDelete}>刪除</button>
      </div>
    </div>
  );
}
