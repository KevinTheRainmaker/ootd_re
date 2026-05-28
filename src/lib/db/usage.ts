import { supabaseAdmin } from "@/lib/supabase";
import type { UsageLog } from "@/types";

export function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getUsageLog(
  userId: string,
  yearMonth?: string,
): Promise<UsageLog | null> {
  const month = yearMonth ?? getMonthKey();
  const { data, error } = await supabaseAdmin
    .from("usage_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("year_month", month)
    .single();

  if (error) return null;
  return data;
}

export async function incrementCardCount(userId: string): Promise<UsageLog> {
  const yearMonth = getMonthKey();

  const { data, error } = await supabaseAdmin
    .from("usage_logs")
    .upsert(
      { user_id: userId, year_month: yearMonth, card_generation_count: 1 },
      {
        onConflict: "user_id,year_month",
        ignoreDuplicates: false,
      },
    )
    .select()
    .single();

  if (!error && data) return data;

  // upsert가 기존 row를 업데이트하지 않는 경우 직접 increment
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("usage_logs")
    .update({
      card_generation_count: supabaseAdmin.rpc("increment", {
        row_count: 1,
      }) as unknown as number,
    })
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .select()
    .single();

  if (updateError) throw new Error(updateError.message);
  return updated;
}
