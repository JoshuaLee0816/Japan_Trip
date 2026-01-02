import { useState } from 'react';
import type { Expense, ExpenseCategory, Participant } from '../types';
import { addExpense, updateExpense } from '../lib/firestore';

interface ExpenseFormProps {
  tripId: string;
  participants: Participant[];
  expense?: Expense;
  onClose: () => void;
  onSaved: () => void;
}

const categories: ExpenseCategory[] = ['食物', '交通', '住宿', '購物', '其他'];

export default function ExpenseForm({ tripId, participants, expense, onClose, onSaved }: ExpenseFormProps) {
  const [title, setTitle] = useState(expense?.title || '');
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [paidBy, setPaidBy] = useState(expense?.paidBy || participants[0]?.id || '');
  const [splitAmong, setSplitAmong] = useState<string[]>(expense?.splitAmong || participants.map(p => p.id));
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category || '食物');
  const [date, setDate] = useState(expense?.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(expense?.date ? new Date(expense.date).toTimeString().slice(0, 5) : new Date().toTimeString().slice(0, 5));
  const [note, setNote] = useState(expense?.note || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('請輸入項目名稱');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('請輸入有效金額');
      return;
    }

    if (!paidBy) {
      setError('請選擇付款者');
      return;
    }

    if (splitAmong.length === 0) {
      setError('請選擇至少一位分帳對象');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const dateTime = new Date(`${date}T${time}`).toISOString();

      if (expense) {
        await updateExpense(expense.id, {
          title: title.trim(),
          amount: amountNum,
          paidBy,
          splitAmong,
          category,
          date: dateTime,
          note: note.trim(),
        });
      } else {
        await addExpense({
          tripId,
          title: title.trim(),
          amount: amountNum,
          paidBy,
          splitAmong,
          splitType: 'equal',
          category,
          date: dateTime,
          note: note.trim(),
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      setError('儲存失敗，請重試');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSplitParticipant = (participantId: string) => {
    if (splitAmong.includes(participantId)) {
      setSplitAmong(splitAmong.filter(id => id !== participantId));
    } else {
      setSplitAmong([...splitAmong, participantId]);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{expense ? '編輯費用' : '新增費用'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>項目名稱 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：午餐、交通費"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>金額 (JPY) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="1"
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>日期 *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>時間 *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label>分類 *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} disabled={loading}>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>付款者 *</label>
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)} disabled={loading}>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>分帳對象 *</label>
            <div className="checkbox-group">
              {participants.map(p => (
                <label key={p.id} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={splitAmong.includes(p.id)}
                    onChange={() => toggleSplitParticipant(p.id)}
                    disabled={loading}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>備註</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="選填"
              rows={3}
              disabled={loading}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <div className="button-group">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
