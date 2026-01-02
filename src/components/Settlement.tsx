import { useMemo, useState } from 'react';
import type { Expense, Participant } from '../types';
import { calculateSettlement } from '../utils/settlement';
import { formatCurrency, convertJPYToTWD } from '../utils/currency';

interface SettlementProps {
  expenses: Expense[];
  participants: Participant[];
  exchangeRate: number;
}

export default function Settlement({ expenses, participants, exchangeRate }: SettlementProps) {
  // 結算頁面預設顯示台幣
  const [settlementCurrency, setSettlementCurrency] = useState<'JPY' | 'TWD'>('TWD');

  const { settlements } = useMemo(
    () => calculateSettlement(expenses, participants),
    [expenses, participants]
  );

  const getParticipantName = (id: string) => {
    return participants.find(p => p.id === id)?.name || id;
  };

  const displayAmount = (amount: number) => {
    const finalAmount = settlementCurrency === 'TWD' ? convertJPYToTWD(amount, exchangeRate) : amount;
    return formatCurrency(finalAmount, settlementCurrency);
  };

  const totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleCopySettlement = () => {
    const text = settlements.map(s =>
      `${getParticipantName(s.from)} 付給 ${getParticipantName(s.to)} ${displayAmount(s.amount)}`
    ).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      alert('已複製到剪貼簿');
    });
  };

  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        <p>尚無費用記錄，無法計算結算</p>
      </div>
    );
  }

  return (
    <div className="settlement-container">
      <div className="settlement-summary">
        <h3>總支出</h3>
        <div className="total-amount">{displayAmount(totalExpense)}</div>
      </div>

      <div className="settlements-section">
        <div className="section-header">
          <h3>結算方案</h3>
          <div className="section-actions">
            <div className="currency-toggle">
              <button
                className={`toggle-btn ${settlementCurrency === 'TWD' ? 'active' : ''}`}
                onClick={() => setSettlementCurrency('TWD')}
              >
                TWD
              </button>
              <button
                className={`toggle-btn ${settlementCurrency === 'JPY' ? 'active' : ''}`}
                onClick={() => setSettlementCurrency('JPY')}
              >
                JPY
              </button>
            </div>
            {settlements.length > 0 && (
              <button className="btn-small" onClick={handleCopySettlement}>
                複製
              </button>
            )}
          </div>
        </div>

        {settlements.length === 0 ? (
          <div className="settlement-complete">
            <p>✅ 所有帳目已平衡，無需轉帳</p>
          </div>
        ) : (
          <div className="settlements-list">
            {settlements.map((s, index) => (
              <div key={index} className="settlement-item">
                <div className="settlement-arrow">
                  <span className="from-name">{getParticipantName(s.from)}</span>
                  <span className="arrow">→</span>
                  <span className="to-name">{getParticipantName(s.to)}</span>
                </div>
                <div className="settlement-amount">{displayAmount(s.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="settlement-stats">
        <div className="stat-item">
          <span>總筆數</span>
          <strong>{expenses.length}</strong>
        </div>
        <div className="stat-item">
          <span>需轉帳</span>
          <strong>{settlements.length} 筆</strong>
        </div>
        <div className="stat-item">
          <span>平均每人</span>
          <strong>{displayAmount(totalExpense / participants.length)}</strong>
        </div>
      </div>
    </div>
  );
}
