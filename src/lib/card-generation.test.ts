import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CARD_GENERATION_BODY_LIMIT,
  CardGenerationRequestError,
  createCardGenerationFingerprint,
  normalizeCardGenerationRequestId,
  parseCardGenerationRequest,
  readLimitedJsonBody,
} from "./card-generation";

const REQUEST_ID = "123e4567-e89b-42d3-a456-426614174000";

describe("normalizeCardGenerationRequestId", () => {
  it("클라이언트 요청 ID를 정규화하고 누락 시 서버 ID를 사용한다", () => {
    assert.equal(
      normalizeCardGenerationRequestId(REQUEST_ID.toUpperCase(), () => "fallback"),
      REQUEST_ID,
    );
    assert.equal(
      normalizeCardGenerationRequestId(undefined, () => REQUEST_ID),
      REQUEST_ID,
    );
  });

  it("UUID가 아닌 요청 ID를 거절한다", () => {
    assert.throws(
      () => normalizeCardGenerationRequestId("not-a-uuid", () => REQUEST_ID),
      CardGenerationRequestError,
    );
  });
});

describe("createCardGenerationFingerprint", () => {
  const payload = {
    original_image_url:
      "https://project.supabase.co/storage/v1/object/public/originals/user/photo.jpg",
    items: [
      {
        category: "top" as const,
        color: "black",
        style_description: null,
        brand: null,
        product_name: null,
        extraction_job_id: null,
        image_path: null,
        crop_image_path: null,
        bounding_box: null,
        order_idx: 0,
        image_url: null,
        crop_image_url: null,
        color_hex: null,
        extraction_id: null,
      },
    ],
    summary: "검정 후디 룩",
    hashtags: ["#casual"],
  };

  it("같은 AI 카드 요청에 안정적인 SHA-256 fingerprint를 만든다", () => {
    const first = createCardGenerationFingerprint(payload);
    const second = createCardGenerationFingerprint({ ...payload });
    assert.match(first, /^[0-9a-f]{64}$/);
    assert.equal(first, second);
  });

  it("원본이나 분석 내용이 달라지면 fingerprint도 달라진다", () => {
    const original = createCardGenerationFingerprint(payload);
    assert.notEqual(
      original,
      createCardGenerationFingerprint({ ...payload, summary: "다른 요약" }),
    );
  });
});

describe("parseCardGenerationRequest", () => {
  const validBody = {
    request_id: REQUEST_ID,
    card_type: "ai",
    ootd_data: {
      original_image_url:
        "https://project.supabase.co/storage/v1/object/public/originals/user/photo.jpg",
      items: [
        {
          category: "top",
          color: " black ",
          style_description: " hoodie ",
          brand: null,
          product_name: null,
        },
      ],
      summary: " 검정 후디 룩 ",
      hashtags: [" #casual ", "#casual"],
    },
  };

  it("AI 카드 입력을 제한된 canonical payload로 정규화한다", () => {
    const parsed = parseCardGenerationRequest(validBody);
    assert.equal(parsed.ootd_data.summary, "검정 후디 룩");
    assert.deepEqual(parsed.ootd_data.hashtags, ["#casual"]);
    assert.equal(parsed.ootd_data.items[0]?.color, "black");
    assert.equal(parsed.ootd_data.items[0]?.order_idx, 0);
  });

  it("과도한 아이템·문자열과 잘못된 카테고리를 거절한다", () => {
    assert.throws(
      () =>
        parseCardGenerationRequest({
          ...validBody,
          ootd_data: {
            ...validBody.ootd_data,
            summary: "x".repeat(501),
          },
        }),
      CardGenerationRequestError,
    );
    assert.throws(
      () =>
        parseCardGenerationRequest({
          ...validBody,
          ootd_data: {
            ...validBody.ootd_data,
            items: [{ category: "spaceship" }],
          },
        }),
      CardGenerationRequestError,
    );
  });
});

describe("readLimitedJsonBody", () => {
  it("content-length가 없어도 streaming body 상한을 강제한다", async () => {
    const oversized = JSON.stringify({ value: "x".repeat(CARD_GENERATION_BODY_LIMIT) });
    const request = new Request("https://example.test", {
      method: "POST",
      body: oversized,
    });
    request.headers.delete("content-length");

    await assert.rejects(
      () => readLimitedJsonBody(request),
      CardGenerationRequestError,
    );
  });
});
