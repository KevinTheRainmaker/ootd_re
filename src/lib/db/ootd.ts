import { supabaseAdmin } from "@/lib/supabase";
import type { OotdRecord, OotdItem } from "@/types";

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
