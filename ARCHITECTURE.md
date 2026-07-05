# 拋體探究實驗室 — 系統架構

線上網址：https://projectile-inquiry-lab.netlify.app ｜ 教師後台：/admin

## 一、整體架構

```
┌─────────────────────────────────────────────────────┐
│  學生瀏覽器（index.html 單檔 SPA）                     │
│                                                     │
│  Act1 預測 → Act2 探究實驗 → Act3 解釋(3次試驗解鎖)     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ 物理引擎  │ │ 實驗日誌  │ │ 規則引擎  │             │
│  │ 預算+回放 │ │ 目的→數據 │ │ AI觸發判斷│             │
│  │ Euler/dt │ │ →觀察→CER │ │ +cooldown │             │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘             │
│       └─── eventLog（每個操作都記）───┘               │
│              │ 批次上傳（事件驅動+20s+beforeunload）    │
└──────────────┼──────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────┐
│  Netlify Functions（免費，API key 藏環境變數）         │
│  feedback.js  → Gemini 2.5 Flash（AI 教練，節流3次/分）│
│  log.mjs      → Netlify Blobs 存學生完整快照           │
│  export.mjs   → 教師後台讀全部資料（ADMIN_KEY 驗證）    │
└──────────────┬──────────────────────────────────────┘
               ▼
        Netlify Blobs（store: lablogs，key: 班級/姓名_session）
               ▼
   admin.html 教師後台 → SheetJS 匯出 Excel（5 工作表）
```

## 二、AI 回饋觸發策略（避免每次操作都回饋）

| 觸發 | 條件 | 目的 |
|---|---|---|
| cov_violation | 一次發射前改了 ≥2 個變因 | 引導控制變因 |
| milestone | 每累積 4 次試驗 | 給探究方向提示 |
| prediction_miss | 預測與結果相反 | 引導反思物理 |
| cer | 送出 CER 小結 | 檢查證據↔主張一致性 |
| manual | 學生主動按按鈕 | 隨需協助 |

防洪機制：前端 60 秒 cooldown ＋ 後端每生每分鐘 3 次；送 AI 前先把 log 壓縮成
文字摘要（最近 8 筆試驗），省 token 且回饋更準。

## 三、實驗日誌設計（半結構化探究鷹架）

1. 試驗前（必填）：從 9 個預設探究任務選目的 ＋ 預測結果 ＋ 理由（選填）
2. 試驗中（自動）：參數與模擬結果自動寫入（R、H、t、理想值對照）
3. 試驗後：一句觀察
4. 每 3 次試驗：CER 小結（主張／勾選試驗當證據／推理）→ 觸發 AI 回饋

## 四、檔案結構

```
projectile-inquiry/
├── index.html              # 學生端（模擬+日誌+log+規則引擎+MathJax+Excel匯出）
├── admin.html              # 教師後台（載入全部 session + SheetJS 匯出）
├── netlify.toml            # functions 目錄 + /admin 轉址
├── package.json            # @netlify/blobs
└── netlify/functions/
    ├── feedback.js         # Gemini 代理（v1 function）
    ├── log.mjs             # 存 Blobs（v2 function）
    └── export.mjs          # 教師讀取（v2 function，ADMIN_KEY）
```

## 五、開發時踩過的坑（重要）

1. **rAF/setInterval 背景節流**：動畫不能驅動物理。解法＝物理瞬間預算完整軌跡，動畫只是依 wall-clock 跳幀回放。
2. **Netlify 免費方案 secret env var 會靜默失敗**：`getAllEnvVars` 回空陣列。改用一般環境變數。
3. **環境變數要重新部署才生效**（functions 在部署時注入）。
4. **gemini-2.0-flash 已退役**（2026）→ 用 gemini-2.5-flash，且要 `thinkingConfig:{thinkingBudget:0}`，否則思考 token 吃掉 maxOutputTokens 導致回覆被截斷。
5. **拖放 zip 部署會跑 build**，package.json 的依賴（@netlify/blobs）會自動安裝。
6. **MathJax 動態內容**要 `MathJax.typesetPromise([element])`；數據行不要用 LaTeX（inline SVG 會斷行），LaTeX 留給真公式。

## 六、環境變數

| 變數 | 用途 |
|---|---|
| GEMINI_API_KEY | Gemini API（functions scope） |
| ADMIN_KEY | 教師後台密鑰（自訂） |
