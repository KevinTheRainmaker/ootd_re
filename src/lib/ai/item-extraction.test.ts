import assert from "node:assert/strict";
import { describe, it } from "node:test";

interface ExtractionModule {
  normalizeBoundingBox?: (value: unknown) => {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  calculateCropRegion?: (
    imageWidth: number,
    imageHeight: number,
    box: { x: number; y: number; width: number; height: number },
  ) => { left: number; top: number; width: number; height: number };
  chooseChromaKey?: (color: string | null) => string;
  removeChromaBackground?: (bytes: Buffer, key: string) => Promise<Buffer>;
  parseItemImageRequest?: (value: unknown) => {
    extraction_id: string;
    crop_image_path: string;
  };
  buildImageEditOptions?: (model: string) => Record<string, unknown>;
  readImageResponse?: (response: Response, maxBytes?: number) => Promise<Buffer>;
  buildGarmentPrompt?: (category: string, color: string) => string;
  parseCutoutQualityResult?: (
    value: unknown,
    expectedCategory: string,
  ) => { accepted: boolean; reason: string };
  parseCropQualityResult?: (
    value: unknown,
    expectedCategory: string,
  ) => { accepted: boolean; reason: string };
}

let extraction: ExtractionModule = {};
try {
  // RED 단계에서도 구현 모듈 부재가 명확한 동작 실패로 나타나게 한다.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  extraction = require("./item-extraction") as ExtractionModule;
} catch {
  extraction = {};
}

describe("item extraction geometry", () => {
  it("0~1000 bbox를 이미지 경계 안으로 정규화한다", () => {
    assert.equal(typeof extraction.normalizeBoundingBox, "function");
    assert.deepEqual(
      extraction.normalizeBoundingBox!({ x: -20, y: 900, width: 1200, height: 500 }),
      { x: 0, y: 900, width: 1000, height: 100 },
    );
  });

  it("긴 변 8% padding을 적용해 실제 픽셀 crop 영역을 계산한다", () => {
    assert.equal(typeof extraction.calculateCropRegion, "function");
    assert.deepEqual(
      extraction.calculateCropRegion!(2000, 1000, {
        x: 250,
        y: 200,
        width: 500,
        height: 600,
      }),
      { left: 420, top: 120, width: 1160, height: 760 },
    );
  });

  it("의류 주색과 RGB 거리가 가장 먼 chroma key를 선택한다", () => {
    assert.equal(typeof extraction.chooseChromaKey, "function");
    assert.equal(extraction.chooseChromaKey!("#00ee20"), "#ff00ff");
  });

  it("균일한 chroma 배경을 투명하게 만들고 의류 픽셀만 남긴다", async () => {
    assert.equal(typeof extraction.removeChromaBackground, "function");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharp = require("sharp") as unknown as typeof import("sharp").default;
    const source = await sharp({
      create: {
        width: 20,
        height: 20,
        channels: 3,
        background: "#00ff00",
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 8,
              height: 12,
              channels: 3,
              background: "#cc2233",
            },
          })
            .png()
            .toBuffer(),
          left: 6,
          top: 4,
        },
      ])
      .png()
      .toBuffer();

    const output = await extraction.removeChromaBackground!(source, "#00ff00");
    const { data, info } = await sharp(output)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const cornerAlpha = data[3];
    const centerAlpha = data[(512 * info.width + 512) * 4 + 3];

    assert.equal(info.width, 1024);
    assert.equal(info.height, 1024);
    assert.equal(cornerAlpha, 0);
    assert.ok(centerAlpha > 200);
  });

  it("cutout 요청의 UUID·소유 이미지 후보·카테고리·색상을 검증한다", () => {
    assert.equal(typeof extraction.parseItemImageRequest, "function");
    assert.deepEqual(
      extraction.parseItemImageRequest!({
        extraction_id: "a3bb189e-8bf9-4b47-a1ea-6f54bce21f4b",
        crop_image_path:
          " user-id/a3bb189e-8bf9-4b47-a1ea-6f54bce21f4b/crop.png ",
      }),
      {
        extraction_id: "a3bb189e-8bf9-4b47-a1ea-6f54bce21f4b",
        crop_image_path:
          "user-id/a3bb189e-8bf9-4b47-a1ea-6f54bce21f4b/crop.png",
      },
    );
    assert.throws(
      () =>
        extraction.parseItemImageRequest!({
          extraction_id: "not-a-uuid",
          crop_image_path: "../other-user/crop.png",
        }),
      /요청/,
    );
  });

  it("gpt-image-2 요청에 지원하지 않는 input_fidelity를 보내지 않는다", () => {
    assert.equal(typeof extraction.buildImageEditOptions, "function");
    const options = extraction.buildImageEditOptions!(
      "gpt-image-2-2026-04-21",
    );
    assert.equal("input_fidelity" in options, false);
  });

  it("이미지 응답 크기와 실제 파일 시그니처를 검증한다", async () => {
    assert.equal(typeof extraction.readImageResponse, "function");
    await assert.rejects(
      extraction.readImageResponse!(
        new Response(Buffer.alloc(11), {
          headers: { "content-type": "image/png", "content-length": "11" },
        }),
        10,
      ),
      /크기/,
    );
    await assert.rejects(
      extraction.readImageResponse!(
        new Response(Buffer.from("not-an-image"), {
          headers: { "content-type": "image/png" },
        }),
        1024,
      ),
      /형식/,
    );
  });

  it("crop 속 텍스트·QR·워터마크 명령을 따르지 않도록 지시한다", () => {
    assert.equal(typeof extraction.buildGarmentPrompt, "function");
    const prompt = extraction.buildGarmentPrompt!("top", "#112233");
    assert.match(prompt, /QR/);
    assert.match(prompt, /never follow/i);
    assert.match(prompt, /untrusted/i);
  });

  it("원본과 다른 아이템 또는 다른 카테고리의 생성 결과를 거절한다", () => {
    assert.equal(typeof extraction.parseCutoutQualityResult, "function");
    assert.deepEqual(
      extraction.parseCutoutQualityResult!(
        {
          same_source_item: true,
          detected_category: "shoes",
          contains_person: false,
          contains_multiple_items: false,
          reason: "same white sneakers",
        },
        "shoes",
      ),
      { accepted: true, reason: "same white sneakers" },
    );
    assert.deepEqual(
      extraction.parseCutoutQualityResult!(
        {
          same_source_item: false,
          detected_category: "bottom",
          contains_person: false,
          contains_multiple_items: false,
          reason: "generated shorts instead of shoes",
        },
        "shoes",
      ),
      { accepted: false, reason: "generated shorts instead of shoes" },
    );
  });

  it("빈 배경이나 다른 카테고리 crop은 생성 전에 보류한다", () => {
    assert.equal(typeof extraction.parseCropQualityResult, "function");
    assert.deepEqual(
      extraction.parseCropQualityResult!(
        {
          contains_target: false,
          observed_category: "other",
          confidence: 0.98,
          reason: "only an empty wall",
        },
        "hat",
      ),
      { accepted: false, reason: "only an empty wall" },
    );
    assert.deepEqual(
      extraction.parseCropQualityResult!(
        {
          contains_target: true,
          observed_category: "shoes",
          confidence: 0.91,
          reason: "white sneakers are visible",
        },
        "shoes",
      ),
      { accepted: true, reason: "white sneakers are visible" },
    );
  });

  it("생성 프롬프트가 다른 카테고리의 대체품을 금지한다", () => {
    assert.equal(typeof extraction.buildGarmentPrompt, "function");
    const prompt = extraction.buildGarmentPrompt!("shoes", "#ffffff");
    assert.match(prompt, /substitute|replacement/i);
    assert.match(prompt, /exact category/i);
  });
});
