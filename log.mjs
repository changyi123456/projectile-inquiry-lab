// 儲存學生完整紀錄快照（last-write-wins）到 Netlify Blobs
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
  const { sessionId, user, events } = body || {};
  if (!sessionId || !user?.id || !Array.isArray(events)) return Response.json({ error: "bad payload" }, { status: 400 });
  if (JSON.stringify(body).length > 900_000) return Response.json({ error: "too large" }, { status: 413 });

  const store = getStore("lablogs");
  const safe = s => String(s).replace(/[^\w.@-]/g, "_").slice(0, 60);
  const key = `${safe(user.cls)}/${safe(user.id)}_${safe(sessionId)}`;
  await store.setJSON(key, body);
  return Response.json({ ok: true });
};
