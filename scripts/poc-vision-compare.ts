/**
 * PoC: Claude Vision vs GPT-4o Vision 패션 분석 비교
 *
 * 목적: 패션 아이템 분석 structured output 품질 비교
 *
 * 실행 방법:
 *   OPENAI_API_KEY=sk-xxx ANTHROPIC_API_KEY=sk-ant-xxx npx ts-node --esm scripts/poc-vision-compare.ts
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const FASHION_ANALYSIS_PROMPT = `
이 패션 사진을 분석하여 다음 JSON 형식으로 응답하세요:

{
  "items": [
    {
      "category": "top" | "bottom" | "outer" | "shoes" | "bag" | "accessory" | "hat" | "glasses" | "watch" | "other",
      "color": "색상 설명",
      "style_description": "스타일 설명 (한국어, 20자 이내)",
      "brand": "브랜드명 (알 수 없으면 null)",
      "order_idx": 0
    }
  ],
  "summary": "전체 스타일 요약 (한국어, 50자 이내)",
  "hashtags": ["#해시태그1", "#해시태그2", "#해시태그3", "#해시태그4", "#해시태그5"]
}

JSON만 응답하세요. 사람이 없거나 패션 사진이 아니면 {"error": "not_fashion"} 을 반환하세요.
`;

const TEST_IMAGE_URL =
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800";

async function testClaudeVision(imageUrl: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("[Claude] API 키 없음 — 프롬프트 구조만 확인");
    printClaudePromptSpec();
    return null;
  }

  const client = new Anthropic({ apiKey });
  const startTime = Date.now();

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "url",
                url: imageUrl,
              },
            },
            {
              type: "text",
              text: FASHION_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
    });

    const elapsed = Date.now() - startTime;
    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    console.log(`[Claude] 응답 시간: ${elapsed}ms`);
    console.log(`[Claude] 입력 토큰: ${response.usage.input_tokens}`);
    console.log(`[Claude] 출력 토큰: ${response.usage.output_tokens}`);

    try {
      const parsed = JSON.parse(text.trim());
      console.log("[Claude] 파싱 성공:", JSON.stringify(parsed, null, 2));
      return parsed;
    } catch {
      console.log("[Claude] 원본 응답:", text);
      return null;
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[Claude] 오류:", error.message);
    return null;
  }
}

async function testGpt4oVision(imageUrl: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[GPT-4o] API 키 없음 — 프롬프트 구조만 확인");
    printGptPromptSpec();
    return null;
  }

  const client = new OpenAI({ apiKey });
  const startTime = Date.now();

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
            {
              type: "text",
              text: FASHION_ANALYSIS_PROMPT,
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const elapsed = Date.now() - startTime;
    const text = response.choices[0].message.content ?? "";

    console.log(`[GPT-4o] 응답 시간: ${elapsed}ms`);
    console.log(`[GPT-4o] 입력 토큰: ${response.usage?.prompt_tokens}`);
    console.log(`[GPT-4o] 출력 토큰: ${response.usage?.completion_tokens}`);

    try {
      const parsed = JSON.parse(text);
      console.log("[GPT-4o] 파싱 성공:", JSON.stringify(parsed, null, 2));
      return parsed;
    } catch {
      console.log("[GPT-4o] 원본 응답:", text);
      return null;
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[GPT-4o] 오류:", error.message);
    return null;
  }
}

function printClaudePromptSpec() {
  console.log(`
[Claude Vision 프롬프트 구조]
- model: claude-sonnet-4-6
- image source: { type: "url", url: string } — URL 직접 지원
- 또는 { type: "base64", media_type: "image/jpeg", data: string }
- structured output: JSON 텍스트 파싱 (JSON 모드 없음, 프롬프트로 유도)
- 장점: URL 직접 지원, 한국어 품질 우수, 맥락 이해 뛰어남
- 단점: JSON 모드 없어 파싱 오류 가능성 존재
`);
}

function printGptPromptSpec() {
  console.log(`
[GPT-4o Vision 프롬프트 구조]
- model: gpt-4o
- image source: { type: "image_url", image_url: { url: string, detail: "high" } }
- structured output: response_format: { type: "json_object" } 지원 — 안정적
- 장점: JSON 모드 공식 지원, 파싱 신뢰도 높음
- 단점: URL 이미지 캐싱 제한, 한국어 품질 Claude 대비 약간 낮을 수 있음
`);
}

async function main() {
  console.log("=== Vision 모델 패션 분석 비교 PoC ===\n");
  console.log(`테스트 이미지: ${TEST_IMAGE_URL}\n`);

  console.log("--- Claude Sonnet 4.6 ---");
  await testClaudeVision(TEST_IMAGE_URL);

  console.log("\n--- GPT-4o ---");
  await testGpt4oVision(TEST_IMAGE_URL);

  console.log(`
=== 프롬프트 스펙 요약 ===
`);
  printClaudePromptSpec();
  printGptPromptSpec();

  console.log(`
=== Vision 모델 선택 권고 ===
추천: Claude Sonnet 4.6 (claude-sonnet-4-6)

이유:
1. URL 이미지 직접 지원 — Supabase Storage URL을 바로 넣을 수 있음
2. 한국어 패션 용어 및 스타일 묘사 품질 우수
3. 맥락 이해 및 브랜드 인식 능력 우수
4. 비용: 입력 $3/MTok (캐시 없음), gpt-4o와 유사한 수준

단점 대응:
- JSON 모드 없음 → 프롬프트에 "JSON만 응답" 명시 + try/catch 파싱으로 대응
- 파싱 실패 시 재시도 로직 추가 (S8 analyze API에서 구현)
`);
}

main().catch(console.error);
