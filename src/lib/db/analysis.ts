import { supabaseAdmin } from "@/lib/supabase";

interface AnalysisClaim {
  disposition: "claimed" | "busy";
  claim_token: string | null;
}

export async function claimOotdAnalysis(userId: string): Promise<AnalysisClaim> {
  const { data, error } = await supabaseAdmin
    .rpc("claim_ootd_analysis", { p_user_id: userId })
    .single();
  if (error) throw new Error(error.message);
  return data as AnalysisClaim;
}

export async function releaseOotdAnalysis(
  userId: string,
  claimToken: string,
): Promise<void> {
  const { error } = await supabaseAdmin.rpc("release_ootd_analysis", {
    p_user_id: userId,
    p_claim_token: claimToken,
  });
  if (error) console.error("[analyze] 분석 lease 해제 실패", error);
}
