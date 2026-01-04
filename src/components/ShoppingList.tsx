import { useState, useEffect } from 'react';
import type { ShoppingItem, Participant } from '../types';
import {
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  subscribeShoppingItems,
} from '../lib/firestore';

interface ShoppingListProps {
  tripId: string;
  participants: Participant[];
}

export default function ShoppingList({ tripId, participants }: ShoppingListProps) {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(participants[0]?.id || '');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeShoppingItems(tripId, setItems);
    return () => unsubscribe();
  }, [tripId]);

  const participantItems = items
    .filter(item => item.participantId === selectedParticipantId)
    .sort((a, b) => {
      // 未購買的在上面，已購買的在下面
      if (a.isPurchased !== b.isPurchased) {
        return a.isPurchased ? 1 : -1;
      }
      // 相同狀態按創建時間排序
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const handleTogglePurchased = async (item: ShoppingItem) => {
    await updateShoppingItem(item.id, { isPurchased: !item.isPurchased });
  };

  const handleDelete = async (id: string) => {
    if (confirm('確定要刪除此項目？')) {
      await deleteShoppingItem(id);
    }
  };

  return (
    <div className="shopping-container">
      {/* 參與者標籤 */}
      <div className="participant-tabs">
        {participants.map(p => (
          <button
            key={p.id}
            className={`participant-tab ${selectedParticipantId === p.id ? 'active' : ''}`}
            onClick={() => setSelectedParticipantId(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* 操作按鈕 */}
      <div className="shopping-header">
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          + 新增項目
        </button>
        <button
          className={`btn-small ${isEditMode ? 'btn-danger' : ''}`}
          onClick={() => setIsEditMode(!isEditMode)}
        >
          {isEditMode ? '完成' : '編輯'}
        </button>
      </div>

      {/* 購物清單 */}
      {participantItems.length === 0 ? (
        <div className="empty-state">
          <p>尚無購物項目</p>
        </div>
      ) : (
        <div className="shopping-items">
          {participantItems.map(item => (
            <ShoppingItemCard
              key={item.id}
              item={item}
              isEditMode={isEditMode}
              onToggle={() => handleTogglePurchased(item)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      {/* 新增表單 */}
      {showAddForm && (
        <AddItemForm
          tripId={tripId}
          participantId={selectedParticipantId}
          onClose={() => setShowAddForm(false)}
        />
      )}
    </div>
  );
}

// 購物項目卡片
function ShoppingItemCard({
  item,
  isEditMode,
  onToggle,
  onDelete,
}: {
  item: ShoppingItem;
  isEditMode: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [taiwanPrice, setTaiwanPrice] = useState(item.taiwanPrice?.toString() || '');

  const handleSavePrice = async () => {
    await updateShoppingItem(item.id, {
      taiwanPrice: taiwanPrice ? parseFloat(taiwanPrice) : undefined,
    });
    setIsEditing(false);
  };

  return (
    <div className={`shopping-item ${item.isPurchased ? 'purchased' : ''}`}>
      <div className="shopping-item-main">
        {/* 勾選框 */}
        <input
          type="checkbox"
          checked={item.isPurchased}
          onChange={onToggle}
          className="shopping-checkbox"
        />

        {/* 商品名稱 */}
        <div className="shopping-item-name">
          <span className={item.isPurchased ? 'strikethrough' : ''}>{item.itemName}</span>
        </div>

        {/* 台灣價格 */}
        <div className="taiwan-price">
          {isEditing ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="number"
                value={taiwanPrice}
                onChange={(e) => setTaiwanPrice(e.target.value)}
                placeholder="台灣價格"
                className="price-input"
                autoFocus
              />
              <button className="btn-small" onClick={handleSavePrice}>✓</button>
              <button className="btn-small" onClick={() => setIsEditing(false)}>✕</button>
            </div>
          ) : (
            <div onClick={() => !isEditMode && setIsEditing(true)} style={{ cursor: isEditMode ? 'default' : 'pointer' }}>
              {item.taiwanPrice ? (
                <span className="price-tag">台灣 NT${item.taiwanPrice}</span>
              ) : (
                <span className="price-placeholder">+ 台灣價格</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 編輯模式下的刪除按鈕 */}
      {isEditMode && (
        <div className="shopping-actions">
          <button className="btn-small btn-danger" onClick={onDelete}>刪除</button>
        </div>
      )}
    </div>
  );
}

// 新增項目表單
function AddItemForm({
  tripId,
  participantId,
  onClose,
}: {
  tripId: string;
  participantId: string;
  onClose: () => void;
}) {
  const [itemName, setItemName] = useState('');
  const [taiwanPrice, setTaiwanPrice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    await addShoppingItem({
      tripId,
      participantId,
      itemName: itemName.trim(),
      taiwanPrice: taiwanPrice ? parseFloat(taiwanPrice) : undefined,
      isPurchased: false,
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
        <h3>新增購物項目</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>商品名稱 *</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="例如：Nintendo Switch"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>台灣價格 (TWD)</label>
            <input
              type="number"
              value={taiwanPrice}
              onChange={(e) => setTaiwanPrice(e.target.value)}
              placeholder="例如：9500"
            />
          </div>
          <div className="button-group">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary">新增</button>
          </div>
        </form>
      </div>
    </div>
  );
}
