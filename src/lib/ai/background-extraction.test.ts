import assert from "node:assert/strict";
import { describe, it } from "node:test";

interface BackgroundModule {
  selectPendingExtractions?: (
    items: Array<Record<string, unknown>>,
  ) => Array<{ extractionId: string; cropImagePath: string }>;
  runWithConcurrency?: <T>(
    values: T[],
    concurrency: number,
    worker: (value: T) => Promise<void>,
  ) => Promise<void>;
  selectLegacyQualityMismatchRetries?: (
    jobs: Array<Record<string, unknown>>,
  ) => Array<{
    userId: string;
    extractionId: string;
    cropImagePath: string;
  }>;
}

let background: BackgroundModule = {};
try {
  // RED 단계에서도 모듈 부재가 명확한 실패로 나타나게 한다.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  background = require("./background-extraction") as BackgroundModule;
} catch {
  background = {};
}

describe("background item extraction", () => {
  it("저장된 crop이 있고 cutout이 없는 작업만 선택한다", () => {
    assert.equal(typeof background.selectPendingExtractions, "function");
    assert.deepEqual(
      background.selectPendingExtractions!([
        {
          extraction_job_id: "job-1",
          crop_image_path: "user/job-1/crop.png",
          image_path: null,
        },
        {
          extraction_job_id: "job-2",
          crop_image_path: "user/job-2/crop.png",
          image_path: "user/job-2/claims/token/cutout.png",
        },
        { extraction_job_id: null, crop_image_path: null, image_path: null },
      ]),
      [{ extractionId: "job-1", cropImagePath: "user/job-1/crop.png" }],
    );
  });

  it("한 작업 실패가 나머지 백그라운드 작업을 중단시키지 않는다", async () => {
    assert.equal(typeof background.runWithConcurrency, "function");
    const visited: number[] = [];
    await assert.rejects(
      background.runWithConcurrency!([1, 2, 3], 2, async (value) => {
        visited.push(value);
        if (value === 2) throw new Error("expected failure");
      }),
      /1개 작업/,
    );
    assert.deepEqual([...visited].sort(), [1, 2, 3]);
  });

  it("구 검증기의 false-negative 작업만 한 번 재전송한다", () => {
    assert.equal(
      typeof background.selectLegacyQualityMismatchRetries,
      "function",
    );
    assert.deepEqual(
      background.selectLegacyQualityMismatchRetries!([
        {
          user_id: "user-1",
          extraction_id: "job-1",
          crop_image_path: "user-1/job-1/crop.png",
          status: "failed",
          attempts: 1,
          error_code: "quality_mismatch",
          ootd_items: [{ id: "item-1" }],
        },
        {
          user_id: "user-1",
          extraction_id: "job-v2",
          crop_image_path: "user-1/job-v2/crop.png",
          status: "failed",
          attempts: 1,
          error_code: "quality_mismatch_v2",
          ootd_items: [{ id: "item-2" }],
        },
        {
          user_id: "user-1",
          extraction_id: "job-unlinked",
          crop_image_path: "user-1/job-unlinked/crop.png",
          status: "failed",
          attempts: 1,
          error_code: "quality_mismatch",
          ootd_items: [],
        },
      ]),
      [
        {
          userId: "user-1",
          extractionId: "job-1",
          cropImagePath: "user-1/job-1/crop.png",
        },
      ],
    );
  });
});
