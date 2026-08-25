import OpenAI from "openai";
import { parseAnalyzeResponse } from "@/lib/ootd-classification";
import { VISION_PROMPT, VISION_USER_PROMPT } from "@/lib/ai/vision-prompt";
import type { AnalyzeResponse } from "@/types/api";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function extractJson(text: string): string {
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  const jsonStart = text.indexOf("{");
  if (jsonStart !== -1) return text.slice(jsonStart);
  return text.trim();
}

export async function analyzeOotdImage(
  imageUrl: string,
): Promise<AnalyzeResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: VISION_PROMPT,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } },
            { type: "text", text: VISION_USER_PROMPT },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content ?? "";

    try {
      const parsed = JSON.parse(extractJson(text));

      if (parsed.error === "not_fashion") {
        throw Object.assign(new Error("not_fashion"), { code: "not_fashion" });
      }

      return parseAnalyzeResponse(parsed);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "not_fashion") throw err;
      lastError = new Error(e.message ?? "JSON 파싱 실패");
    }
  }

  throw lastError ?? new Error("분석 실패");
}
