import { ITEM_CATEGORIES, MOODS } from "../types";
import type { Mood, WeatherSnapshot } from "../types";
import type { AnalyzeResponse, OotdItemInput, SaveOotdRequest } from "../types/api";
import { normalizeBoundingBox } from "./ai/item-extraction";

const MAX_ITEMS = 8;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UnknownRecord = Record<string, unknown>;

export class OotdValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OotdValidationError";
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRequiredString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new OotdValidationError(`${field}이(가) 필요합니다.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new OotdValidationError(
      `${field}은(는) ${maxLength}자 이하여야 합니다.`,
    );
  }
  return normalized;
}

function normalizeOptionalString(
  value: unknown,
  field: string,
  maxLength: number,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new OotdValidationError(`${field}은(는) 문자열이어야 합니다.`);
  }
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new OotdValidationError(
      `${field}은(는) ${maxLength}자 이하여야 합니다.`,
    );
  }
  return normalized;
}

function normalizeOptionalUuid(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === "") return null;
  const normalized = normalizeRequiredString(value, field, 36);
  if (!UUID_PATTERN.test(normalized)) {
    throw new OotdValidationError(`${field}가 올바른 UUID가 아닙니다.`);
  }
  return normalized.toLowerCase();
}

function normalizeImageUrl(value: unknown, field: string): string {
  const url = normalizeRequiredString(value, field, 2048);
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new OotdValidationError(`${field}은(는) 올바른 이미지 URL이어야 합니다.`);
  }
  return url;
}

function normalizeOptionalItemPath(
  value: unknown,
  field: string,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  const path = normalizeRequiredString(value, field, 512);
  if (
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new OotdValidationError(`${field} 경로가 올바르지 않습니다.`);
  }
  return path;
}

function normalizeDate(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return new Date().toISOString().slice(0, 10);
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new OotdValidationError("date는 YYYY-MM-DD 형식이어야 합니다.");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new OotdValidationError("date가 올바른 날짜가 아닙니다.");
  }
  return value;
}

function normalizeHashtags(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new OotdValidationError("hashtags는 배열이어야 합니다.");
  }

  const unique = new Set<string>();
  for (const tag of value) {
    if (typeof tag !== "string") {
      throw new OotdValidationError("hashtag는 문자열이어야 합니다.");
    }
    const normalized = tag.trim().slice(0, 40);
    if (normalized) unique.add(normalized);
    if (unique.size === 12) break;
  }
  return [...unique];
}

function normalizeWeather(value: unknown): WeatherSnapshot | null {
  if (value === undefined || value === null) return null;
  if (!isRecord(value)) {
    throw new OotdValidationError("weatherSnapshot 형식이 올바르지 않습니다.");
  }

  const temp = Number(value.temp);
  const humidity = Number(value.humidity);
  if (!Number.isFinite(temp) || !Number.isFinite(humidity)) {
    throw new OotdValidationError("날씨의 온도와 습도는 숫자여야 합니다.");
  }

  return {
    temp,
    humidity,
    condition: normalizeRequiredString(value.condition, "condition", 80),
    description: normalizeRequiredString(
      value.description,
      "description",
      200,
    ),
  };
}

export function normalizeOotdItems(
  value: unknown,
): OotdItemInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new OotdValidationError("저장할 옷 분류가 하나 이상 필요합니다.");
  }
  if (value.length > MAX_ITEMS) {
    throw new OotdValidationError(`옷 분류는 최대 ${MAX_ITEMS}개까지 저장할 수 있습니다.`);
  }

  return value.map((rawItem, index) => {
    if (!isRecord(rawItem)) {
      throw new OotdValidationError(`${index + 1}번째 옷 분류 형식이 올바르지 않습니다.`);
    }
    if (
      typeof rawItem.category !== "string" ||
      !(ITEM_CATEGORIES as readonly string[]).includes(rawItem.category)
    ) {
      throw new OotdValidationError(`${index + 1}번째 옷의 카테고리가 올바르지 않습니다.`);
    }

    return {
      category: rawItem.category as AnalyzeResponse["items"][number]["category"],
      color: normalizeOptionalString(rawItem.color, "color", 40),
      style_description: normalizeOptionalString(
        rawItem.style_description,
        "style_description",
        200,
      ),
      brand: normalizeOptionalString(rawItem.brand, "brand", 120),
      product_name: normalizeOptionalString(
        rawItem.product_name,
        "product_name",
        120,
      ),
      extraction_job_id: normalizeOptionalUuid(
        rawItem.extraction_job_id ?? rawItem.extraction_id,
        "extraction_job_id",
      ),
      image_path: normalizeOptionalItemPath(rawItem.image_path, "image_path"),
      crop_image_path: normalizeOptionalItemPath(
        rawItem.crop_image_path,
        "crop_image_path",
      ),
      bounding_box: isRecord(rawItem.bounding_box)
        ? normalizeBoundingBox(rawItem.bounding_box)
        : null,
      order_idx: index,
    };
  });
}

export function parseAnalyzeResponse(value: unknown): AnalyzeResponse {
  if (!isRecord(value)) {
    throw new OotdValidationError("분석 결과 형식이 올바르지 않습니다.");
  }
  const items = normalizeOotdItems(value.items);
  const rawItems = value.items as unknown[];
  return {
    items: items.map((item, index) => {
      const raw = rawItems[index];
      if (!isRecord(raw) || !isRecord(raw.bounding_box)) {
        throw new OotdValidationError(
          `${index + 1}번째 옷의 bounding_box가 필요합니다.`,
        );
      }
      const colorHex =
        typeof raw.color_hex === "string" &&
        /^#[0-9a-f]{6}$/i.test(raw.color_hex)
          ? raw.color_hex.toLowerCase()
          : null;
      return {
        ...item,
        image_url: null,
        crop_image_url: null,
        bounding_box: normalizeBoundingBox(raw.bounding_box),
        color_hex: colorHex,
        extraction_id: null,
      };
    }),
    summary: normalizeRequiredString(value.summary, "summary", 500),
    hashtags: normalizeHashtags(value.hashtags),
  };
}

export function assertOwnedItemImagePath(
  value: string,
  userId: string,
  extractionId: string,
  kind: "crop" | "cutout",
): void {
  const expected = `${userId}/${extractionId}/${kind}.png`;
  if (value !== expected) {
    throw new OotdValidationError(
      "현재 사용자의 아이템 이미지 경로만 사용할 수 있습니다.",
    );
  }
}

export function assertOwnedItemImagePair(
  extractionJobId: string | null,
  imagePath: string | null,
  cropImagePath: string | null,
  userId: string,
): void {
  if (!extractionJobId && !imagePath && !cropImagePath) return;
  if (!extractionJobId || !imagePath || !cropImagePath) {
    throw new OotdValidationError(
      "아이템의 추출 작업, crop, cutout 이미지가 모두 필요합니다.",
    );
  }
  if (!UUID_PATTERN.test(userId)) {
    throw new OotdValidationError("사용자 이미지 경로를 확인할 수 없습니다.");
  }
  const pattern = new RegExp(
    `^${userId}/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})/(crop|cutout)\\.png$`,
    "i",
  );
  const cropMatch = cropImagePath.match(pattern);
  if (
    !cropMatch ||
    cropMatch[1].toLowerCase() !== extractionJobId.toLowerCase() ||
    cropMatch[2] !== "crop" ||
    !new RegExp(
      `^${userId}/${cropMatch[1]}/claims/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/cutout\\.png$`,
      "i",
    ).test(imagePath)
  ) {
    throw new OotdValidationError(
      "현재 사용자의 일치하는 crop과 cutout 경로만 저장할 수 있습니다.",
    );
  }
}

export function parseSaveOotdRequest(value: unknown): SaveOotdRequest {
  if (!isRecord(value)) {
    throw new OotdValidationError("저장 요청 형식이 올바르지 않습니다.");
  }

  const requestId = normalizeRequiredString(
    value.client_request_id,
    "client_request_id",
    36,
  );
  if (!UUID_PATTERN.test(requestId)) {
    throw new OotdValidationError("client_request_id가 올바른 UUID가 아닙니다.");
  }

  const mood = value.mood ?? "happy";
  if (typeof mood !== "string" || !(MOODS as readonly string[]).includes(mood)) {
    throw new OotdValidationError("mood 값이 올바르지 않습니다.");
  }

  return {
    client_request_id: requestId,
    original_image_url: normalizeImageUrl(
      value.original_image_url,
      "original_image_url",
    ),
    card_image_url: normalizeImageUrl(value.card_image_url, "card_image_url"),
    items: normalizeOotdItems(value.items),
    style_summary:
      normalizeOptionalString(value.style_summary, "style_summary", 500) ?? "",
    hashtags: normalizeHashtags(value.hashtags),
    is_public: value.is_public === true,
    memo: normalizeOptionalString(value.memo, "memo", 2000) ?? undefined,
    date: normalizeDate(value.date),
    mood: mood as Mood,
    weatherSnapshot: normalizeWeather(value.weatherSnapshot),
  };
}

export function assertOwnedStorageImageUrl(
  value: string,
  userId: string,
  allowedBuckets: readonly string[],
  storageUrl: string,
): void {
  let imageUrl: URL;
  let storageOrigin: URL;
  try {
    imageUrl = new URL(value);
    storageOrigin = new URL(storageUrl);
  } catch {
    throw new OotdValidationError("이미지 저장소 URL 설정이 올바르지 않습니다.");
  }

  const parts = imageUrl.pathname.split("/").filter(Boolean);
  let owner = "";
  try {
    owner = decodeURIComponent(parts[5] ?? "");
  } catch {
    throw new OotdValidationError("이미지 경로가 올바르지 않습니다.");
  }

  const isOwnedStorageObject =
    !imageUrl.username &&
    !imageUrl.password &&
    imageUrl.origin === storageOrigin.origin &&
    parts[0] === "storage" &&
    parts[1] === "v1" &&
    parts[2] === "object" &&
    parts[3] === "public" &&
    allowedBuckets.includes(parts[4]) &&
    owner === userId &&
    parts.length > 6;

  if (!isOwnedStorageObject) {
    throw new OotdValidationError(
      "현재 사용자의 이미지 저장소 경로만 저장할 수 있습니다.",
    );
  }
}
