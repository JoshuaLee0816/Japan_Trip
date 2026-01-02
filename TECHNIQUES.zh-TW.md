# 技術實作指南

繁體中文 | [English](./TECHNIQUES.md)

本文件概述日本旅行費用追蹤 PWA 的技術架構、實作模式與關鍵決策。

## 架構概覽

### 前端架構

**框架：** React 19 搭配 TypeScript
**建構工具：** Vite 7
**狀態管理：** React hooks（useState、useEffect）
**樣式：** 原生 CSS 搭配 CSS 變數

應用程式採用元件化架構，職責明確分離：
- UI 元件處理呈現層
- Firebase 函式庫處理資料操作
- 工具函數處理商業邏輯
- TypeScript 型別確保型別安全

### 後端架構

**資料庫：** Firebase Firestore（NoSQL）
**認證：** 無（基於房間代碼的存取）
**託管：** Vercel（前端）、Firebase（資料庫）

資料結構分為三個主要集合：
- `trips`：旅程元資料與參與者資訊
- `expenses`：個別費用記錄
- `itinerary`：日期與項目的巢狀結構

### 資料流

```
使用者操作 → 元件 → Firestore 函式庫 → Firebase SDK → Firestore 資料庫
              ↑                                              ↓
              └───────────── 即時監聽器 ←────────────────────┘
```

透過 Firestore 監聽器實現即時同步，當資料庫變更時更新元件狀態。

## 關鍵技術決策

### 1. Firebase Firestore 而非 REST API

**決策：** 使用 Firebase Firestore 而非建構自訂 REST API

**理由：**
- 內建即時同步
- 原生支援離線持久化
- 無須伺服器維護
- 自動擴展
- 減少開發時間

**取捨：**
- 綁定 Firebase 供應商
- 複雜查詢能力有限
- 成本隨使用量擴展
- 快取策略控制較少

### 2. 房間代碼系統做為存取控制

**決策：** 實作簡單的 6 位字元房間代碼而非使用者認證

**理由：**
- 使用者摩擦最小（無需註冊）
- 適合短期旅行協作
- 簡單實作與理解
- 無需密碼管理

**實作：**
```typescript
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

**安全性考量：**
- 32 字元集合的 6 位字元 = 1,073,741,824 種組合
- 足以應付短期使用
- 未實作暴力破解保護
- localStorage 中的代碼未加密

### 3. 客戶端狀態管理

**決策：** 使用 React hooks 而非 Redux 或其他狀態管理函式庫

**理由：**
- 應用程式狀態簡單且本地化
- Firebase 處理同步
- 減少 bundle 大小
- 程式碼庫更簡單

**狀態結構：**
```typescript
const [currentTripId, setCurrentTripId] = useState<string | null>(null);
const [trip, setTrip] = useState<Trip | null>(null);
const [expenses, setExpenses] = useState<Expense[]>([]);
const [activeTab, setActiveTab] = useState<Tab>('expenses');
```

### 4. 結算演算法

**決策：** 實作貪婪演算法進行債務結算

**演算法：**
```typescript
function calculateSettlement(expenses: Expense[], participants: Participant[]): Settlement {
  // 計算每位參與者的淨餘額
  const balances = calculateBalances(expenses, participants);

  // 分離債務人與債權人
  const debtors = balances.filter(b => b.balance < 0);
  const creditors = balances.filter(b => b.balance > 0);

  // 配對最大債務與最大債權
  const transactions = [];
  while (debtors.length > 0 && creditors.length > 0) {
    const debtor = debtors[0];
    const creditor = creditors[0];

    const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
    transactions.push({ from: debtor.id, to: creditor.id, amount });

    debtor.balance += amount;
    creditor.balance -= amount;

    if (Math.abs(debtor.balance) < 0.01) debtors.shift();
    if (Math.abs(creditor.balance) < 0.01) creditors.shift();
  }

  return { transactions, balances };
}
```

**時間複雜度：** 排序 O(n log n) + 配對 O(n) = O(n log n)

**考慮過的替代方案：** 最小成本最大流演算法
- 實作更複雜
- 交易次數僅有微幅改善
- 對一般使用情況（4-8 位參與者）不值得增加複雜度

### 5. 行動優先響應式設計

**決策：** 採用行動優先並漸進增強

**斷點：**
```css
/* 基礎樣式：行動裝置（375px+）*/
/* 平板：max-width: 768px */
/* 桌面：min-width: 769px */
```

**iPhone 特定最佳化：**
```css
/* 瀏海安全區域支援 */
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);

/* 防止輸入聚焦時縮放 */
input {
  font-size: 16px;
}

