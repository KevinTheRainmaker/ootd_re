import { supabaseAdmin } from "@/lib/supabase";
import { getSignedItemImageUrl } from "@/lib/storage";
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

export async function getOotdRecord(
  id: string,
  userId: string,
): Promise<OotdRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("ootd_records")
    .select("*, items:ootd_items(*, extraction_job:item_extraction_jobs(status,error_code))")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return hydrateItemImages(data as OotdRecord, true);
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
  return hydrateItemImages(data as OotdRecord, false);
}

async function hydrateItemImages(
  record: OotdRecord,
  includeCrop: boolean,
): Promise<OotdRecord> {
  if (!record.items) return record;
  const items = await Promise.all(
    record.items.map(async (item) => {
      const itemWithJob = item as OotdItem & {
        extraction_job?:
          | { status?: OotdItem["extraction_status"]; error_code?: string | null }
          | Array<{ status?: OotdItem["extraction_status"]; error_code?: string | null }>
          | null;
      };
      const rawJob = Array.isArray(itemWithJob.extraction_job)
        ? itemWithJob.extraction_job[0]
        : itemWithJob.extraction_job;
      const { extraction_job: _extractionJob, ...safeItem } = itemWithJob;
      void _extractionJob;
      return {
        ...safeItem,
        extraction_status:
          rawJob?.status ?? (item.image_path ? "completed" : null),
        extraction_error_code: rawJob?.error_code ?? null,
        image_url: item.image_path
          ? await getSignedItemImageUrl(item.image_path)
          : null,
        crop_image_url:
          includeCrop && item.crop_image_path
            ? await getSignedItemImageUrl(item.crop_image_path)
            : null,
      };
    }),
  );
  return { ...record, items };
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
  const { data: target } = await supabaseAdmin
    .from("ootd_records")
    .select("items:ootd_items(extraction_job_id)")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  const { error } = await supabaseAdmin
    .from("ootd_records")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  const itemPaths = await releaseUnusedItemExtractions(
    (target?.items ?? [])
      .map((item) => item.extraction_job_id)
      .filter(Boolean) as string[],
  );
  if (itemPaths.length > 0) {
    const { error: storageError } = await supabaseAdmin.storage
      .from("items")
      .remove(itemPaths);
    if (storageError) {
      console.error("[delete] 아이템 이미지 정리 실패", storageError);
    }
  }
}

async function releaseUnusedItemExtractions(
  candidateIds: string[],
): Promise<string[]> {
  const uniqueIds = [...new Set(candidateIds)];
  if (uniqueIds.length === 0) return [];
  const { data: references, error: referenceError } = await supabaseAdmin
    .from("ootd_items")
    .select("extraction_job_id")
    .in("extraction_job_id", uniqueIds);
  if (referenceError) throw new Error(referenceError.message);
  const used = new Set(
    (references ?? []).map((item) => item.extraction_job_id).filter(Boolean),
  );
  const unusedIds = uniqueIds.filter((id) => !used.has(id));
  if (unusedIds.length === 0) return [];

  const { data: jobs, error: jobsError } = await supabaseAdmin
    .from("item_extraction_jobs")
    .select("extraction_id, crop_image_path, image_path")
    .in("extraction_id", unusedIds);
  if (jobsError) throw new Error(jobsError.message);
  const { error: deleteError } = await supabaseAdmin
    .from("item_extraction_jobs")
    .delete()
    .in("extraction_id", unusedIds);
  if (deleteError) throw new Error(deleteError.message);
  return (jobs ?? [])
    .flatMap((job) => [job.crop_image_path, job.image_path])
    .filter(Boolean) as string[];
}

export async function deleteAbandonedItemExtractions(): Promise<string[]> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("item_extraction_jobs")
    .select("extraction_id")
    .lt("created_at", cutoff);
  if (error) throw new Error(error.message);
  return releaseUnusedItemExtractions(
    (data ?? []).map((job) => job.extraction_id),
  );
}

/**
 * 무료 사용자의 30일 이전 OOTD 삭제 (Cron용)
 * 반환: 삭제된 레코드의 이미지 URL 목록 (Storage 삭제에 활용)
 */
export async function deleteOldFreeUserRecords(): Promise<{
  deleted: number;
  imageUrls: string[];
  itemImagePaths: string[];
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
    return { deleted: 0, imageUrls: [], itemImagePaths: [] };

  const userIds = freeUsers.map((u) => u.id);

  // 삭제 대상 레코드 조회 (이미지 URL 수집)
  const { data: targets } = await supabaseAdmin
    .from("ootd_records")
    .select(
      "id, original_image_url, card_image_url, items:ootd_items(extraction_job_id, image_path, crop_image_path)",
    )
    .in("user_id", userIds)
    .lt("date", cutoffStr);

  if (!targets || targets.length === 0) {
    return { deleted: 0, imageUrls: [], itemImagePaths: [] };
  }

  const imageUrls = targets.flatMap((record) => [
    record.original_image_url,
    record.card_image_url,
  ]).filter(Boolean) as string[];
  const extractionIds = targets.flatMap((record) =>
    (record.items ?? []).map((item) => item.extraction_job_id),
  ).filter(Boolean) as string[];

  const ids = targets.map((r) => r.id);
  const { error } = await supabaseAdmin
    .from("ootd_records")
    .delete()
    .in("id", ids);

  if (error) throw new Error(error.message);

  const releasedPaths = await releaseUnusedItemExtractions(extractionIds);
  return {
    deleted: ids.length,
    imageUrls,
    itemImagePaths: releasedPaths,
  };
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
