import type { Expense, Settlement, ParticipantBalance, Participant } from '../types';

/**
 * 計算結算方案
 * 使用貪心演算法產生最少轉帳次數
 */
export function calculateSettlement(
  expenses: Expense[],
  participants: Participant[]
): { balances: ParticipantBalance[]; settlements: Settlement[] } {
  // 初始化每個人的餘額
  const balanceMap = new Map<string, number>();
  participants.forEach(p => balanceMap.set(p.id, 0));

  // 計算每個人的淨餘額
  expenses.forEach(expense => {
    const { amount, paidBy, splitAmong, splitType, customSplits } = expense;

    // 付款者增加餘額
    balanceMap.set(paidBy, (balanceMap.get(paidBy) || 0) + amount);

    // 分攤者減少餘額
    if (splitType === 'equal') {
      const splitAmount = amount / splitAmong.length;
      splitAmong.forEach(participantId => {
        balanceMap.set(participantId, (balanceMap.get(participantId) || 0) - splitAmount);
      });
    } else if (splitType === 'custom' && customSplits) {
      customSplits.forEach(split => {
        balanceMap.set(split.participantId, (balanceMap.get(split.participantId) || 0) - split.amount);
      });
    }
  });

  // 轉換為陣列
  const balances: ParticipantBalance[] = Array.from(balanceMap.entries()).map(
    ([participantId, balance]) => ({
      participantId,
      balance: Math.round(balance), // 四捨五入避免浮點誤差
    })
  );

  // 分離債權人和債務人
  const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);

  // 生成最小轉帳列表（貪心演算法）
  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const transferAmount = Math.min(creditor.balance, -debtor.balance);

    if (transferAmount > 0) {
      settlements.push({
        from: debtor.participantId,
        to: creditor.participantId,
        amount: transferAmount,
      });
    }

    creditor.balance -= transferAmount;
    debtor.balance += transferAmount;

    if (creditor.balance === 0) i++;
    if (debtor.balance === 0) j++;
  }

  return { balances, settlements };
}
