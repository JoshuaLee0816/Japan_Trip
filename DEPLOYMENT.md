# 部署指南 (Deployment Guide)

## 快速部署

只需要一個指令：

```bash
npm run deploy
```

這個指令會自動：
1. 執行 TypeScript 編譯 (`tsc -b`)
2. 執行 Vite 建置 (`vite build`)
3. 部署到 GitHub Pages (`gh-pages -d dist`)

---

## 詳細步驟

### 1. 確認 GitHub Repository 設定

確保你的 GitHub repository 有以下設定：

- **Repository 名稱**: `Japan_Trip`
- **GitHub Pages 設定**:
  - 到 Repository → Settings → Pages
  - Source: 選擇 `gh-pages` branch
  - 確認網站 URL: `https://你的用戶名.github.io/Japan_Trip/`

### 2. 本地建置與部署

```bash
# 安裝所有依賴（如果還沒安裝）
npm install

# 部署到 GitHub Pages
npm run deploy
```

### 3. 部署成功後

等待 1-2 分鐘，然後訪問：
```
https://你的用戶名.github.io/Japan_Trip/
```

---

## 單獨執行建置（不部署）

如果只想測試建置：

```bash
npm run build
```

建置結果會在 `dist/` 資料夾。

---

## 本地預覽建置結果

```bash
# 先建置
npm run build

# 預覽建置結果
npm run preview
```

---

## 開發模式

日常開發時使用：

```bash
npm run dev
```

這會啟動開發伺服器在 `http://localhost:5173`

---

## 重要配置檔案

### `vite.config.ts`
```typescript
export default defineConfig({
  base: '/Japan_Trip/',  // ← GitHub Pages 路徑
  // ...
})
```

### `package.json`
```json
{
  "scripts": {
    "predeploy": "npm run build",  // 部署前自動建置
    "deploy": "gh-pages -d dist"   // 部署 dist 資料夾
  }
}
```

---

## 常見問題

### Q: 部署後頁面空白？
A: 檢查 `vite.config.ts` 中的 `base` 路徑是否正確設定為 `/Japan_Trip/`

### Q: PWA 功能無法使用？
A: GitHub Pages 預設支援 HTTPS，PWA 功能應該正常。如果有問題，檢查 Service Worker 是否正確註冊。

### Q: 部署失敗？
A: 確認：
1. 已經 push 到 GitHub repository
2. gh-pages 套件已安裝 (`npm install gh-pages --save-dev`)
3. Git 已經設定好 remote origin

---

## Firebase 設定

記得在 Firebase Console 中：
1. 新增網域到 Authorized Domains
2. 設定 Firestore 規則
3. 確認 Firebase config 正確

---

## 更新流程

每次修改程式碼後：

```bash
# 1. 測試功能
npm run dev

# 2. 確認沒問題後，部署
npm run deploy

# 3. 等待 1-2 分鐘後訪問網站確認
```
