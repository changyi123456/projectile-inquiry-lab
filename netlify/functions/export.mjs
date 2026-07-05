// 教師後台：列出全部學生紀錄（需 ADMIN_KEY）
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const store = getStore("lablogs");
  const { blobs } = await store.list();
  const sessions = [];
  for (const b of blobs) {
    const data = await store.get(b.key, { type: "json" });
    if (data) sessions.push({ key: b.key, ...data });
  }
  return Response.json({ count: sessions.length, sessions });
};
