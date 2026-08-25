export interface PendingExtractionTask {
  extractionId: string;
  cropImagePath: string;
}

export interface RetryableExtractionTask extends PendingExtractionTask {
  userId: string;
}

export function selectPendingExtractions(
  items: Array<Record<string, unknown>>,
): PendingExtractionTask[] {
  const unique = new Map<string, PendingExtractionTask>();
  for (const item of items) {
    const extractionId =
      typeof item.extraction_job_id === "string"
        ? item.extraction_job_id
        : null;
    const cropImagePath =
      typeof item.crop_image_path === "string" ? item.crop_image_path : null;
    const imagePath = typeof item.image_path === "string" ? item.image_path : null;
    if (extractionId && cropImagePath && !imagePath) {
      unique.set(extractionId, { extractionId, cropImagePath });
    }
  }
  return [...unique.values()];
}

export function selectLegacyQualityMismatchRetries(
  jobs: Array<Record<string, unknown>>,
): RetryableExtractionTask[] {
  const unique = new Map<string, RetryableExtractionTask>();
  for (const job of jobs) {
    const userId = typeof job.user_id === "string" ? job.user_id : null;
    const extractionId =
      typeof job.extraction_id === "string" ? job.extraction_id : null;
    const cropImagePath =
      typeof job.crop_image_path === "string" ? job.crop_image_path : null;
    const attempts = Number(job.attempts);
    const linkedItems = Array.isArray(job.ootd_items) ? job.ootd_items : [];
    if (
      userId &&
      extractionId &&
      cropImagePath &&
      job.status === "failed" &&
      job.error_code === "quality_mismatch" &&
      Number.isInteger(attempts) &&
      attempts > 0 &&
      attempts < 3 &&
      linkedItems.length > 0
    ) {
      unique.set(extractionId, { userId, extractionId, cropImagePath });
    }
  }
  return [...unique.values()];
}

export async function runWithConcurrency<T>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<void>,
): Promise<void> {
  const failures: unknown[] = [];
  let cursor = 0;
  const run = async () => {
    while (cursor < values.length) {
      const value = values[cursor++];
      try {
        await worker(value);
      } catch (error) {
        failures.push(error);
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, concurrency), values.length) }, run),
  );
  if (failures.length > 0) {
    throw new AggregateError(failures, `${failures.length}개 작업을 예약하지 못했습니다.`);
  }
}
