import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OotdValidationError,
  assertOwnedStorageImageUrl,
  normalizeOotdItems,
  parseAnalyzeResponse,
  parseSaveOotdRequest,
} from "./ootd-classification";

const validItem = {
  category: "top",
  color: "  네이비  ",
  style_description: "  오버핏 셔츠  ",
  brand: "  Brand  ",
  product_name: "  Oxford  ",
  order_idx: 99,
};

describe("normalizeOotdItems", () => {
  it("문자열을 정리하고 요청의 order_idx 대신 배열 순서를 사용한다", () => {
    const result = normalizeOotdItems([
      validItem,
      { ...validItem, category: "bottom", order_idx: 42 },
    ]);

    assert.deepEqual(result, [
      {
        category: "top",
        color: "네이비",
        style_description: "오버핏 셔츠",
        brand: "Brand",
        product_name: "Oxford",
        order_idx: 0,
      },
      {
        category: "bottom",
        color: "네이비",
        style_description: "오버핏 셔츠",
        brand: "Brand",
        product_name: "Oxford",
        order_idx: 1,
      },
    ]);
  });

  it("허용되지 않은 카테고리와 8개 초과 입력을 거절한다", () => {
    assert.throws(
      () => normalizeOotdItems([{ ...validItem, category: "unknown" }]),
      OotdValidationError,
    );
    assert.throws(
      () => normalizeOotdItems(Array(9).fill(validItem)),
      /최대 8개/,
    );
  });
});

describe("parseAnalyzeResponse", () => {
  it("AI 분석 결과에도 동일한 정규화 규칙을 적용한다", () => {
    const result = parseAnalyzeResponse({
      items: [validItem],
      summary: "  미니멀 룩  ",
      hashtags: ["#미니멀", "#미니멀", "  #데일리  "],
    });

    assert.equal(result.summary, "미니멀 룩");
    assert.deepEqual(result.hashtags, ["#미니멀", "#데일리"]);
    assert.equal(result.items[0].order_idx, 0);
  });
});

describe("parseSaveOotdRequest", () => {
  const validRequest = {
    client_request_id: "a3bb189e-8bf9-4b47-a1ea-6f54bce21f4b",
    original_image_url: "https://example.com/original.png",
    card_image_url: "https://example.com/card.png",
    items: [validItem],
    style_summary: "데일리 룩",
    hashtags: ["#데일리"],
    is_public: false,
    date: "2026-08-21",
    mood: "calm",
  };

  it("저장 가능한 요청을 정규화한다", () => {
    const result = parseSaveOotdRequest(validRequest);

    assert.equal(result.client_request_id, validRequest.client_request_id);
    assert.equal(result.date, "2026-08-21");
    assert.equal(result.weatherSnapshot, null);
  });

  it("잘못된 URL, 날짜, UUID를 400 대상 오류로 분류한다", () => {
    assert.throws(
      () =>
        parseSaveOotdRequest({
          ...validRequest,
          card_image_url: "javascript:x",
        }),
      OotdValidationError,
    );
    assert.throws(
      () => parseSaveOotdRequest({ ...validRequest, date: "2026-02-30" }),
      OotdValidationError,
    );
    assert.throws(
      () =>
        parseSaveOotdRequest({
          ...validRequest,
          client_request_id: "retry-1",
        }),
      OotdValidationError,
    );
    assert.throws(
      () =>
      parseSaveOotdRequest({
        ...validRequest,
        client_request_id: undefined,
      }),
      /client_request_id/,
    );
  });
});

describe("assertOwnedStorageImageUrl", () => {
  const storageUrl = "https://project.supabase.co";
  const userId = "9af0ad10-cffc-4dfe-b02d-eaecf1a6fb2d";

  it("현재 사용자의 허용된 버킷 경로만 통과시킨다", () => {
    assert.doesNotThrow(() =>
      assertOwnedStorageImageUrl(
        `${storageUrl}/storage/v1/object/public/originals/${userId}/look.png`,
        userId,
        ["originals"],
        storageUrl,
      ),
    );

    assert.throws(
      () =>
        assertOwnedStorageImageUrl(
          `${storageUrl}/storage/v1/object/public/originals/other-user/look.png`,
          userId,
          ["originals"],
          storageUrl,
        ),
      OotdValidationError,
    );
    assert.throws(
      () =>
        assertOwnedStorageImageUrl(
          `https://tracker.example/pixel.png`,
          userId,
          ["originals", "cards"],
          storageUrl,
        ),
      OotdValidationError,
    );
  });
});
