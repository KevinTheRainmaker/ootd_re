import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toShareItemViewModel } from "./share-item";

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
});
