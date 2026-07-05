// AI 教練回饋代理：前端 → 這裡 → Gemini（API key 只存在 Netlify 環境變數）
const RATE = new Map(); // 每生節流（單一 instance 內存，夠用）
const WINDOW_MS = 60_000, MAX_PER_WINDOW = 3;

const SYSTEM = `你是高中物理探究課的 AI 教練，主題是「含空氣阻力的拋體運動」。
原則：
1. 用蘇格拉底式提問引導，不直接給答案（例如不要直接說最佳角度是幾度）。
2. 針對學生的「預測 vs 數據落差」和「證據是否支持主張」給回饋。
3. 若學生一次改多個變因，溫和指出控制變因（COV）的重要。
4. 繁體中文，2~4 句話，語氣友善具體，引用學生的試驗編號與數據。
5. 物理量與公式一律用 LaTeX 行內語法（例如 $v_0$、$\\theta$、$R = \\frac{v_0^2\\sin 2\\theta}{g}$），不要用純文字寫公式。`;

const TRIGGER_HINT = {
  cov_violation: '學生這次同時改了多個變因，請引導他想想這樣能否判斷因果。',
  milestone: '請根據累積數據給一個探究方向的提示（例如建議系統性掃描某變因）。',
  prediction_miss: '學生的預測與結果相反，請引導他反思背後的物理。',
  cer: '學生剛送出 CER 小結，請檢查：主張是否明確？勾選的證據數據是否真的支持主張？推理有沒有用到物理概念？',
  manual: '學生主動求助，請根據目前紀錄給最有用的一個提示。'
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: '尚未設定 GEMINI_API_KEY' });

  let body;
  try { body = JSON.parse(event.body); } catch { return json(400, { error: 'bad json' }); }
  const { trigger, summary, extra, user } = body;
  if (!summary || summary.length > 8000) return json(400, { error: 'bad summary' });

  // 每生節流
  const now = Date.now();
  const hits = (RATE.get(user) || []).filter(t => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return json(429, { error: 'AI 教練需要休息一下，請一分鐘後再試。' });
  hits.push(now); RATE.set(user, hits);

  const prompt = `${SYSTEM}\n\n【觸發情境】${TRIGGER_HINT[trigger] || TRIGGER_HINT.manual}\n${extra ? '【附加資訊】' + JSON.stringify(extra) : ''}\n\n【學生實驗紀錄摘要】\n${summary}\n\n請給回饋：`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } } }) });
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return json(502, { error: 'AI 回應異常：' + (data?.error?.message || JSON.stringify(data).slice(0, 200)) });
    return json(200, { feedback: text.trim() });
  } catch (e) {
    return json(502, { error: '無法連線 AI 服務。' });
  }
};

const json = (statusCode, obj) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(obj)
});
