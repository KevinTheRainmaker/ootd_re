import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  OotdValidationError,
  assertOwnedStorageImageUrl,
  assertOwnedItemImagePath,
  assertOwnedItemImagePair,
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
  image_path: "  user/item/cutout.png  ",
  crop_image_path: "  user/item/crop.png  ",
  bounding_box: { x: -20, y: 900, width: 1200, height: 500 },
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
        extraction_job_id: null,
        image_path: "user/item/cutout.png",
        crop_image_path: "user/item/crop.png",
        bounding_box: { x: 0, y: 900, width: 1000, height: 100 },
        order_idx: 0,
      },
      {
        category: "bottom",
        color: "네이비",
        style_description: "오버핏 셔츠",
        brand: "Brand",
        product_name: "Oxford",
        extraction_job_id: null,
        image_path: "user/item/cutout.png",
        crop_image_path: "user/item/crop.png",
        bounding_box: { x: 0, y: 900, width: 1000, height: 100 },
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
    const analyzedItem = result.items[0] as unknown as {
      bounding_box?: { x: number; y: number; width: number; height: number };
    };
    assert.deepEqual(analyzedItem.bounding_box, {
      x: 0,
      y: 900,
      width: 1000,
      height: 100,
    });
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

describe("assertOwnedItemImagePath", () => {
  const userId = "9af0ad10-cffc-4dfe-b02d-eaecf1a6fb2d";
  const extractionId = "a3bb189e-8bf9-4b47-a1ea-6f54bce21f4b";

  it("사용자와 extraction ID에 정확히 결합된 item 경로만 허용한다", () => {
    assert.doesNotThrow(() =>
      assertOwnedItemImagePath(
        `${userId}/${extractionId}/crop.png`,
        userId,
        extractionId,
        "crop",
      ),
    );
    assert.throws(
      () =>
        assertOwnedItemImagePath(
          `other/${extractionId}/crop.png`,
          userId,
          extractionId,
          "crop",
        ),
      OotdValidationError,
    );
    assert.throws(
      () =>
        assertOwnedItemImagePath(
          `${userId}/../${extractionId}/crop.png`,
          userId,
          extractionId,
          "crop",
        ),
      OotdValidationError,
    );
  });
});

describe("assertOwnedItemImagePair", () => {
  const userId = "9af0ad10-cffc-4dfe-b02d-eaecf1a6fb2d";
  const extractionId = "a3bb189e-8bf9-4b47-a1ea-6f54bce21f4b";
  const claimId = "24e2852d-a0ca-4a22-bb7f-b50f8fad7e70";

  it("수동 아이템은 이미지가 모두 없을 때 허용한다", () => {
    assert.doesNotThrow(() =>
      assertOwnedItemImagePair(null, null, null, userId),
    );
  });

  it("같은 완료 작업의 crop과 claim별 cutout만 허용한다", () => {
    assert.doesNotThrow(() =>
      assertOwnedItemImagePair(
        extractionId,
        `${userId}/${extractionId}/claims/${claimId}/cutout.png`,
        `${userId}/${extractionId}/crop.png`,
        userId,
      ),
    );
    assert.throws(
      () =>
        assertOwnedItemImagePair(
          extractionId,
          `${userId}/00000000-0000-4000-8000-000000000000/claims/${claimId}/cutout.png`,
          `${userId}/${extractionId}/crop.png`,
          userId,
        ),
      OotdValidationError,
    );
  });

  it("백그라운드 처리 전에는 작업 ID와 crop만 저장할 수 있다", () => {
    assert.doesNotThrow(() =>
      assertOwnedItemImagePair(
        extractionId,
        null,
        `${userId}/${extractionId}/crop.png`,
        userId,
      ),
    );
  });
});
