import { useState } from 'react';
import type { Expense, Participant } from '../types';
import { formatCurrency, convertJPYToTWD } from '../utils/currency';
import { deleteExpense } from '../lib/firestore';
import ExpenseForm from './ExpenseForm';

interface ExpenseListProps {
  tripId: string;
  expenses: Expense[];
  participants: Participant[];
  displayCurrency: 'JPY' | 'TWD';
  exchangeRate: number;
  onRefresh: () => void;
}

export default function ExpenseList({
  tripId,
  expenses,
  participants,
  displayCurrency,
  exchangeRate,
  onRefresh,
}: ExpenseListProps) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showForm, setShowForm] = useState(false);

  const getParticipantName = (id: string) => {
    return participants.find(p => p.id === id)?.name || id;
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('確定要刪除此筆費用？')) return;

    try {
      await deleteExpense(expenseId);
      onRefresh();
    } catch (err) {
      alert('刪除失敗');
      console.error(err);
    }
  };

  const displayAmount = (amount: number) => {
    const finalAmount = displayCurrency === 'TWD' ? convertJPYToTWD(amount, exchangeRate) : amount;
    return formatCurrency(finalAmount, displayCurrency);
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case '食物': return '🍜';
      case '交通': return '🚇';
      case '住宿': return '🏨';
      case '購物': return '🛍️';
      default: return '📝';
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        <p>尚無費用記錄</p>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          新增第一筆費用
        </button>
        {showForm && (
          <ExpenseForm
            tripId={tripId}
            participants={participants}
            onClose={() => setShowForm(false)}
            onSaved={onRefresh}
          />
        )}
      </div>
    );
  }

  return (
    <div className="expense-list">
      <button className="btn-primary btn-add" onClick={() => setShowForm(true)}>
        + 新增費用
      </button>

      {expenses.map(expense => {
        const splitPerPerson = expense.amount / expense.splitAmong.length;
        return (
          <div key={expense.id} className="expense-item">
            <div className="expense-header">
              <div className="expense-title">
                <span className="category-emoji">{getCategoryEmoji(expense.category)}</span>
                <strong>{expense.title}</strong>
              </div>
              <div className="expense-amount">{displayAmount(expense.amount)}</div>
            </div>
            <div className="expense-details">
              <div className="expense-info">
                <span>付款：{getParticipantName(expense.paidBy)}</span>
                <span>分帳：{expense.splitAmong.map(id => getParticipantName(id)).join(', ')}</span>
                <span>每人：{displayAmount(splitPerPerson)}</span>
              </div>
              <div className="expense-meta">
                {new Date(expense.date).toLocaleString('zh-TW', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            {expense.note && <div className="expense-note">📌 {expense.note}</div>}
            <div className="expense-actions">
              <button className="btn-small" onClick={() => { setEditingExpense(expense); setShowForm(true); }}>
                編輯
              </button>
              <button className="btn-small btn-danger" onClick={() => handleDelete(expense.id)}>
                刪除
              </button>
            </div>
          </div>
        );
      })}

      {showForm && (
        <ExpenseForm
          tripId={tripId}
          participants={participants}
          expense={editingExpense || undefined}
          onClose={() => { setShowForm(false); setEditingExpense(null); }}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}
