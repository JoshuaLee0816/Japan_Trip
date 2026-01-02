# 日本旅行費用追蹤系統

繁體中文 | [English](./README.md)

一個用於追蹤團體旅行共同費用的漸進式網頁應用程式。使用 React 19、TypeScript 和 Firebase Firestore 建構，支援多裝置即時同步。

## 功能特色

### 費用管理
- 即時費用追蹤，所有參與者自動同步
- 支援多幣別（日圓、台幣）
- 彈性費用分攤（所有人或指定人員）
- 費用分類（餐飲、交通、住宿、購物等）

### 自動結算
- 自動計算個人餘額
- 產生最少交易次數的結算建議
- 清楚顯示誰欠誰多少錢

### 行程規劃
- 依日期規劃行程
- 新增項目包含時間、地點、預算資訊
- 標記項目完成狀態
- 所有裝置即時同步

### 房間代碼系統
- 簡單的 6 位字元房間代碼
- 安全存取控制 - 僅代碼持有者可存取旅程資料
- 支援多位參與者

### 漸進式網頁應用程式
- 可安裝至裝置主畫面
- 離線功能與資料持久化
- 全螢幕體驗，無瀏覽器介面
- 針對所有 iPhone 機型最佳化（SE 至 15 Pro Max）

## 技術架構

### 前端
- React 19 搭配 TypeScript
- Vite 7 建構工具
- CSS 響應式設計，行動裝置優先

### 後端
- Firebase Firestore 即時資料庫
- 雲端託管，全球可存取

### PWA 功能
- Workbox service worker 快取機制
- Web App Manifest 支援安裝
- 離線資料存取

### 部署
- Vercel 生產環境託管
- 自動 HTTPS 與全球 CDN

## 開始使用

### 前置需求
- Node.js 18 或更高版本
- npm 9 或更高版本
- 已啟用 Firestore 的 Firebase 專案

### 安裝步驟

1. 複製專案：
```bash
git clone <repository-url>
cd japan-trip-pwa
```

2. 安裝相依套件：
```bash
npm install
```

3. 設定 Firebase：

在專案根目錄建立 `.env` 檔案：
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. 啟動開發伺服器：
```bash
npm run dev
```

5. 在瀏覽器開啟 `http://localhost:5173`

### Firebase 設定

1. 在 https://console.firebase.google.com 建立 Firebase 專案
2. 啟用 Firestore Database（開發時使用測試模式）
3. 選擇地區：`asia-northeast1`（東京）以獲得日本/台灣最佳效能
4. 將設定值複製到 `.env` 檔案

### Firestore 安全規則

開發環境（測試模式）：
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

生產環境：
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /trips/{tripId} {
      allow read, write: if true;
    }
    match /expenses/{expenseId} {
      allow read, write: if true;
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

## 使用說明

### 建立旅程

1. 開啟應用程式
2. 點擊「創建新旅程」
3. 輸入參與者姓名（以逗號分隔）
4. 點擊「創建旅程」
5. 記下產生的房間代碼

### 加入旅程

1. 開啟應用程式
2. 點擊「加入現有旅程」
3. 輸入旅程建立者分享的房間代碼
4. 點擊「加入」

### 新增費用

1. 切換至「費用」分頁
2. 點擊「新增費用」
3. 填寫詳細資訊：
   - 描述（例如：「晚餐」）
   - 金額與幣別
   - 付款人
   - 參與者（所有人或特定人員）
   - 分類
4. 點擊「新增費用」
5. 費用立即同步至所有參與者

### 查看結算

1. 切換至「結算」分頁
2. 查看個人餘額（正數 = 應收款，負數 = 應付款）
3. 查看最佳付款流程的結算建議

### 規劃行程

1. 切換至「行程」分頁
2. 點擊「新增一天」建立新日期
3. 為每一天新增項目：
   - 時間
   - 地點
   - 描述與預算
4. 旅程中標記項目為已完成

## 開發

### 可用指令

```bash
npm run dev       # 啟動開發伺服器
npm run build     # 建構生產版本
npm run preview   # 預覽生產版本
npm run lint      # 執行 ESLint
```

### 專案結構

```
src/
├── components/       # React 元件
│   ├── TripSetup.tsx
│   ├── ExpenseForm.tsx
│   ├── ExpenseList.tsx
│   ├── Settlement.tsx
│   └── Itinerary.tsx
├── lib/
│   └── firestore.ts  # Firebase 操作
├── utils/
│   └── settlement.ts # 結算演算法
├── types/
│   └── index.ts      # TypeScript 型別
├── App.tsx           # 主應用程式
├── App.css           # 樣式
└── main.tsx          # 進入點
```

## 部署

### Vercel 部署

1. 安裝 Vercel CLI：
```bash
npm install -g vercel
```

2. 部署：
```bash
vercel --prod
```

3. 在 Vercel Dashboard 設定環境變數：
   - 前往專案設定 > 環境變數
   - 新增所有 `VITE_FIREBASE_*` 變數
   - 選擇所有環境（Production、Preview、Development）

### Vercel 環境變數

必要的環境變數：
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## 瀏覽器支援

### 桌面版
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 行動版
- iOS Safari 14+（所有 iPhone 機型）
- Chrome Android 90+

### PWA 安裝

#### iOS（Safari）
1. 在 Safari 開啟應用程式
2. 點擊分享按鈕
3. 選擇「加入主畫面」
4. 應用程式將如原生應用程式般安裝

#### Android（Chrome）
1. 在 Chrome 開啟應用程式
2. 點擊選單按鈕
3. 選擇「加入主畫面」或「安裝應用程式」

## 效能最佳化

### iPhone 最佳化
- Safe Area insets 適配瀏海與 home indicator
- 44px 最小觸控目標尺寸（符合 Apple HIG 規範）
- 16px 輸入欄位字體大小防止自動縮放
- 橫向模式支援
- CSS 硬體加速

### Bundle 最佳化
- JavaScript：約 545 KB（gzip 壓縮後：約 170 KB）
- CSS：約 15 KB（gzip 壓縮後：約 3 KB）
- Service Worker 快取：23 個項目（約 551 KB）

## 安全性考量

### 資料隱私
- 不收集個人識別資料
- 無第三方追蹤
- 所有資料儲存在您的 Firebase 專案中
- 房間代碼提供存取控制

### Firebase 安全性
- 房間代碼系統提供基本隱私保護
- Firestore 安全規則限制存取
- 測試模式 30 天後過期
- 公開使用前應設定生產環境規則

## 已知限制

1. 每個裝置一次僅能參與一個旅程
2. 房間代碼安全性 - 任何持有代碼的人都可存取旅程資料
3. 多位使用者同時編輯時，離線編輯可能產生衝突
4. 建議使用 iOS 15+ 以獲得完整功能支援

## 貢獻

歡迎貢獻。請遵循現有的程式碼風格，並為新功能提供測試。

## 授權

MIT 授權

## 支援

問題與疑問：
1. 檢查瀏覽器 console 的錯誤訊息
2. 驗證 Firebase 設定
3. 確認 Firestore Database 已啟用
4. 檢查 Firestore 安全規則

## 技術文件

詳細技術實作資訊請參見 [TECHNIQUES.md](./TECHNIQUES.md)（英文）。

---

**線上展示：** https://japan-trip-pwa-jade.vercel.app
