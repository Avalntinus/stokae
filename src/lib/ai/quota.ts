import { db } from "@/lib/db";

export async function assertAiQuota(feature: string) {
  const limit = Math.max(1, Number(process.env.AI_DAILY_LIMIT ?? 30));
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await db.aiUsageLog.count({ where: { feature, createdAt: { gte: since } } });
  if (used >= limit) throw new Error("AI_QUOTA");
}
