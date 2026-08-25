import { supabaseAdmin } from "@/lib/supabase";
import type { OotdRecord, OotdItem } from "@/types";

type CreateOotdWithItemsInput = Omit<
  OotdRecord,
  | "id"
  | "created_at"
  | "updated_at"
  | "items"
  | "client_request_id"
  | "request_fingerprint"
> & {
  client_request_id: string;
  request_fingerprint: string;
  items: Omit<OotdItem, "id" | "ootd_id" | "created_at">[];
};

export async function createOotdWithItems(
  data: CreateOotdWithItemsInput,
): Promise<OotdRecord> {
  const { items, ...record } = data;
  const { data: saved, error } = await supabaseAdmin
    .rpc("create_ootd_with_items", {
      p_user_id: record.user_id,
      p_client_request_id: data.client_request_id,
      p_request_fingerprint: data.request_fingerprint,
      p_date: record.date,
      p_original_image_url: record.original_image_url,
      p_card_image_url: record.card_image_url,
      p_style_summary: record.style_summary,
      p_hashtags: record.hashtags,
      p_is_public: record.is_public,
      p_share_id: record.share_id,
      p_memo: record.memo,
      p_plan_used: record.plan_used,
      p_mood: record.mood,
      p_weather_snapshot: record.weather_snapshot,
      p_items: items,
    })
    .single();

  if (error) throw new Error(error.message);
  return saved as OotdRecord;
}

export async function createOotdRecord(
  data: Omit<OotdRecord, "id" | "created_at" | "updated_at" | "items">,
): Promise<OotdRecord> {
  const { data: record, error } = await supabaseAdmin
    .from("ootd_records")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return record;
}

export async function getOotdRecord(id: string): Promise<OotdRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("ootd_records")
    .select("*, items:ootd_items(*)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

export async function getOotdByShareId(
  shareId: string,
): Promise<OotdRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("ootd_records")
    .select("*, items:ootd_items(*)")
    .eq("share_id", shareId)
    .eq("is_public", true)
    .single();

  if (error) return null;
  return data;
}

export async function getOotdsByUserAndMonth(
  userId: string,
  year: number,
  month: number,
): Promise<OotdRecord[]> {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabaseAdmin
    .from("ootd_records")
    .select("*")
    .eq("user_id", userId)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function updateOotdRecord(
  id: string,
  userId: string,
  data: Partial<
    Pick<OotdRecord, "is_public" | "memo" | "card_image_url" | "share_id">
  >,
): Promise<OotdRecord> {
  const { data: record, error } = await supabaseAdmin
    .from("ootd_records")
    .update(data)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return record;
}

export async function deleteOotdRecord(
  id: string,
  userId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("ootd_records")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

/**
 * 무료 사용자의 30일 이전 OOTD 삭제 (Cron용)
 * 반환: 삭제된 레코드의 이미지 URL 목록 (Storage 삭제에 활용)
 */
export async function deleteOldFreeUserRecords(): Promise<{
  deleted: number;
  imageUrls: string[];
}> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // 무료 사용자만 대상 (plan = 'free')
  const { data: freeUsers } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("plan", "free");

  if (!freeUsers || freeUsers.length === 0)
    return { deleted: 0, imageUrls: [] };

  const userIds = freeUsers.map((u) => u.id);

  // 삭제 대상 레코드 조회 (이미지 URL 수집)
  const { data: targets } = await supabaseAdmin
    .from("ootd_records")
    .select("id, original_image_url, card_image_url")
    .in("user_id", userIds)
    .lt("date", cutoffStr);

  if (!targets || targets.length === 0) return { deleted: 0, imageUrls: [] };

  const imageUrls = targets.flatMap(
    (r) => [r.original_image_url, r.card_image_url].filter(Boolean) as string[],
  );

  const ids = targets.map((r) => r.id);
  const { error } = await supabaseAdmin
    .from("ootd_records")
    .delete()
    .in("id", ids);

  if (error) throw new Error(error.message);

  return { deleted: ids.length, imageUrls };
}

export async function getAllOotdsByUser(
  userId: string,
  limit = 60,
): Promise<OotdRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("ootd_records")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createOotdItems(
  items: Omit<OotdItem, "id" | "created_at">[],
): Promise<OotdItem[]> {
  const { data, error } = await supabaseAdmin
    .from("ootd_items")
    .insert(items)
    .select();

  if (error) throw new Error(error.message);
  return data;
}
