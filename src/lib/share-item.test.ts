import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSharePollingDelay, toShareItemViewModel } from "./share-item";

describe("toShareItemViewModel", () => {
  it("제품명과 공개 cutout을 카드 표시 정보로 만든다", () => {
    const view = toShareItemViewModel({
      category: "shoes",
      color: " 흰색 ",
      style_description: "미니멀한 로우탑 스니커즈",
      brand: " Nike ",
      product_name: " Air Force 1 ",
      image_url: "https://example.test/cutout.png",
      crop_image_url: "https://example.test/private-crop.png",
    });

    assert.equal(view.name, "Air Force 1");
    assert.equal(view.categoryLabel, "신발");
    assert.equal(view.imageUrl, "https://example.test/cutout.png");
    assert.deepEqual(view.details, [
      { label: "카테고리", value: "신발" },
      { label: "색상", value: "흰색" },
      { label: "브랜드", value: "Nike" },
      { label: "제품명", value: "Air Force 1" },
      { label: "설명", value: "미니멀한 로우탑 스니커즈" },
    ]);
  });

  it("제품명이 없으면 설명과 카테고리 순서로 이름을 대체한다", () => {
    assert.equal(
      toShareItemViewModel({
        category: "top",
        color: null,
        style_description: " 캐주얼 후드티 ",
        brand: null,
        product_name: null,
        image_url: null,
        crop_image_url: null,
      }).name,
      "캐주얼 후드티",
    );
    assert.equal(
      toShareItemViewModel({
        category: "other",
        color: null,
        style_description: " ",
        brand: null,
        product_name: null,
        image_url: null,
        crop_image_url: null,
      }).name,
      "기타 아이템",
    );
  });

  it("공개 cutout이 없을 때 private crop을 이미지 fallback으로 노출하지 않는다", () => {
    const view = toShareItemViewModel({
      category: "hat",
      color: null,
      style_description: null,
      brand: null,
      product_name: "캡",
      image_url: null,
      crop_image_url: "https://example.test/private-crop.png",
    });

    assert.equal(view.imageUrl, null);
  });

  it("진행 중이거나 구 검증 실패를 재처리하는 동안 새 데이터를 요청한다", () => {
    const base = {
      category: "top" as const,
      color: null,
      style_description: null,
      brand: null,
      product_name: "티셔츠",
      image_url: null,
      crop_image_url: null,
    };

    assert.equal(
      toShareItemViewModel({ ...base, extraction_status: "processing" })
        .imagePending,
      true,
    );
    assert.equal(
      toShareItemViewModel({
        ...base,
        extraction_status: "failed",
        extraction_error_code: "quality_mismatch",
      }).imagePending,
      true,
    );
    assert.equal(
      toShareItemViewModel({
        ...base,
        extraction_status: "failed",
        extraction_error_code: "quality_mismatch_v2",
      }).imagePending,
      false,
    );
  });
});

describe("getSharePollingDelay", () => {
  it("지수형 간격으로 제한된 횟수만 공개 페이지를 갱신한다", () => {
    assert.deepEqual(
      [0, 1, 2, 3, 4, 5].map((attempt) =>
        getSharePollingDelay(attempt, false),
      ),
      [5_000, 10_000, 20_000, 30_000, 30_000, null],
    );
  });

  it("숨김 탭에서는 자동 갱신을 멈춘다", () => {
    assert.equal(getSharePollingDelay(0, true), null);
  });
});
