import { createHash } from "node:crypto";
import type { CardTypeInput, OotdItemInput } from "@/types/api";
import { normalizeOotdItems, OotdValidationError } from "./ootd-classification";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CARD_PROMPT_VERSION = "ai-card-v1";
export const CARD_GENERATION_BODY_LIMIT = 64 * 1024;

export interface CardGenerationPayload {
  original_image_url: string;
  items: OotdItemInput[];
  summary: string;
  hashtags: string[];
}

export interface ParsedCardGenerationRequest {
  request_id: unknown;
  card_type: unknown;
  ootd_data: CardGenerationPayload;
}

export class CardGenerationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CardGenerationRequestError";
  }
}

export function normalizeCardGenerationRequestId(
  value: unknown,
  createFallback: () => string,
): string {
  const requestId = value === undefined ? createFallback() : value;
  if (typeof requestId !== "string" || !UUID_PATTERN.test(requestId)) {
    throw new CardGenerationRequestError("request_id가 올바른 UUID가 아닙니다.");
  }
  return requestId.toLowerCase();
}

export function createCardGenerationFingerprint(
  payload: CardGenerationPayload,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: CARD_PROMPT_VERSION,
        card_type: "ai",
        original_image_url: payload.original_image_url,
        items: payload.items,
        summary: payload.summary,
        hashtags: payload.hashtags,
      }),
    )
    .digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw new CardGenerationRequestError(`${field}은(는) 문자열이어야 합니다.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new CardGenerationRequestError(
      `${field}은(는) 1자 이상 ${maxLength}자 이하여야 합니다.`,
    );
  }
  return normalized;
}

function normalizeHashtags(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 12) {
    throw new CardGenerationRequestError("hashtags는 최대 12개의 배열이어야 합니다.");
  }
  const unique = new Set<string>();
  for (const raw of value) {
    unique.add(normalizeString(raw, "hashtag", 40));
  }
  return [...unique];
}

export function parseCardGenerationRequest(
  value: unknown,
): ParsedCardGenerationRequest {
  if (!isRecord(value) || !isRecord(value.ootd_data)) {
    throw new CardGenerationRequestError("ootd_data 형식이 올바르지 않습니다.");
  }

  const originalImageUrl = normalizeString(
    value.ootd_data.original_image_url,
    "original_image_url",
    2048,
  );
  try {
    new URL(originalImageUrl);
  } catch {
    throw new CardGenerationRequestError(
      "original_image_url이 올바른 URL이 아닙니다.",
    );
  }

  let items: OotdItemInput[];
  try {
    items = normalizeOotdItems(value.ootd_data.items);
  } catch (error) {
    if (error instanceof OotdValidationError) {
      throw new CardGenerationRequestError(error.message);
    }
    throw error;
  }

  return {
    request_id: value.request_id,
    card_type: value.card_type as CardTypeInput | unknown,
    ootd_data: {
      original_image_url: originalImageUrl,
      items,
      summary: normalizeString(value.ootd_data.summary, "summary", 500),
      hashtags: normalizeHashtags(value.ootd_data.hashtags),
    },
  };
}

export async function readLimitedJsonBody(
  request: Request,
  maxBytes = CARD_GENERATION_BODY_LIMIT,
): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new CardGenerationRequestError("요청 본문이 너무 큽니다.");
  }
  if (!request.body) {
    throw new CardGenerationRequestError("요청 본문이 필요합니다.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new CardGenerationRequestError("요청 본문이 너무 큽니다.");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new CardGenerationRequestError("잘못된 JSON 요청입니다.");
  }
}
