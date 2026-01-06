import { useState, useEffect } from 'react';
import type { ItineraryDay, ItineraryItem, Transportation } from '../types';
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
  const [isEditMode, setIsEditMode] = useState(false);

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
    await addItineraryDay({
      tripId,
      date,
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

  // 按日期排序天數
  const sortedDays = [...days].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  const selectedDay = sortedDays.find(d => d.id === selectedDayId);
  const dayItems = items
    .filter(item => item.dayId === selectedDayId)
    .sort((a, b) => {
      // 解析時間範圍的開始時間進行排序
      const getStartTime = (timeRange: string) => {
        if (!timeRange) return '99:99'; // 沒有時間的排在最後
        const start = timeRange.split('-')[0]?.trim();
        return start || '99:99';
      };
      return getStartTime(a.timeRange).localeCompare(getStartTime(b.timeRange));
    });

  return (
    <div className="itinerary-container">
      <div className="day-tabs">
        {sortedDays.map(day => (
          <button
            key={day.id}
            className={`day-tab ${selectedDayId === day.id ? 'active' : ''}`}
            onClick={() => setSelectedDayId(day.id)}
          >
            {new Date(day.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} ({['日', '一', '二', '三', '四', '五', '六'][new Date(day.date).getDay()]})
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
              {new Date(selectedDay.date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} ({['日', '一', '二', '三', '四', '五', '六'][new Date(selectedDay.date).getDay()]})
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn-small ${isEditMode ? 'btn-danger' : ''}`}
                onClick={() => setIsEditMode(!isEditMode)}
              >
                {isEditMode ? '完成' : '編輯'}
              </button>
              {isEditMode && (
                <button className="btn-small btn-danger" onClick={() => handleDeleteDay(selectedDay.id)}>
                  刪除天數
                </button>
              )}
            </div>
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
                  isEditMode={isEditMode}
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

// 產生時間選項 (每15分鐘)
function generateTimeOptions() {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      options.push(time);
    }
  }
  return options;
}

// 產生交通時間選項 (15分鐘為單位，最多5小時)
function generateDurationOptions() {
  const options: string[] = [];
  for (let totalMinutes = 15; totalMinutes <= 300; totalMinutes += 15) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      options.push(`${minutes}分鐘`);
    } else if (minutes === 0) {
      options.push(`${hours}小時`);
    } else {
      options.push(`${hours}小時${minutes}分鐘`);
    }
  }
  return options;
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
  // 解析原有的 timeRange (例如 "09:00-10:30")
  const parseTimeRange = (range: string) => {
    if (!range) return { start: '', end: '' };
    const [start, end] = range.split('-');
    return { start: start?.trim() || '', end: end?.trim() || '' };
  };

  const initialTimes = parseTimeRange(item?.timeRange || '');
  const [title, setTitle] = useState(item?.title || '');
  const [startTime, setStartTime] = useState(initialTimes.start);
  const [endTime, setEndTime] = useState(initialTimes.end);
  const [location, setLocation] = useState(item?.location || '');
  const [note, setNote] = useState(item?.note || '');
  const [ticketLink, setTicketLink] = useState(item?.ticketLink || '');

  // 交通方式欄位
  const [transportMethod, setTransportMethod] = useState(item?.transportation?.method || '');
  const [transportDuration, setTransportDuration] = useState(item?.transportation?.duration || '');
  const [transportCost, setTransportCost] = useState(item?.transportation?.cost?.toString() || '');
  const [transportCostCurrency, setTransportCostCurrency] = useState<'JPY' | 'TWD'>(item?.transportation?.costCurrency || 'JPY');
  const [transportNote, setTransportNote] = useState(item?.transportation?.note || '');
  const [transportMapsLink, setTransportMapsLink] = useState(item?.transportation?.mapsLink || '');

  const timeOptions = generateTimeOptions();
  const durationOptions = generateDurationOptions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證必填欄位
    if (!title.trim()) {
      alert('請輸入項目名稱');
      return;
    }
    if (!startTime) {
      alert('請選擇開始時間');
      return;
    }

    try {
      // 組合時間範圍（如果沒有結束時間，就只顯示開始時間）
      const timeRange = endTime ? `${startTime}-${endTime}` : startTime;

      // 組合交通資訊
      let transportation: Transportation | undefined = undefined;
      if (transportMethod) {
        transportation = { method: transportMethod };

        // 只加入有值的選填欄位
        if (transportDuration) {
          transportation.duration = transportDuration;
        }
        if (transportCost) {
          transportation.cost = parseFloat(transportCost);
          transportation.costCurrency = transportCostCurrency;
        }
        if (transportNote) {
          transportation.note = transportNote;
        }
        if (transportMapsLink) {
          transportation.mapsLink = transportMapsLink;
        }
      }

      // 準備要儲存的資料，只包含有值的選填欄位
      const dataToSave: any = {
        title,
        timeRange,
      };

      // 只有當 location 有值時才加入
      if (location.trim()) {
        dataToSave.location = location;
      }

      // 只有當 note 有值時才加入
      if (note.trim()) {
        dataToSave.note = note;
      }

      // 只有當 ticketLink 有值時才加入
      if (ticketLink.trim()) {
        dataToSave.ticketLink = ticketLink;
      }

      // 只有當 transportation 有值時才加入
      if (transportation) {
        dataToSave.transportation = transportation;
      }

      if (item) {
        await updateItineraryItem(item.id, dataToSave);
      } else {
        await addItineraryItem({
          tripId,
          dayId,
          ...dataToSave,
          order: nextOrder,
        });
      }
      onClose();
    } catch (error) {
      console.error('儲存失敗，完整錯誤訊息:', error);
      console.error('錯誤類型:', error instanceof Error ? error.message : '未知錯誤');
      alert(`儲存失敗：${error instanceof Error ? error.message : '未知錯誤'}\n\n請檢查瀏覽器 Console 查看詳細錯誤訊息`);
    }
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
            <label>時間 *</label>
            <div className="form-row">
              <div>
                <label>開始時間 *</label>
                <select value={startTime} onChange={(e) => setStartTime(e.target.value)}>
                  <option value="">--:--</option>
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>結束時間 (選填)</label>
                <select value={endTime} onChange={(e) => setEndTime(e.target.value)}>
                  <option value="">--:--</option>
                  {timeOptions.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="form-group">
            <label>地點</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="例如：淺草寺" />
          </div>
          <div className="form-group">
            <label>備註</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <div className="form-group">
            <label>票券/憑證連結 (選填)</label>
            <input
              type="url"
              value={ticketLink}
              onChange={(e) => setTicketLink(e.target.value)}
              placeholder="例如：KKday訂單、Klook訂單、雲端圖片連結"
            />
          </div>

          {/* 交通方式區塊 */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
            <h4 style={{ marginBottom: '1rem', fontSize: 'var(--font-base)', fontWeight: 600 }}>🚇 交通方式（到這裡）</h4>
            <div className="form-group">
              <label>交通工具</label>
              <select value={transportMethod} onChange={(e) => setTransportMethod(e.target.value)}>
                <option value="">-- 無 --</option>
                <option value="🚄 電車">🚄 電車</option>
                <option value="🚌 巴士">🚌 巴士</option>
                <option value="🚶 步行">🚶 步行</option>
                <option value="🚕 計程車">🚕 計程車</option>
                <option value="✈️ 飛機">✈️ 飛機</option>
              </select>
            </div>
            {transportMethod && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>交通時間 (選填)</label>
                    <select
                      value={transportDuration}
                      onChange={(e) => setTransportDuration(e.target.value)}
                    >
                      <option value="">-- 選擇時間 --</option>
                      {durationOptions.map(duration => (
                        <option key={duration} value={duration}>{duration}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>費用 (選填)</label>
                    <div className="form-row">
                      <input
                        type="number"
                        value={transportCost}
                        onChange={(e) => setTransportCost(e.target.value)}
                        placeholder="例如：200"
                        style={{ flex: 2 }}
                      />
                      <select
                        value={transportCostCurrency}
                        onChange={(e) => setTransportCostCurrency(e.target.value as 'JPY' | 'TWD')}
                        style={{ flex: 1 }}
                      >
                        <option value="JPY">JPY</option>
                        <option value="TWD">TWD</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label>交通備註 (選填)</label>
                  <input
                    type="text"
                    value={transportNote}
                    onChange={(e) => setTransportNote(e.target.value)}
                    placeholder="例如：JR山手線"
                  />
                </div>
                <div className="form-group">
                  <label>Google Maps 連結 (選填)</label>
                  <input
                    type="url"
                    value={transportMapsLink}
                    onChange={(e) => setTransportMapsLink(e.target.value)}
                    placeholder="例如：https://maps.app.goo.gl/..."
                  />
                </div>
              </>
            )}
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
  isEditMode,
  onEdit,
  onDelete,
}: {
  item: ItineraryItem;
  isEditMode: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const handleDelete = () => {
    if (confirm('確定要刪除此項目？')) onDelete();
  };

  // 解析時間範圍
  const parseTimeRange = (range: string) => {
    if (!range) return { start: '', end: '' };
    const [start, end] = range.split('-');
    return { start: start?.trim() || '', end: end?.trim() || '' };
  };

  const { start, end } = parseTimeRange(item.timeRange);

  return (
    <>
      {/* 交通資訊區塊 - 顯示在行程項目上方 */}
      {item.transportation && (
        <div className="transportation-connector">
          <div className="transport-line"></div>
          <div className="transport-info">
            {/* Transport badge - absolutely positioned based on timeline center */}
            <span className="transport-method">{item.transportation.method}</span>
            {/* 第一行：連結 */}
            {item.transportation.mapsLink && (
              <div className="transport-info-row-1">
                <a
                  href={item.transportation.mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transport-maps-link"
                  onClick={(e) => e.stopPropagation()}
                >
                  🗺️ 查看路線
                </a>
              </div>
            )}
            {/* 第二行：時間 + 費用 */}
            {(item.transportation.duration || item.transportation.cost) && (
              <div className="transport-info-row-2">
                {item.transportation.duration && (
                  <span className="transport-detail">⏱️ {item.transportation.duration}</span>
                )}
                {item.transportation.cost && (
                  <span className="transport-detail">
                    💴 {item.transportation.costCurrency === 'TWD' ? 'NT$' : '¥'}{item.transportation.cost}
                  </span>
                )}
              </div>
            )}
            {/* 第三行：備註 */}
            {item.transportation.note && (
              <div className="transport-info-row-3">
                <span className="transport-note">{item.transportation.note}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 行程項目 */}
      <div className="itinerary-item">
        {/* 時間欄位 */}
        <div className="timeline-time">
          {start && <span className="time-text">{start}</span>}
          {end && <span className="time-end">{end}</span>}
          <div className="timeline-dot"></div>
        </div>

        {/* 內容卡片 */}
        <div className="timeline-content">
          <div className="itinerary-item-header">
            <div className="activity-info">
              <div className="activity-title">{item.title}</div>
              {item.location && (
                <div className="itinerary-location">
                  {item.location}
                </div>
              )}
            </div>
          </div>

          {item.note && <div className="itinerary-note">{item.note}</div>}

          {item.ticketLink && (
            <div style={{ marginTop: '0.5rem' }}>
              <a
                href={item.ticketLink}
                target="_blank"
                rel="noopener noreferrer"
                className="transport-ticket-link"
                onClick={(e) => e.stopPropagation()}
              >
                🎫 查看票券
              </a>
            </div>
          )}

          {isEditMode && (
            <div className="itinerary-actions">
              <button className="btn-small" onClick={onEdit}>編輯</button>
              <button className="btn-small btn-danger" onClick={handleDelete}>刪除</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