/* 觸控目標最佳化 */
button {
  min-width: 44px;
  min-height: 44px;
}
```

### 6. PWA 實作

**Service Worker 策略：** 預快取搭配執行期快取

**設定：**
```typescript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/firestore\.googleapis\.com/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'firestore-cache',
          networkTimeoutSeconds: 10,
        }
      }
    ]
  }
})
```

**理由：**
- Firestore 的 NetworkFirst 確保資料新鮮
- 靜態資源預快取確保離線功能
- 自動更新確保使用者取得最新版本

## 元件實作細節

### TripSetup 元件

**用途：** 處理旅程建立與加入

**主要功能：**
- 表單驗證
- 房間代碼產生
- 參與者管理
- localStorage 持久化

**實作模式：**
```typescript
const handleCreateTrip = async () => {
  const participants = parseParticipants(participantInput);
  const roomCode = generateRoomCode();

  const trip = await createTrip({
    participants,
    roomCode,
    createdAt: new Date()
  });

  localStorage.setItem('currentTripId', trip.id);
  onTripSelect(trip.id);
};
```

### ExpenseForm 元件

**用途：** 新增與編輯費用

**驗證：**
- 必填欄位：描述、金額、付款人
- 金額必須為正數
- 至少選擇一位參與者

**分攤計算：**
```typescript
const splitAmount = totalAmount / selectedParticipants.length;
```

**小數處理：**
- 以整數（分/錢）儲存金額
- 顯示 2 位小數
- 避免浮點數誤差

### ExpenseList 元件

**用途：** 顯示與管理費用列表

**功能：**
- 透過 Firestore 監聽器即時更新
- 依日期分組
- 篩選與排序選項
- 編輯/刪除操作

**效能：**
```typescript
// 記憶化昂貴的計算
const groupedExpenses = useMemo(() => {
  return expenses.reduce((groups, expense) => {
    const date = formatDate(expense.createdAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(expense);
    return groups;
  }, {});
}, [expenses]);
```

### Settlement 元件

**用途：** 計算並顯示債務結算

**計算流程：**
1. 彙總所有費用
2. 計算每人總額
3. 計算淨餘額
4. 產生最少交易集

**UI 考量：**
- 顏色編碼（綠色 = 收款、紅色 = 付款）
- 清楚標示
- 金額格式化含幣別

### Itinerary 元件

**用途：** 每日行程規劃

**資料結構：**
```typescript
interface ItineraryDay {
  id: string;
  date: Date;
  tripId: string;
}

interface ItineraryItem {
  id: string;
  dayId: string;
  time: string;
  location: string;
  description: string;
  budget?: number;
  completed: boolean;
}
```

**巢狀集合模式：**
```
/itinerary/{dayId}
  /items/{itemId}
```

## Firebase 整合

### Firestore 函式庫結構

**檔案：** `src/lib/firestore.ts`

**匯出：**
- 各集合的 CRUD 操作
- 即時訂閱函數
- Firebase SDK 的型別安全包裝

**範例：**
```typescript
export async function createExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
  const docRef = await addDoc(collection(db, 'expenses'), {
    ...expense,
    createdAt: Timestamp.now()
  });

  return {
    id: docRef.id,
    ...expense
  };
}

export function subscribeExpenses(
  tripId: string,
  callback: (expenses: Expense[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'expenses'),
    where('tripId', '==', tripId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Expense[];
    callback(expenses);
  });
}
```

### 即時同步

**模式：** 掛載時訂閱，卸載時取消訂閱

```typescript
useEffect(() => {
  if (!currentTripId) return;

  const unsubscribe = subscribeExpenses(currentTripId, setExpenses);

  return () => unsubscribe();
}, [currentTripId]);
```

**優點：**
- 自動 UI 更新
- 無需輪詢
- 跨所有連線客戶端運作

**挑戰：**
- 管理訂閱生命週期
- 處理連線中斷
- 防止記憶體洩漏

## TypeScript 設定

### verbatimModuleSyntax

**設定：**
```json
{
  "compilerOptions": {
    "verbatimModuleSyntax": true
  }
}
```

**影響：**
- 要求明確使用 `import type` 進行僅型別匯入
- 防止型別的執行期匯入
- 編譯輸出更清晰

**模式：**
```typescript
import { collection } from 'firebase/firestore';
import type { Expense, Participant } from './types';
```

### 型別定義

**位置：** `src/types/index.ts`

**關鍵型別：**
```typescript
export interface Trip {
  id: string;
  participants: Participant[];
  roomCode: string;
  createdAt: Date;
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  currency: 'JPY' | 'TWD';
  paidBy: string;
  splitBetween: string[];
  category: ExpenseCategory;
  createdAt: Date;
}

export type ExpenseCategory =
  | 'food'
  | 'transportation'
  | 'accommodation'
  | 'shopping'
  | 'entertainment'
  | 'other';
