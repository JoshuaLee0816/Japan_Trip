// 格式化金額顯示
export function formatCurrency(amount: number, currency: 'JPY' | 'TWD'): string {
  const symbol = currency === 'JPY' ? '¥' : 'NT$';
  return `${symbol}${Math.round(amount).toLocaleString('zh-TW')}`;
}

// JPY 轉 TWD
export function convertJPYToTWD(amountJPY: number, exchangeRate: number): number {
  return amountJPY * exchangeRate;
}

// TWD 轉 JPY
export function convertTWDToJPY(amountTWD: number, exchangeRate: number): number {
  return amountTWD / exchangeRate;
}
