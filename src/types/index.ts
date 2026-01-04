// 參與者
export interface Participant {
  id: string;
  name: string;
}

// 費用分類
export type ExpenseCategory = '食物' | '交通' | '住宿' | '購物' | '其他';

// 分帳類型
export type SplitType = 'equal' | 'custom';

// 自訂分帳金額
export interface CustomSplit {
  participantId: string;
  amount: number;
}

// 費用
export interface Expense {
  id: string;
  tripId: string;
  date: string; // ISO string
  title: string;
  amount: number; // 始終以 JPY 儲存
  paidBy: string; // participant ID
  splitAmong: string[]; // participant IDs
  splitType: SplitType;
  customSplits?: CustomSplit[]; // 僅當 splitType === 'custom' 時使用
  category: ExpenseCategory;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// 交通方式
export interface Transportation {
  method: string; // 交通工具類型：電車、巴士、步行、計程車等
  duration?: string; // 交通時間，例如: "15分鐘"
  cost?: number; // 交通費用 (JPY)
  note?: string; // 額外備註，例如: "JR山手線"
  mapsLink?: string; // Google Maps 連結
  ticketLink?: string; // 票券/憑證連結（KKday、Klook、雲端圖片等）
}

// 行程項目
export interface ItineraryItem {
  id: string;
  tripId: string;
  dayId: string;
  timeRange: string; // 例如: "09:00-10:30"
  title: string;
  location?: string;
  note?: string;
  transportation?: Transportation; // 從上一個地點到這裡的交通方式
  order: number; // 用於排序
  createdAt: string;
  updatedAt: string;
}

// 行程日期
export interface ItineraryDay {
  id: string;
  tripId: string;
  date: string; // ISO string (YYYY-MM-DD)
  dayNumber: number; // Day 1, Day 2, etc.
  createdAt: string;
}

// 旅程
export interface Trip {
  id: string;
  name: string;
  roomCode: string; // 6位數字碼
  participants: Participant[];
  maxParticipants: number;
  exchangeRate: number; // JPY -> TWD 匯率
  displayCurrency: 'JPY' | 'TWD';
  createdAt: string;
  updatedAt: string;
}

// 結算結果
export interface Settlement {
  from: string; // participant ID
  to: string; // participant ID
  amount: number; // JPY
}

// 參與者餘額
export interface ParticipantBalance {
  participantId: string;
  balance: number; // 正數表示應收，負數表示應付
}

// 購物清單項目
export interface ShoppingItem {
  id: string;
  tripId: string;
  participantId: string; // 誰要買的
  itemName: string; // 商品名稱
  taiwanPrice?: number; // 台灣價格 (TWD)
  isPurchased: boolean; // 是否已購買
  createdAt: string;
  updatedAt: string;
}
