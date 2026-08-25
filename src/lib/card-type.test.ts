import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CARD_TYPE_OPTIONS,
  InvalidCardTypeError,
  normalizeCardType,
} from "./card-type";

describe("normalizeCardType", () => {
  it("누락·basic·ai를 정식 카드 타입으로 정규화한다", () => {
    assert.equal(normalizeCardType(undefined), "basic");
    assert.equal(normalizeCardType("basic"), "basic");
    assert.equal(normalizeCardType("ai"), "ai");
  });

  it("기존 style 요청을 ai로 호환한다", () => {
    assert.equal(normalizeCardType("style"), "ai");
  });

  it("알 수 없는 타입을 거절한다", () => {
    assert.throws(() => normalizeCardType("unknown"), InvalidCardTypeError);
    assert.throws(() => normalizeCardType(1), InvalidCardTypeError);
  });
});

describe("CARD_TYPE_OPTIONS", () => {
  it("기본과 하나의 AI 카드만 노출한다", () => {
    assert.deepEqual(
      CARD_TYPE_OPTIONS.map(({ type, label }) => ({ type, label })),
      [
        { type: "basic", label: "기본" },
        { type: "ai", label: "AI 카드" },
      ],
    );
  });
});
