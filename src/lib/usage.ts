import { supabaseAdmin } from "@/lib/supabase";
import type { UsageLimitInfo } from "@/types";

const FREE_LIMIT = 5;
const PRO_LIMIT = 30;

export function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function getUserPlan(userId: string): Promise<"free" | "pro"> {
  const { data } = await supabaseAdmin
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();
  return (data?.plan as "free" | "pro") ?? "free";
}

export async function checkCardLimit(userId: string): Promise<UsageLimitInfo> {
  const [plan, usage] = await Promise.all([
    getUserPlan(userId),
    supabaseAdmin
      .from("usage_logs")
      .select("card_generation_count")
      .eq("user_id", userId)
      .eq("year_month", getMonthKey())
      .single(),
  ]);

  const current = usage.data?.card_generation_count ?? 0;
  const limit = plan === "pro" ? PRO_LIMIT : FREE_LIMIT;

  return { current, limit, allowed: current < limit, plan };
}

export async function incrementCardCount(userId: string): Promise<void> {
  const yearMonth = getMonthKey();

  const { data: existing } = await supabaseAdmin
    .from("usage_logs")
    .select("id, card_generation_count")
    .eq("user_id", userId)
    .eq("year_month", yearMonth)
    .single();

  if (existing) {
    await supabaseAdmin
      .from("usage_logs")
      .update({ card_generation_count: existing.card_generation_count + 1 })
      .eq("id", existing.id);
  } else {
    await supabaseAdmin.from("usage_logs").insert({
      user_id: userId,
      year_month: yearMonth,
      card_generation_count: 1,
    });
  }
}
