# Sprint 0 PoC 결과

## 1. gpt-image-1 이미지 INPUT 지원 여부

### 결론: ✓ 지원됨 (Plan A GO)

openai 패키지 타입 정의 (`node_modules/openai/resources/images.d.ts`) 분석:

```
"Creates an edited or extended image given one or more source images and a prompt.
This endpoint supports GPT Image models (gpt-image-1.5, gpt-image-1, gpt-image-1-mini,
and chatgpt-image-latest) and dall-e-2."
```

- **엔드포인트**: `client.images.edit()`
- **image 파라미터**: `Uploadable | Array<Uploadable>` — 파일 스트림 (png/webp/jpg, 최대 50MB, 최대 16장)
- **URL 직접 입력**: 미지원 → 서버에서 fetch 후 Buffer로 변환 필요
- **응답 형식**: 항상 `b64_json` (GPT 이미지 모델은 url 미지원)
- **크기**: `1024x1024`, `1024x1536`(세로), `1536x1024`(가로), `auto`
- **input_fidelity**: `'high' | 'low'` — 원본 사진 특징 보존 수준 (gpt-image-1 전용)

### 구현 패턴 (S10 카드 생성 API에서 사용):

```typescript
// 1. Supabase Storage URL에서 이미지 fetch
const res = await fetch(original_image_url);
const buffer = Buffer.from(await res.arrayBuffer());
const imageFile = await toFile(buffer, "fashion.jpg", { type: "image/jpeg" });

// 2. gpt-image-1 edit 호출
const response = await openai.images.edit({
  model: "gpt-image-1",
  image: imageFile,
  prompt: "손글씨 주석 프롬프트...",
  size: "1024x1536",
  quality: "medium",
  input_fidelity: "high",
});

// 3. base64 → Buffer → Supabase Storage 업로드
const cardBuffer = Buffer.from(response.data[0].b64_json, "base64");
```

---

## 2. Vision 모델 선택

### 결론: Claude Sonnet 4.6 (`claude-sonnet-4-6`) 선택

| 항목           | Claude Sonnet 4.6    | GPT-4o    |
| -------------- | -------------------- | --------- |
| URL 직접 지원  | ✓                    | ✓         |
| 한국어 품질    | 우수                 | 양호      |
| JSON 모드      | 없음 (프롬프트 유도) | 공식 지원 |
| 패션 맥락 이해 | 매우 우수            | 우수      |
| 비용 (입력)    | $3/MTok              | $2.5/MTok |

**선택 이유:**

1. 한국어 패션 용어 및 스타일 묘사 품질이 더 우수
2. Supabase Storage URL을 `{ type: "url", url: string }` 형식으로 직접 지원
3. 맥락 이해 및 아이템 구분 능력이 더 뛰어남
4. JSON 모드 없는 단점 → 프롬프트 설계 + try/catch + 재시도로 대응 가능

**JSON 파싱 전략 (S8 analyze API):**

- 프롬프트에 "JSON만 응답" 명시
- 응답 텍스트에서 `json ... ` 블록 추출 시도
- 실패 시 1회 재시도
- 재시도 실패 시 500 에러 반환

---

## 3. Sprint 0 Go/No-Go 체크리스트

- [x] gpt-image-1 API: 사진 입력 + 손글씨 주석 가능 여부 → **GO**
- [x] Vision 모델: Claude vs GPT-4o 선택 → **Claude Sonnet 4.6**

## 4. 다음 단계 (S8, S10)

### S8 (AI 분석 API):

- Vision 모델: `claude-sonnet-4-6`
- `src/lib/ai/vision.ts`: Claude Vision 추상화 레이어
- 에러 처리: 사람 미인식 시 400, JSON 파싱 실패 시 재시도

### S10 (카드 생성 API):

- **Plan A** (기본): `gpt-image-1` edit API — 원본 사진에 손글씨 주석 추가
- **Plan B** (fallback): `@vercel/og` (satori) — SVG 레이아웃 렌더링
- URL 이미지 → Buffer 변환 패턴 사용
- 실패 시 자동으로 Plan B fallback
