# 🚀 AI 拋體探究實驗室（Projectile Inquiry Lab）

> 互動物理模擬 × 結構化實驗日誌 × AI 教練即時回饋 × 教師後台 Excel 匯出
> 全部跑在**免費方案**（Netlify + Gemini free tier），可供全班同時使用。

**Live Demo**：https://projectile-inquiry-lab.netlify.app
（教師後台：`/admin`，需管理密鑰）

由 [@aiphysicsteacher](https://github.com/) 與 Claude 協作完成，作為「AI 探究實驗室」架構的參考實作，可套用到任何物理單元（單擺、彈簧、電路、波動…）。

---

## ✨ 功能特色

### 學生端（`index.html`，單檔 SPA、零框架）
- **POE 三幕探究**：Act1 預測挑戰（針對「45° 射程最遠」迷思）→ Act2 探究實驗 → Act3 數學解釋（完成 3 次試驗才解鎖，導覽列有進度徽章）
- **物理模擬**：含空氣阻力拋體（F = −c·v|v|），semi-implicit Euler、固定 dt；理想／真實模型雙軌跡對照；「射程 vs 角度」累積散點圖（Chart.js）
- **結構化實驗日誌**：試驗前必選探究任務（9 個預設引導句）＋預測 → 數據自動帶入 → 觀察 → 每 3 次試驗寫 CER 小結（主張／證據／推理）
- **AI 教練（事件觸發，非每次操作都回饋）**：
  | 觸發 | 條件 |
  |---|---|
  | 違反控制變因 | 一次發射前改了 ≥2 個變因 |
  | 里程碑 | 每累積 4 次試驗 |
  | 預測落空 | 預測與結果相反 |
  | CER 送出 | 檢查證據是否支持主張 |
  | 學生主動求助 | 60 秒 cooldown |
- **完整操作 Log**：每個操作（調參數、發射、觀察、AI 互動）都記錄並自動上傳
- **一鍵匯出 Excel**：學生個人日誌 5 工作表（SheetJS）
- LaTeX 公式渲染（MathJax）

### 後端（Netlify Functions，Serverless）
- `feedback.js`：Gemini 2.5 Flash 代理——**API key 只存在環境變數**，含每生每分鐘 3 次節流；蘇格拉底式提問 prompt（引導不給答案）
- `log.mjs`：學生紀錄快照存 Netlify Blobs
- `export.mjs`：教師後台資料讀取（ADMIN_KEY 驗證）

### 教師後台（`admin.html`）
全班 session 總覽 + 一鍵匯出 Excel（學生總表／試驗紀錄／CER／AI回饋／事件Log 共 5 工作表）

---

## 📁 專案結構

```
├── index.html              # 學生端（模擬+日誌+log+AI觸發引擎）
├── admin.html              # 教師後台
├── netlify.toml            # functions 目錄 + /admin 轉址
├── package.json            # 唯一依賴：@netlify/blobs
├── ARCHITECTURE.md         # 詳細架構文件（含踩坑紀錄，推薦閱讀）
└── netlify/functions/
    ├── feedback.js         # AI 教練代理
    ├── log.mjs             # Blobs 儲存
    └── export.mjs          # 教師資料匯出
```

## 🚀 部署自己的版本（約 10 分鐘）

1. **Fork / 下載**本 repo
2. 申請免費 [Gemini API key](https://aistudio.google.com/apikey)
3. 到 [Netlify](https://app.netlify.com) 建新專案，把整個資料夾拖放到 Deploys 頁（會自動 build 並安裝依賴）
4. Site configuration → Environment variables 新增：
   | 變數 | 值 |
   |---|---|
   | `GEMINI_API_KEY` | 你的 Gemini API key |
   | `ADMIN_KEY` | 自訂的教師後台密碼 |
   ⚠️ 免費方案**不要勾 secret**（會靜默失敗）；設定後**要再部署一次**才生效
5. 完成！把網址（或 QR code）給學生，教師後台在 `/admin`

## ⚠️ 開發踩坑筆記（技術重點）

1. **背景分頁節流**：rAF 和 setInterval 在背景分頁都會被瀏覽器節流——動畫不能驅動物理。解法：發射瞬間把整條軌跡預先算完，動畫只是依 wall-clock 時間跳幀回放。
2. **Gemini 2.5 的 thinking token** 會吃掉 `maxOutputTokens` 導致回覆截斷，記得 `thinkingConfig: { thinkingBudget: 0 }`。
3. **Netlify 環境變數**在 functions 是部署時注入，改完要重新部署。
4. **MathJax 動態內容**要對新節點呼叫 `MathJax.typesetPromise([el])`；純數據行別用 LaTeX（inline SVG 會斷行）。
5. 免費額度心智模型：Netlify 300 credits/月；AI 觸發策略把每生每節課壓到 5~10 次 Gemini 呼叫，30 人班級可穩定使用。

## 📄 License

MIT — 歡迎自由使用於教學，改作請註明出處。
