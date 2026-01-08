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
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [taiwanPrice, setTaiwanPrice] = useState(item.taiwanPrice?.toString() || '');
  const [productLink, setProductLink] = useState(item.productLink || '');

  const handleSavePrice = async () => {
    await updateShoppingItem(item.id, {
      taiwanPrice: taiwanPrice ? parseFloat(taiwanPrice) : undefined,
    });
    setIsEditingPrice(false);
  };

  const handleSaveLink = async () => {
    const data: any = {};
    if (productLink.trim()) {
      data.productLink = productLink.trim();
    } else {
      // 如果清空連結，傳遞 null 來刪除欄位
      data.productLink = null;
    }
    await updateShoppingItem(item.id, data);
    setIsEditingLink(false);
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

        {/* 商品名稱與連結 */}
        <div className="shopping-item-name">
          <span className={item.isPurchased ? 'strikethrough' : ''}>{item.itemName}</span>
          {isEditingLink ? (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
              <input
                type="url"
                value={productLink}
                onChange={(e) => setProductLink(e.target.value)}
                placeholder="商品連結"
                style={{ flex: 1, fontSize: 'var(--font-xs)' }}
                autoFocus
              />
              <button className="btn-small" onClick={handleSaveLink}>✓</button>
              <button className="btn-small" onClick={() => { setProductLink(item.productLink || ''); setIsEditingLink(false); }}>✕</button>
            </div>
          ) : (
            <div style={{ marginTop: '0.25rem' }}>
              {item.productLink ? (
                <a
                  href={item.productLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="product-link"
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: 'var(--font-xs)' }}
                >
                  🔗 商品連結
                </a>
              ) : (
                <span
                  className="price-placeholder"
                  onClick={() => !isEditMode && setIsEditingLink(true)}
                  style={{ cursor: isEditMode ? 'default' : 'pointer', fontSize: 'var(--font-xs)' }}
                >
                  + 商品連結
                </span>
              )}
            </div>
          )}
        </div>

        {/* 台灣價格 */}
        <div className="taiwan-price">
          {isEditingPrice ? (
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
              <button className="btn-small" onClick={() => setIsEditingPrice(false)}>✕</button>
            </div>
          ) : (
            <div onClick={() => !isEditMode && setIsEditingPrice(true)} style={{ cursor: isEditMode ? 'default' : 'pointer' }}>
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
  const [productLink, setProductLink] = useState('');
  const [taiwanPrice, setTaiwanPrice] = useState('');
  const [includeTaiwanPrice, setIncludeTaiwanPrice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    const data: any = {
      tripId,
      participantId,
      itemName: itemName.trim(),
      isPurchased: false,
    };

    // 只有當有值時才加入選填欄位
    if (productLink.trim()) {
      data.productLink = productLink.trim();
    }
    if (taiwanPrice) {
      data.taiwanPrice = parseFloat(taiwanPrice);
    }

    await addShoppingItem(data);
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
            <label>商品連結 (選填)</label>
            <input
              type="url"
              value={productLink}
              onChange={(e) => setProductLink(e.target.value)}
              placeholder="例如：https://www.amazon.co.jp/..."
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeTaiwanPrice}
                onChange={(e) => setIncludeTaiwanPrice(e.target.checked)}
              />
              <span>比價台灣價格</span>
            </label>
          </div>

          {includeTaiwanPrice && (
            <div className="form-group">
              <label>台灣價格 (TWD)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={taiwanPrice}
                onChange={(e) => setTaiwanPrice(e.target.value)}
                placeholder="例如：9500"
                autoFocus
              />
            </div>
          )}

          <div className="button-group">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary">新增</button>
          </div>
        </form>
      </div>
    </div>
  );
}
