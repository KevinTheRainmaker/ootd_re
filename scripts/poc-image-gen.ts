/**
 * PoC: gpt-image-1 이미지 편집 API 테스트
 *
 * 목적: 패션 사진 URL + 손글씨 주석 프롬프트 → 결과 이미지 생성 가능 여부 확인
 *
 * API 타입 분석 결과 (openai 패키지 v4 기준):
 * - client.images.edit() 는 gpt-image-1을 지원함 (images.d.ts:25 참조)
 * - image 파라미터: Uploadable | Array<Uploadable> (파일 스트림, 최대 50MB, png/webp/jpg)
 * - URL 직접 입력은 미지원 → 이미지를 fetch 후 Buffer로 변환 필요
 * - 응답: b64_json (GPT 이미지 모델은 항상 base64, url 미지원)
 *
 * 실행 방법:
 *   OPENAI_API_KEY=sk-xxx npx ts-node --esm scripts/poc-image-gen.ts
 */

import OpenAI, { toFile } from "openai";
import * as fs from "fs";
import * as path from "path";

async function fetchImageAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`이미지 fetch 실패: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function testGptImage1Edit() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[SKIP] OPENAI_API_KEY 미설정 — 타입 분석 결과만 출력합니다.");
    printApiAnalysis();
    return;
  }

  const client = new OpenAI({ apiKey });

  // 테스트용 공개 패션 이미지 (Unsplash)
  const testImageUrl =
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1024";

  console.log("이미지 다운로드 중...");
  const imageBuffer = await fetchImageAsBuffer(testImageUrl);
  const imageFile = await toFile(imageBuffer, "fashion.jpg", {
    type: "image/jpeg",
  });

  const prompt = `
    이 패션 사진 위에 손글씨 스타일의 텍스트 주석을 추가해주세요:
    - 상단에 오늘의 OOTD 라고 손글씨로 써주세요
    - 각 아이템(상의, 하의, 신발) 옆에 손글씨로 짧은 설명을 추가해주세요
    - 전체적으로 일기장 느낌의 손글씨 카드 스타일로 만들어주세요
  `;

  console.log("gpt-image-1 edit API 호출 중...");
  try {
    const response = await client.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt,
      size: "1024x1536",
      quality: "medium",
    });

    if (response.data?.[0]?.b64_json) {
      const outputPath = path.join(
        process.cwd(),
        "scripts",
        "poc-output-card.png",
      );
      fs.writeFileSync(
        outputPath,
        Buffer.from(response.data[0].b64_json, "base64"),
      );
      console.log(`✓ 카드 생성 성공: ${outputPath}`);
      console.log(`  사용 토큰: ${JSON.stringify(response.usage)}`);
    } else {
      console.log("응답에 이미지 데이터 없음:", response);
    }
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string; code?: string };
    console.error("API 오류:", error.status, error.message, error.code);
  }
}

function printApiAnalysis() {
  console.log(`
=== gpt-image-1 API 타입 분석 결과 ===

1. 이미지 INPUT 지원 여부: ✓ 지원됨
   - endpoint: client.images.edit()
   - 근거: images.d.ts 주석 "Creates an edited or extended image given one or more source images and a prompt"
   - 지원 모델: gpt-image-1, gpt-image-1-mini, gpt-image-1.5, gpt-image-2, chatgpt-image-latest

2. image 파라미터 타입:
   - Uploadable | Array<Uploadable> (파일 스트림)
   - png/webp/jpg, 최대 50MB, 최대 16장
   - URL 직접 입력 불가 → fetch 후 Buffer 변환 필요

3. 응답 형식:
   - GPT 이미지 모델: 항상 b64_json (url 미지원)
   - 크기: 1024x1024, 1024x1536(세로), 1536x1024(가로), auto

4. 주요 파라미터:
   - input_fidelity: 'high' | 'low' — 원본 사진 특징 보존 수준 (gpt-image-1 지원)
   - quality: 'low' | 'medium' | 'high' | 'auto'
   - background: 'transparent' | 'opaque' | 'auto'

5. 비용 추정 (medium quality, 1024x1536):
   - 대략 input ~1000 tokens + output ~1500 tokens
   - 추후 실제 usage 확인 필요

=== Plan A Go/No-Go ===
✓ GO — gpt-image-1 API는 이미지 입력을 완전히 지원함
  단, URL 직접 입력 불가하므로 이미지를 서버에서 fetch 후 Buffer로 변환하는 과정 필요.
  S10(카드 생성 API)에서 Plan A 구현 시 이 패턴을 사용할 것.
`);
}

testGptImage1Edit().catch(console.error);
