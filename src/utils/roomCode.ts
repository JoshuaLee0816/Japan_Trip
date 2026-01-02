// 生成 6 位數字房間代碼
export function generateRoomCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 驗證房間代碼格式
export function isValidRoomCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}
