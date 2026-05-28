import OpenAI from "openai";
import type { AnalyzeResponse } from "@/types/api";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PROMPT = `이 패션 사진을 분석하여 다음 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "items": [
    {
      "category": "top" | "bottom" | "outer" | "shoes" | "bag" | "accessory" | "hat" | "glasses" | "watch" | "other",
      "color": "색상 설명",
      "style_description": "스타일 설명 (한국어, 20자 이내)",
      "brand": null,
      "order_idx": 0,
      "product_name": null
    }
  ],
  "summary": "전체 스타일 요약 (한국어, 50자 이내)",
  "hashtags": ["#해시태그1", "#해시태그2", "#해시태그3", "#해시태그4", "#해시태그5"]
}

사람이 없거나 패션 사진이 아니면 {"error": "not_fashion"} 을 반환하세요.`;

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
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } },
            { type: "text", text: PROMPT },
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

      return parsed as AnalyzeResponse;
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === "not_fashion") throw err;
      lastError = new Error(e.message ?? "JSON 파싱 실패");
    }
  }

  throw lastError ?? new Error("분석 실패");
}
