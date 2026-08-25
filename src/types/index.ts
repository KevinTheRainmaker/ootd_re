export type UserPlan = "free" | "pro";

export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: UserPlan;
  created_at: string;
  updated_at: string;
}

export const ITEM_CATEGORIES = [
  "top",
  "bottom",
  "outer",
  "shoes",
  "bag",
  "accessory",
  "hat",
  "glasses",
  "watch",
  "other",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface OotdItem {
  id: string;
  ootd_id: string;
  category: ItemCategory;
  color: string | null;
  style_description: string | null;
  brand: string | null;
  product_name: string | null;
  order_idx: number;
  created_at: string;
}

export const MOODS = ["passion", "happy", "calm", "cozy", "creative"] as const;

export type Mood = (typeof MOODS)[number];

export interface WeatherSnapshot {
  temp: number;
  humidity: number;
  condition: string;
  description: string;
}

export interface OotdRecord {
  id: string;
  user_id: string;
  client_request_id?: string | null;
  request_fingerprint?: string | null;
  date: string;
  original_image_url: string;
  card_image_url: string | null;
  style_summary: string | null;
  hashtags: string[];
  is_public: boolean;
  share_id: string | null;
  memo: string | null;
  plan_used: "A" | "B" | null;
  mood: Mood | null;
  weather_snapshot: WeatherSnapshot | null;
  created_at: string;
  updated_at: string;
  items?: OotdItem[];
}

export interface UsageLog {
  id: string;
  user_id: string;
  year_month: string;
  card_generation_count: number;
  created_at: string;
  updated_at: string;
}

export interface UsageLimitInfo {
  current: number;
  limit: number;
  allowed: boolean;
  plan: UserPlan;
}
