import { OotdItem, Mood, WeatherSnapshot } from "./index";

export interface UploadResponse {
  url: string;
  path: string;
}

export interface AnalyzeRequest {
  image_url: string;
}

export interface AnalyzeResponse {
  items: Omit<OotdItem, "id" | "ootd_id" | "created_at">[];
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
  original_image_url: string;
  card_image_url: string;
  items: AnalyzeResponse["items"];
  style_summary: string;
  hashtags: string[];
  is_public: boolean;
  memo?: string;
  date?: string;
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
