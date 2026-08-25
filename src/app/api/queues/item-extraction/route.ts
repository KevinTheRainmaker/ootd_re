import { handleCallback } from "@vercel/queue";
import {
  ItemExtractionBusyError,
  processItemExtraction,
} from "@/lib/ai/item-extraction-worker";
import { assertOwnedItemImagePath } from "@/lib/ootd-classification";

export const maxDuration = 300;

interface ItemExtractionMessage {
  userId: string;
  extractionId: string;
  cropImagePath: string;
}

function parseMessage(value: unknown): ItemExtractionMessage {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("invalid_queue_message");
  }
  const raw = value as Record<string, unknown>;
  if (
    typeof raw.userId !== "string" ||
    typeof raw.extractionId !== "string" ||
    typeof raw.cropImagePath !== "string"
  ) {
    throw new Error("invalid_queue_message");
  }
  try {
    assertOwnedItemImagePath(
      raw.cropImagePath,
      raw.userId,
      raw.extractionId,
      "crop",
    );
  } catch {
    throw new Error("invalid_queue_message");
  }
  return {
    userId: raw.userId,
    extractionId: raw.extractionId,
    cropImagePath: raw.cropImagePath,
  };
}

export const POST = handleCallback(
  async (message) => {
    const item = parseMessage(message);
    await processItemExtraction(
      item.userId,
      item.extractionId,
      item.cropImagePath,
    );
  },
  {
    visibilityTimeoutSeconds: 300,
    retry: (error, metadata) => {
      if (error instanceof ItemExtractionBusyError) {
        return { afterSeconds: 30 };
      }
      if (error instanceof Error && error.message === "invalid_queue_message") {
        return { acknowledge: true };
      }
      if (metadata.deliveryCount >= 6) {
        return { acknowledge: true };
      }
      return { afterSeconds: Math.min(300, 15 * 2 ** metadata.deliveryCount) };
    },
  },
);
