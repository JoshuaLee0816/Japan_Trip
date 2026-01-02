# PWA 圖示說明

此目錄需要包含以下尺寸的 PNG 圖示：

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## 如何生成圖示

### 方法 1: 使用線上工具
1. 訪問 https://realfavicongenerator.net/ 或 https://www.pwabuilder.com/imageGenerator
2. 上傳一個 512x512 的原始圖片
3. 下載生成的圖示套件
4. 將圖示放入此目錄

### 方法 2: 使用 ImageMagick (需要先安裝)
```bash
# 從 512x512 的原始圖片生成所有尺寸
convert icon-source.png -resize 72x72 icon-72x72.png
convert icon-source.png -resize 96x96 icon-96x96.png
convert icon-source.png -resize 128x128 icon-128x128.png
convert icon-source.png -resize 144x144 icon-144x144.png
convert icon-source.png -resize 152x152 icon-152x152.png
convert icon-source.png -resize 192x192 icon-192x192.png
convert icon-source.png -resize 384x384 icon-384x384.png
convert icon-source.png -resize 512x512 icon-512x512.png
```

### 方法 3: 使用簡單的佔位符圖示
在開發階段，你可以使用 vite.svg 複製成各個尺寸作為臨時圖示：

```bash
cd public/icons
for size in 72 96 128 144 152 192 384 512; do
  cp ../vite.svg icon-${size}x${size}.png
done
```

## 設計建議

- 使用簡單、清晰的設計
- 確保在小尺寸下也能辨識
- 使用與應用主題相符的顏色（例如：#3b82f6 藍色）
- 建議使用 🗾（日本地圖）、🗼（東京塔）或 💴（日元）等 emoji 作為靈感
