import { OotdItem, Mood, WeatherSnapshot } from "./index";

export interface UploadResponse {
  url: string;
  path: string;
}

export interface AnalyzeRequest {
  image_url: string;
}

export type OotdItemInput = Omit<
  OotdItem,
  "id" | "ootd_id" | "created_at" | "image_url" | "crop_image_url"
>;

export type AnalyzedOotdItem = OotdItemInput & {
  image_url: string | null;
  crop_image_url: string | null;
  color_hex: string | null;
  extraction_id: string | null;
};

export interface AnalyzeResponse {
  items: AnalyzedOotdItem[];
  summary: string;
  hashtags: string[];
}

export type CardType = "basic" | "ai" | "style";

export interface GenerateCardRequest {
  card_type?: CardType;
  ootd_data: {
    original_image_url: string;
    items: AnalyzeResponse["items"];
    summary: string;
    hashtags: string[];
  };
}

export interface GenerateCardResponse {
  card_image_url: string;
  plan_used: "A" | "B";
}

export interface SaveOotdRequest {
  client_request_id: string;
  original_image_url: string;
  card_image_url: string;
  items: OotdItemInput[];
  style_summary: string;
  hashtags: string[];
  is_public: boolean;
  memo?: string;
  date: string;
  mood?: Mood;
  weatherSnapshot?: WeatherSnapshot | null;
}

export interface SaveOotdResponse {
  id: string;
  share_id: string | null;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}
