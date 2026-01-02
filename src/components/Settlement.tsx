import { useMemo } from 'react';
import type { Expense, Participant } from '../types';
import { calculateSettlement } from '../utils/settlement';
import { formatCurrency, convertJPYToTWD } from '../utils/currency';

interface SettlementProps {
  expenses: Expense[];
  participants: Participant[];
  displayCurrency: 'JPY' | 'TWD';
  exchangeRate: number;
}

export default function Settlement({ expenses, participants, displayCurrency, exchangeRate }: SettlementProps) {
  const { balances, settlements } = useMemo(
    () => calculateSettlement(expenses, participants),
    [expenses, participants]
  );

  const getParticipantName = (id: string) => {
    return participants.find(p => p.id === id)?.name || id;
  };

  const displayAmount = (amount: number) => {
    const finalAmount = displayCurrency === 'TWD' ? convertJPYToTWD(amount, exchangeRate) : amount;
    return formatCurrency(finalAmount, displayCurrency);
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

      <div className="balances-section">
        <h3>個人餘額</h3>
        <div className="balances-grid">
          {balances.map(b => (
            <div key={b.participantId} className={`balance-card ${b.balance > 0 ? 'positive' : b.balance < 0 ? 'negative' : 'neutral'}`}>
              <div className="balance-name">{getParticipantName(b.participantId)}</div>
              <div className="balance-amount">
                {b.balance > 0 ? '應收 ' : b.balance < 0 ? '應付 ' : ''}
                {displayAmount(Math.abs(b.balance))}
              </div>
            </div>
          ))}
        </div>
        <div className="balance-hint">
          <small>正數表示應收款，負數表示應付款</small>
        </div>
      </div>

      <div className="settlements-section">
        <div className="section-header">
          <h3>結算方案</h3>
          {settlements.length > 0 && (
            <button className="btn-small" onClick={handleCopySettlement}>
              📋 複製
            </button>
          )}
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
