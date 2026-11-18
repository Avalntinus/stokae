export type AiResult = { text: string; inputTokens?: number; outputTokens?: number };

export async function generateText(prompt: string): Promise<AiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;
  if (!apiKey || !model) throw new Error("AI_NOT_CONFIGURED");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(response.status === 429 ? "AI_QUOTA" : "AI_PROVIDER");
  const data = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return { text: data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "" };
}