```

## 效能最佳化

### Bundle 最佳化

**Vite 設定：**
```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/firestore'],
          'react-vendor': ['react', 'react-dom']
        }
      }
    }
  }
});
```

**結果：**
- 主要 bundle：545 KB（gzip 壓縮後 170 KB）
- Firebase chunk：約 300 KB
- React chunk：約 130 KB

### CSS 最佳化

**方法：**
- 單一 CSS 檔案（無 CSS-in-JS 開銷）
- CSS 變數用於主題
- Media queries 用於響應式設計
- 無未使用的 CSS（無框架）

**CSS 變數：**
```css
:root {
  --primary: #3b82f6;
  --text: #1f2937;
  --border: #e5e7eb;
  --error: #ef4444;
  --success: #10b981;
}
```

### 渲染效能

**技術：**
- 使用 React.memo 避免不必要的重新渲染
- 使用 useMemo 進行昂貴的計算
- 延遲載入元件（未來增強）
- 虛擬化長列表（未來增強）

## 安全性實作

### Firestore 安全規則

**開發規則：**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**生產規則：**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trips/{tripId} {
      allow read, write: if true;
      // 未來：驗證房間代碼
    }

    match /expenses/{expenseId} {
      allow read, write: if true;
      // 未來：驗證 tripId 存在
    }

    match /itinerary/{dayId} {
      allow read, write: if true;
      match /items/{itemId} {
        allow read, write: if true;
      }
    }
  }
}
```

### 客戶端驗證

**輸入清理：**
```typescript
function sanitizeInput(input: string): string {
  return input.trim().substring(0, 100); // 限制長度
}

function validateAmount(amount: string): number | null {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num * 100) / 100; // 四捨五入至 2 位小數
}
```

### XSS 防護

**方法：**
- React 自動跳脫 JSX
- 未使用 dangerouslySetInnerHTML
- 所有使用者輸入視為純文字

## 測試策略

### 當前狀態
- 未實作自動化測試
- 在各種裝置上手動測試

### 建議的測試方法

**單元測試：**
```typescript
describe('結算演算法', () => {
  it('應計算正確的餘額', () => {
    const expenses = [/* 測試資料 */];
    const result = calculateSettlement(expenses);
    expect(result.balances[0].balance).toBe(expectedAmount);
  });

  it('應產生最少交易', () => {
    const result = calculateSettlement(expenses);
    expect(result.transactions.length).toBeLessThanOrEqual(n-1);
  });
});
```

**整合測試：**
```typescript
describe('費用流程', () => {
  it('應建立費用並更新所有客戶端', async () => {
    await createExpense(testExpense);
    // 等待 Firestore 傳播
    await waitFor(() => {
      expect(screen.getByText(testExpense.description)).toBeInTheDocument();
    });
  });
});
```

## 部署流程

### 建構過程

```bash
npm run build
```

**步驟：**
1. TypeScript 編譯
2. Vite 打包與最小化
3. PWA manifest 與 service worker 產生
4. 資源最佳化

**輸出：**
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
├── sw.js
├── workbox-[hash].js
├── manifest.webmanifest
└── icons/
```

### Vercel 部署

**設定：** `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**環境變數：**
- 在 Vercel Dashboard 或透過 CLI 設定
- 以 `VITE_` 為前綴以暴露給客戶端
- 絕不將 `.env` 提交至版本控制

## 監控與分析

### 當前實作
- 未實作分析
- 未實作錯誤追蹤

### 建議工具

**錯誤追蹤：**
- Sentry 用於 JavaScript 錯誤
- Firebase Crashlytics

**分析：**
- Google Analytics 4
- Firebase Analytics

**效能：**
- Lighthouse CI
- Web Vitals 監控

## 未來技術增強

### 短期
1. **新增自動化測試**
2. **實作錯誤邊界**
3. **新增載入狀態**

### 中期
1. **最佳化 bundle 大小**
2. **新增離線佇列**
3. **實作資料匯出**

### 長期
1. **新增使用者認證**
2. **實作推播通知**
3. **新增進階功能**

## 經驗教訓

### 運作良好的部分
1. Firebase Firestore - 即時同步完美運作
2. TypeScript - 開發期間捕捉許多錯誤
3. Vite - 快速的開發體驗
4. 行動優先設計 - 確保良好的行動 UX

### 可改進的部分
1. 測試 - 應從一開始就加入測試
2. 錯誤處理 - 需要更健全的錯誤處理
3. 文件 - 應在建構時同步撰寫文件

### 關鍵要點
1. 從強型別的 TypeScript 開始
2. 從一開始考慮離線優先
3. 行動裝置最佳化對 PWA 至關重要
4. 即時功能增加顯著價值
5. 簡單的解決方案通常最好

## 結論

本應用程式展示使用現代網頁技術實作即時協作 PWA 的實務範例。架構優先考慮簡潔性與使用者體驗，同時維持良好的技術實踐。房間代碼方法證明並非所有應用程式都需要複雜的認證系統，而 Firebase Firestore 為即時協作功能提供了優秀的基礎。

未來的增強應聚焦於測試、錯誤處理與效能最佳化，同時維持使應用程式易於使用與維護的簡潔性。
