import { supabaseAdmin } from "@/lib/supabase";
import type { GenerateCardResponse } from "@/types/api";

export interface CardGenerationReservation {
  disposition: "claimed" | "completed" | "busy" | "refunded" | "stalled";
  worker_token: string | null;
  current_count: number;
  monthly_limit: number;
  card_image_url: string | null;
  plan_used: GenerateCardResponse["plan_used"] | null;
  error_code: string | null;
}

export async function reserveCardGeneration(
  userId: string,
  requestId: string,
  requestFingerprint: string,
): Promise<CardGenerationReservation> {
  const { data, error } = await supabaseAdmin
    .rpc("reserve_card_generation", {
      p_user_id: userId,
      p_request_id: requestId,
      p_request_fingerprint: requestFingerprint,
    })
    .single();
  if (error) throw new Error(error.message);
  return data as CardGenerationReservation;
}

export async function completeCardGeneration(
  userId: string,
  requestId: string,
  claimToken: string,
  result: GenerateCardResponse,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("complete_card_generation", {
    p_user_id: userId,
    p_request_id: requestId,
    p_claim_token: claimToken,
    p_card_image_url: result.card_image_url,
    p_plan_used: result.plan_used,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function refundCardGeneration(
  userId: string,
  requestId: string,
  claimToken: string,
  errorCode: string,
  errorMessage: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("refund_card_generation", {
    p_user_id: userId,
    p_request_id: requestId,
    p_claim_token: claimToken,
    p_error_code: errorCode,
    p_error_message: errorMessage,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export async function refundExpiredCardGenerations(
  batchSize = 100,
): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc(
    "refund_expired_card_generations",
    { p_batch_size: batchSize },
  );
  if (error) throw new Error(error.message);
  return typeof data === "number" ? data : 0;
}
